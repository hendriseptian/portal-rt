from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from psycopg2.extras import RealDictCursor
import os
import re
import psycopg2
import jwt
import bcrypt

app = FastAPI(title="Portal RT API", description="Backend API Portal RT", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.isdir("admin"):
    app.mount("/admin", StaticFiles(directory="admin", html=True), name="admin")

# Public assets are served with explicit FastAPI routes for Vercel compatibility.
# This avoids relying on StaticFiles mounting for the /public directory.

security = HTTPBearer()
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 480


def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise Exception("DATABASE_URL belum dikonfigurasi")
    return psycopg2.connect(url)


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s-]+", "-", value).strip("-")
    return value or "item"


def unique_slug(cursor, table: str, base: str, current_id=None) -> str:
    allowed = {"pengumuman", "kegiatan", "galeri"}
    if table not in allowed:
        raise ValueError("Tabel slug tidak diizinkan")
    base = slugify(base)
    candidate = base
    n = 2
    while True:
        if current_id:
            cursor.execute(f"SELECT 1 FROM {table} WHERE slug=%s AND id<>%s LIMIT 1", (candidate, current_id))
        else:
            cursor.execute(f"SELECT 1 FROM {table} WHERE slug=%s LIMIT 1", (candidate,))
        if not cursor.fetchone():
            return candidate
        candidate = f"{base}-{n}"
        n += 1


class LoginRequest(BaseModel):
    username: str
    password: str


class PengurusData(BaseModel):
    nama: str
    jabatan: str
    foto_file_id: Optional[str] = None
    deskripsi: Optional[str] = None
    urutan: int = 0
    periode_mulai: Optional[str] = None
    periode_selesai: Optional[str] = None
    is_active: bool = True


class PengumumanData(BaseModel):
    judul: str
    slug: Optional[str] = None
    isi: str
    kategori: str = "umum"
    prioritas: str = "normal"
    tanggal_mulai: Optional[str] = None
    tanggal_selesai: Optional[str] = None
    status: str = "draft"


class AgendaData(BaseModel):
    judul: str
    deskripsi: Optional[str] = None
    tanggal: str
    waktu_mulai: Optional[str] = None
    waktu_selesai: Optional[str] = None
    lokasi: Optional[str] = None
    kategori: str = "RT"
    status: str = "published"


class KegiatanData(BaseModel):
    judul: str
    slug: Optional[str] = None
    kategori: str = "LAINNYA"
    deskripsi: Optional[str] = None
    tanggal: Optional[str] = None
    lokasi: Optional[str] = None
    cover_file_id: Optional[str] = None
    status: str = "draft"


class GaleriData(BaseModel):
    nama_album: str
    slug: Optional[str] = None
    deskripsi: Optional[str] = None
    tanggal: Optional[str] = None
    kategori: str = "LAINNYA"
    cover_file_id: Optional[str] = None
    kegiatan_id: Optional[str] = None
    status: str = "published"


class FotoData(BaseModel):
    galeri_id: str
    google_drive_file_id: str
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    urutan: int = 0


class VideoData(BaseModel):
    judul: str
    deskripsi: Optional[str] = None
    youtube_id: str
    thumbnail_url: Optional[str] = None
    kategori: str = "LAINNYA"
    tanggal: Optional[str] = None
    kegiatan_id: Optional[str] = None
    status: str = "published"
    urutan: int = 0


class DaruratData(BaseModel):
    judul: str
    deskripsi: Optional[str] = None
    kategori: str = "LAINNYA"
    kontak: Optional[str] = None
    nomor: Optional[str] = None
    url: Optional[str] = None
    urutan: int = 0
    is_active: bool = True


class SettingData(BaseModel):
    value: Optional[str] = None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(500, "JWT_SECRET belum dikonfigurasi")
    try:
        return jwt.decode(credentials.credentials, secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token sudah expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token tidak valid")


def db_query(sql, params=(), fetch="all", commit=False):
    conn = cur = None
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        result = cur.fetchall() if fetch == "all" else cur.fetchone()
        if commit:
            conn.commit()
        return result
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.get("/api")
def api_root():
    return {"status": "ok", "message": "Portal RT API is running", "version": "2.0.0"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/db-test")
def database_test():
    try:
        result = db_query("SELECT current_database() AS database", fetch="one")
        return {"status": "connected", "database": result["database"]}
    except Exception as e:
        return JSONResponse(500, {"status": "error", "message": str(e)})


@app.post("/api/auth/login")
def login(request: LoginRequest):
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(500, "JWT_SECRET belum dikonfigurasi")
    try:
        user = db_query("""
            SELECT id, username, email, password_hash, name, role, is_active
            FROM users WHERE username=%s LIMIT 1
        """, (request.username,), "one")
        if not user:
            raise HTTPException(401, "Username atau password salah")
        if not user["is_active"]:
            raise HTTPException(403, "Akun tidak aktif")
        if not bcrypt.checkpw(request.password.encode(), user["password_hash"].encode()):
            raise HTTPException(401, "Username atau password salah")
        now = datetime.now(timezone.utc)
        token = jwt.encode({
            "sub": str(user["id"]),
            "username": user["username"],
            "name": user["name"],
            "role": user["role"],
            "iat": now,
            "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES)
        }, secret, algorithm=JWT_ALGORITHM)
        return {
            "status": "success",
            "message": "Login berhasil",
            "token": token,
            "user": {
                "id": str(user["id"]),
                "username": user["username"],
                "name": user["name"],
                "role": user["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(500, {"status": "error", "message": str(e)})


@app.get("/api/auth/me")
def auth_me(current_user=Depends(get_current_user)):
    return {"status": "success", "user": current_user}


# -------------------- PENGURUS --------------------

@app.get("/api/pengurus")
def get_pengurus():
    try:
        rows = db_query("""
            SELECT id,nama,jabatan,foto_file_id,deskripsi,urutan,periode_mulai,
                   periode_selesai,is_active,created_at,updated_at
            FROM pengurus
            ORDER BY urutan ASC,nama ASC
        """)
        return {"status": "success", "count": len(rows), "data": rows}
    except Exception as e:
        return JSONResponse(500, {"status":"error","message":str(e)})


@app.post("/api/pengurus")
def create_pengurus(data: PengurusData, current_user=Depends(get_current_user)):
    try:
        row = db_query("""
            INSERT INTO pengurus
            (nama,jabatan,foto_file_id,deskripsi,urutan,periode_mulai,periode_selesai,is_active)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
        """, (data.nama,data.jabatan,data.foto_file_id,data.deskripsi,data.urutan,
              data.periode_mulai or None,data.periode_selesai or None,data.is_active), "one", True)
        return {"status":"success","message":"Pengurus berhasil ditambahkan","data":row}
    except Exception as e:
        return JSONResponse(500, {"status":"error","message":str(e)})


@app.put("/api/pengurus/{item_id}")
def update_pengurus(item_id: str, data: PengurusData, current_user=Depends(get_current_user)):
    try:
        row = db_query("""
            UPDATE pengurus SET nama=%s,jabatan=%s,foto_file_id=%s,deskripsi=%s,urutan=%s,
            periode_mulai=%s,periode_selesai=%s,is_active=%s,updated_at=NOW()
            WHERE id=%s RETURNING *
        """, (data.nama,data.jabatan,data.foto_file_id,data.deskripsi,data.urutan,
              data.periode_mulai or None,data.periode_selesai or None,data.is_active,item_id), "one", True)
        if not row: raise HTTPException(404,"Pengurus tidak ditemukan")
        return {"status":"success","message":"Pengurus berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.delete("/api/pengurus/{item_id}")
def delete_pengurus(item_id: str, current_user=Depends(get_current_user)):
    try:
        row = db_query("DELETE FROM pengurus WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Pengurus tidak ditemukan")
        return {"status":"success","message":"Pengurus berhasil dihapus","id":str(row["id"])}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- PENGUMUMAN --------------------

@app.get("/api/pengumuman")
def get_pengumuman():
    try:
        rows = db_query("""
            SELECT id,judul,slug,isi,kategori,prioritas,tanggal_mulai,tanggal_selesai,
                   status,author_id,created_at,updated_at
            FROM pengumuman
            ORDER BY CASE prioritas WHEN 'darurat' THEN 1 WHEN 'penting' THEN 2 ELSE 3 END,
                     tanggal_mulai DESC NULLS LAST,created_at DESC
        """)
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.post("/api/pengumuman")
def create_pengumuman(data: PengumumanData, current_user=Depends(get_current_user)):
    if data.prioritas not in ("normal","penting","darurat"): raise HTTPException(400,"Prioritas tidak valid")
    if data.status not in ("draft","published","archived"): raise HTTPException(400,"Status tidak valid")
    conn=cur=None
    try:
        conn=get_connection(); cur=conn.cursor(cursor_factory=RealDictCursor)
        slug=unique_slug(cur,"pengumuman",data.slug or data.judul)
        cur.execute("""INSERT INTO pengumuman
            (judul,slug,isi,kategori,prioritas,tanggal_mulai,tanggal_selesai,status,author_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.judul,slug,data.isi,data.kategori,data.prioritas,data.tanggal_mulai or None,
             data.tanggal_selesai or None,data.status,current_user.get("sub")))
        row=cur.fetchone(); conn.commit()
        return {"status":"success","message":"Pengumuman berhasil ditambahkan","data":row}
    except Exception as e:
        if conn: conn.rollback()
        return JSONResponse(500,{"status":"error","message":str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.put("/api/pengumuman/{item_id}")
def update_pengumuman(item_id: str,data: PengumumanData,current_user=Depends(get_current_user)):
    conn=cur=None
    try:
        conn=get_connection(); cur=conn.cursor(cursor_factory=RealDictCursor)
        slug=unique_slug(cur,"pengumuman",data.slug or data.judul,item_id)
        cur.execute("""UPDATE pengumuman SET judul=%s,slug=%s,isi=%s,kategori=%s,prioritas=%s,
            tanggal_mulai=%s,tanggal_selesai=%s,status=%s,updated_at=NOW()
            WHERE id=%s RETURNING *""",
            (data.judul,slug,data.isi,data.kategori,data.prioritas,data.tanggal_mulai or None,
             data.tanggal_selesai or None,data.status,item_id))
        row=cur.fetchone()
        if not row: raise HTTPException(404,"Pengumuman tidak ditemukan")
        conn.commit(); return {"status":"success","message":"Pengumuman berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e:
        if conn: conn.rollback()
        return JSONResponse(500,{"status":"error","message":str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.delete("/api/pengumuman/{item_id}")
def delete_pengumuman(item_id: str,current_user=Depends(get_current_user)):
    try:
        row=db_query("DELETE FROM pengumuman WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Pengumuman tidak ditemukan")
        return {"status":"success","message":"Pengumuman berhasil dihapus"}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- AGENDA --------------------

@app.get("/api/agenda")
def get_agenda():
    try:
        rows=db_query("""SELECT id,judul,deskripsi,tanggal,waktu_mulai,waktu_selesai,lokasi,kategori,
            status,created_by,created_at,updated_at FROM agenda
            ORDER BY tanggal ASC,waktu_mulai ASC NULLS LAST,created_at DESC""")
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.post("/api/agenda")
def create_agenda(data: AgendaData,current_user=Depends(get_current_user)):
    try:
        if data.status not in ("draft","published","cancelled","completed"): raise HTTPException(400,"Status agenda tidak valid")
        row=db_query("""INSERT INTO agenda
            (judul,deskripsi,tanggal,waktu_mulai,waktu_selesai,lokasi,kategori,status,created_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.judul,data.deskripsi,data.tanggal,data.waktu_mulai or None,data.waktu_selesai or None,
             data.lokasi,data.kategori,data.status,current_user.get("sub")),"one",True)
        return {"status":"success","message":"Agenda berhasil ditambahkan","data":row}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.put("/api/agenda/{item_id}")
def update_agenda(item_id: str,data: AgendaData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""UPDATE agenda SET judul=%s,deskripsi=%s,tanggal=%s,waktu_mulai=%s,waktu_selesai=%s,
            lokasi=%s,kategori=%s,status=%s,updated_at=NOW() WHERE id=%s RETURNING *""",
            (data.judul,data.deskripsi,data.tanggal,data.waktu_mulai or None,data.waktu_selesai or None,
             data.lokasi,data.kategori,data.status,item_id),"one",True)
        if not row: raise HTTPException(404,"Agenda tidak ditemukan")
        return {"status":"success","message":"Agenda berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.delete("/api/agenda/{item_id}")
def delete_agenda(item_id: str,current_user=Depends(get_current_user)):
    try:
        row=db_query("DELETE FROM agenda WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Agenda tidak ditemukan")
        return {"status":"success","message":"Agenda berhasil dihapus"}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- KEGIATAN --------------------

@app.get("/api/kegiatan")
def get_kegiatan():
    try:
        rows=db_query("""SELECT id,judul,slug,kategori,deskripsi,tanggal,lokasi,cover_file_id,status,
            author_id,created_at,updated_at FROM kegiatan ORDER BY tanggal DESC NULLS LAST,created_at DESC""")
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.post("/api/kegiatan")
def create_kegiatan(data: KegiatanData,current_user=Depends(get_current_user)):
    conn=cur=None
    try:
        if data.kategori not in ("PKK","REMAJA","17_AGUSTUS","LAINNYA"): raise HTTPException(400,"Kategori kegiatan tidak valid")
        conn=get_connection(); cur=conn.cursor(cursor_factory=RealDictCursor)
        slug=unique_slug(cur,"kegiatan",data.slug or data.judul)
        cur.execute("""INSERT INTO kegiatan
            (judul,slug,kategori,deskripsi,tanggal,lokasi,cover_file_id,status,author_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.judul,slug,data.kategori,data.deskripsi,data.tanggal or None,data.lokasi,
             data.cover_file_id,data.status,current_user.get("sub")))
        row=cur.fetchone(); conn.commit()
        return {"status":"success","message":"Kegiatan berhasil ditambahkan","data":row}
    except HTTPException: raise
    except Exception as e:
        if conn: conn.rollback()
        return JSONResponse(500,{"status":"error","message":str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.put("/api/kegiatan/{item_id}")
def update_kegiatan(item_id: str,data: KegiatanData,current_user=Depends(get_current_user)):
    conn=cur=None
    try:
        if data.kategori not in ("PKK","REMAJA","17_AGUSTUS","LAINNYA"): raise HTTPException(400,"Kategori kegiatan tidak valid")
        conn=get_connection(); cur=conn.cursor(cursor_factory=RealDictCursor)
        slug=unique_slug(cur,"kegiatan",data.slug or data.judul,item_id)
        cur.execute("""UPDATE kegiatan SET judul=%s,slug=%s,kategori=%s,deskripsi=%s,tanggal=%s,lokasi=%s,
            cover_file_id=%s,status=%s,updated_at=NOW() WHERE id=%s RETURNING *""",
            (data.judul,slug,data.kategori,data.deskripsi,data.tanggal or None,data.lokasi,
             data.cover_file_id,data.status,item_id))
        row=cur.fetchone()
        if not row: raise HTTPException(404,"Kegiatan tidak ditemukan")
        conn.commit(); return {"status":"success","message":"Kegiatan berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e:
        if conn: conn.rollback()
        return JSONResponse(500,{"status":"error","message":str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.delete("/api/kegiatan/{item_id}")
def delete_kegiatan(item_id: str,current_user=Depends(get_current_user)):
    try:
        row=db_query("DELETE FROM kegiatan WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Kegiatan tidak ditemukan")
        return {"status":"success","message":"Kegiatan berhasil dihapus"}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- GALERI --------------------

@app.get("/api/galeri")
def get_galeri():
    try:
        rows=db_query("""SELECT g.id,g.nama_album,g.slug,g.deskripsi,g.tanggal,g.kategori,g.cover_file_id,
            g.kegiatan_id,g.status,g.created_by,g.created_at,g.updated_at,
            (SELECT COUNT(*) FROM foto f WHERE f.galeri_id=g.id) AS jumlah_foto
            FROM galeri g ORDER BY g.tanggal DESC NULLS LAST,g.created_at DESC""")
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.post("/api/galeri")
def create_galeri(data: GaleriData,current_user=Depends(get_current_user)):
    conn=cur=None
    try:
        conn=get_connection(); cur=conn.cursor(cursor_factory=RealDictCursor)
        slug=unique_slug(cur,"galeri",data.slug or data.nama_album)
        cur.execute("""INSERT INTO galeri
            (nama_album,slug,deskripsi,tanggal,kategori,cover_file_id,kegiatan_id,status,created_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.nama_album,slug,data.deskripsi,data.tanggal or None,data.kategori,data.cover_file_id,
             data.kegiatan_id or None,data.status,current_user.get("sub")))
        row=cur.fetchone(); conn.commit()
        return {"status":"success","message":"Album berhasil ditambahkan","data":row}
    except Exception as e:
        if conn: conn.rollback()
        return JSONResponse(500,{"status":"error","message":str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.put("/api/galeri/{item_id}")
def update_galeri(item_id: str,data: GaleriData,current_user=Depends(get_current_user)):
    conn=cur=None
    try:
        conn=get_connection(); cur=conn.cursor(cursor_factory=RealDictCursor)
        slug=unique_slug(cur,"galeri",data.slug or data.nama_album,item_id)
        cur.execute("""UPDATE galeri SET nama_album=%s,slug=%s,deskripsi=%s,tanggal=%s,kategori=%s,
            cover_file_id=%s,kegiatan_id=%s,status=%s,updated_at=NOW() WHERE id=%s RETURNING *""",
            (data.nama_album,slug,data.deskripsi,data.tanggal or None,data.kategori,data.cover_file_id,
             data.kegiatan_id or None,data.status,item_id))
        row=cur.fetchone()
        if not row: raise HTTPException(404,"Album tidak ditemukan")
        conn.commit(); return {"status":"success","message":"Album berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e:
        if conn: conn.rollback()
        return JSONResponse(500,{"status":"error","message":str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.delete("/api/galeri/{item_id}")
def delete_galeri(item_id: str,current_user=Depends(get_current_user)):
    try:
        row=db_query("DELETE FROM galeri WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Album tidak ditemukan")
        return {"status":"success","message":"Album berhasil dihapus"}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- FOTO --------------------

@app.get("/api/foto")
def get_foto(galeri_id: Optional[str]=None):
    try:
        if galeri_id:
            rows=db_query("""SELECT id,galeri_id,google_drive_file_id,file_name,mime_type,thumbnail_url,
                caption,urutan,created_at FROM foto WHERE galeri_id=%s ORDER BY urutan ASC,created_at ASC""",(galeri_id,))
        else:
            rows=db_query("""SELECT id,galeri_id,google_drive_file_id,file_name,mime_type,thumbnail_url,
                caption,urutan,created_at FROM foto ORDER BY created_at DESC""")
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.post("/api/foto")
def create_foto(data: FotoData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""INSERT INTO foto
            (galeri_id,google_drive_file_id,file_name,mime_type,thumbnail_url,caption,urutan)
            VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.galeri_id,data.google_drive_file_id,data.file_name,data.mime_type,data.thumbnail_url,
             data.caption,data.urutan),"one",True)
        return {"status":"success","message":"Foto berhasil ditambahkan","data":row}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.put("/api/foto/{item_id}")
def update_foto(item_id: str,data: FotoData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""UPDATE foto SET galeri_id=%s,google_drive_file_id=%s,file_name=%s,mime_type=%s,
            thumbnail_url=%s,caption=%s,urutan=%s WHERE id=%s RETURNING *""",
            (data.galeri_id,data.google_drive_file_id,data.file_name,data.mime_type,data.thumbnail_url,
             data.caption,data.urutan,item_id),"one",True)
        if not row: raise HTTPException(404,"Foto tidak ditemukan")
        return {"status":"success","message":"Foto berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.delete("/api/foto/{item_id}")
def delete_foto(item_id: str,current_user=Depends(get_current_user)):
    try:
        row=db_query("DELETE FROM foto WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Foto tidak ditemukan")
        return {"status":"success","message":"Foto berhasil dihapus"}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- VIDEO --------------------

@app.get("/api/video")
def get_video():
    try:
        rows=db_query("""SELECT id,judul,deskripsi,youtube_id,thumbnail_url,kategori,tanggal,kegiatan_id,
            status,urutan,created_by,created_at,updated_at FROM video
            ORDER BY urutan ASC,tanggal DESC NULLS LAST,created_at DESC""")
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.post("/api/video")
def create_video(data: VideoData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""INSERT INTO video
            (judul,deskripsi,youtube_id,thumbnail_url,kategori,tanggal,kegiatan_id,status,urutan,created_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.judul,data.deskripsi,data.youtube_id,data.thumbnail_url,data.kategori,data.tanggal or None,
             data.kegiatan_id or None,data.status,data.urutan,current_user.get("sub")),"one",True)
        return {"status":"success","message":"Video berhasil ditambahkan","data":row}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.put("/api/video/{item_id}")
def update_video(item_id: str,data: VideoData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""UPDATE video SET judul=%s,deskripsi=%s,youtube_id=%s,thumbnail_url=%s,kategori=%s,
            tanggal=%s,kegiatan_id=%s,status=%s,urutan=%s,updated_at=NOW() WHERE id=%s RETURNING *""",
            (data.judul,data.deskripsi,data.youtube_id,data.thumbnail_url,data.kategori,data.tanggal or None,
             data.kegiatan_id or None,data.status,data.urutan,item_id),"one",True)
        if not row: raise HTTPException(404,"Video tidak ditemukan")
        return {"status":"success","message":"Video berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.delete("/api/video/{item_id}")
def delete_video(item_id: str,current_user=Depends(get_current_user)):
    try:
        row=db_query("DELETE FROM video WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Video tidak ditemukan")
        return {"status":"success","message":"Video berhasil dihapus"}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- INFORMASI DARURAT --------------------

@app.get("/api/informasi-darurat")
def get_darurat():
    try:
        rows=db_query("""SELECT id,judul,deskripsi,kategori,kontak,nomor,url,urutan,is_active,
            created_at,updated_at FROM informasi_darurat ORDER BY urutan ASC,judul ASC""")
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.post("/api/informasi-darurat")
def create_darurat(data: DaruratData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""INSERT INTO informasi_darurat
            (judul,deskripsi,kategori,kontak,nomor,url,urutan,is_active)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.judul,data.deskripsi,data.kategori,data.kontak,data.nomor,data.url,data.urutan,data.is_active),
            "one",True)
        return {"status":"success","message":"Informasi darurat berhasil ditambahkan","data":row}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.put("/api/informasi-darurat/{item_id}")
def update_darurat(item_id: str,data: DaruratData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""UPDATE informasi_darurat SET judul=%s,deskripsi=%s,kategori=%s,kontak=%s,nomor=%s,
            url=%s,urutan=%s,is_active=%s,updated_at=NOW() WHERE id=%s RETURNING *""",
            (data.judul,data.deskripsi,data.kategori,data.kontak,data.nomor,data.url,data.urutan,data.is_active,item_id),
            "one",True)
        if not row: raise HTTPException(404,"Informasi darurat tidak ditemukan")
        return {"status":"success","message":"Informasi darurat berhasil diperbarui","data":row}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.delete("/api/informasi-darurat/{item_id}")
def delete_darurat(item_id: str,current_user=Depends(get_current_user)):
    try:
        row=db_query("DELETE FROM informasi_darurat WHERE id=%s RETURNING id",(item_id,),"one",True)
        if not row: raise HTTPException(404,"Informasi darurat tidak ditemukan")
        return {"status":"success","message":"Informasi darurat berhasil dihapus"}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


# -------------------- SETTINGS --------------------

@app.get("/api/settings")
def get_settings():
    try:
        rows=db_query("SELECT id,key,value,description,updated_at FROM settings ORDER BY key")
        return {"status":"success","count":len(rows),"data":rows}
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})


@app.put("/api/settings/{key}")
def update_setting(key: str,data: SettingData,current_user=Depends(get_current_user)):
    try:
        row=db_query("""UPDATE settings SET value=%s,updated_at=NOW()
            WHERE key=%s RETURNING id,key,value,description,updated_at""",
            (data.value or "",key),"one",True)
        if not row: raise HTTPException(404,"Setting tidak ditemukan")
        return {"status":"success","message":"Pengaturan berhasil disimpan","data":row}
    except HTTPException: raise
    except Exception as e: return JSONResponse(500,{"status":"error","message":str(e)})



# -------------------- PUBLIC SITE --------------------

@app.get("/public/index.html", include_in_schema=False)
def public_index_file():
    path = os.path.join("public", "index.html")
    if os.path.isfile(path):
        return FileResponse(path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Public index not found")

@app.get("/public/style.css", include_in_schema=False)
def public_style_file():
    path = os.path.join("public", "style.css")
    if os.path.isfile(path):
        return FileResponse(path, media_type="text/css")
    raise HTTPException(status_code=404, detail="Public CSS not found")

@app.get("/public/script.js", include_in_schema=False)
def public_script_file():
    path = os.path.join("public", "script.js")
    if os.path.isfile(path):
        return FileResponse(path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="Public JavaScript not found")

@app.get("/", include_in_schema=False)
def public_home():
    public_index = os.path.join("public", "index.html")
    if os.path.isfile(public_index):
        return FileResponse(public_index, media_type="text/html")
    return {"status": "success", "message": "Portal RT API aktif"}

@app.get("/api/public/settings")
def public_settings():
    rows = db_query("""
        SELECT key,value
        FROM settings
        WHERE key IN (
            'site_name','site_description','rt_name','rw_name',
            'desa_name','kecamatan_name','kabupaten_name',
            'provinsi_name','slogan','logo_file_id'
        )
        ORDER BY key
    """)
    return {
        "status": "success",
        "count": len(rows),
        "data": rows
    }

@app.get("/api/public/pengurus")
def public_pengurus():
    rows = db_query("""
        SELECT id,nama,jabatan,foto_file_id,deskripsi,urutan,
               periode_mulai,periode_selesai
        FROM pengurus
        WHERE is_active=TRUE
        ORDER BY urutan ASC,nama ASC
    """)
    return {
        "status": "success",
        "count": len(rows),
        "data": rows
    }

@app.get("/api/public/galeri/{galeri_id}/foto")
def public_galeri_foto(galeri_id: str):
    rows = db_query("""
        SELECT id,galeri_id,google_drive_file_id,file_name,
               mime_type,thumbnail_url,caption,urutan
        FROM foto
        WHERE galeri_id=%s
        ORDER BY urutan ASC,created_at ASC
    """, (galeri_id,))
    return {
        "status": "success",
        "count": len(rows),
        "data": rows
    }

# -------------------- PUBLIC CONTENT HELPERS --------------------

@app.get("/api/public/pengumuman")
def public_pengumuman():
    rows=db_query("""SELECT id,judul,slug,isi,kategori,prioritas,tanggal_mulai,tanggal_selesai,created_at
        FROM pengumuman WHERE status='published'
        ORDER BY CASE prioritas WHEN 'darurat' THEN 1 WHEN 'penting' THEN 2 ELSE 3 END,
        tanggal_mulai DESC NULLS LAST,created_at DESC""")
    return {"status":"success","count":len(rows),"data":rows}


@app.get("/api/public/agenda")
def public_agenda():
    rows=db_query("""SELECT id,judul,deskripsi,tanggal,waktu_mulai,waktu_selesai,lokasi,kategori,status
        FROM agenda WHERE status='published' ORDER BY tanggal ASC,waktu_mulai ASC NULLS LAST""")
    return {"status":"success","count":len(rows),"data":rows}


@app.get("/api/public/kegiatan")
def public_kegiatan():
    rows=db_query("""SELECT id,judul,slug,kategori,deskripsi,tanggal,lokasi,cover_file_id
        FROM kegiatan WHERE status='published' ORDER BY tanggal DESC NULLS LAST,created_at DESC""")
    return {"status":"success","count":len(rows),"data":rows}


@app.get("/api/public/galeri")
def public_galeri():
    rows=db_query("""SELECT id,nama_album,slug,deskripsi,tanggal,kategori,cover_file_id,kegiatan_id
        FROM galeri WHERE status='published' ORDER BY tanggal DESC NULLS LAST,created_at DESC""")
    return {"status":"success","count":len(rows),"data":rows}


@app.get("/api/public/video")
def public_video():
    rows=db_query("""SELECT id,judul,deskripsi,youtube_id,thumbnail_url,kategori,tanggal,kegiatan_id
        FROM video WHERE status='published' ORDER BY urutan ASC,tanggal DESC NULLS LAST,created_at DESC""")
    return {"status":"success","count":len(rows),"data":rows}


@app.get("/api/public/darurat")
def public_darurat():
    rows=db_query("""SELECT id,judul,deskripsi,kategori,kontak,nomor,url,urutan
        FROM informasi_darurat WHERE is_active=TRUE ORDER BY urutan ASC,judul ASC""")
    return {"status":"success","count":len(rows),"data":rows}
