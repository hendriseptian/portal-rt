from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import psycopg2
from psycopg2.extras import RealDictCursor


app = FastAPI(
    title="Portal RT API",
    description="Backend API untuk Portal RT",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_connection():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise Exception("DATABASE_URL belum dikonfigurasi")

    return psycopg2.connect(database_url)


# =========================================================
# ROOT / HEALTH
# =========================================================

@app.get("/api")
def api_root():
    return {
        "status": "ok",
        "message": "Portal RT API is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }


# =========================================================
# DATABASE TEST
# =========================================================

@app.get("/api/db-test")
def database_test():

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT current_database();")
        result = cursor.fetchone()

        cursor.close()
        connection.close()

        return {
            "status": "connected",
            "database": result[0]
        }

    except Exception as error:

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(error)
            }
        )


# =========================================================
# SETTINGS
# =========================================================

@app.get("/api/settings")
def get_settings():

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute("""
            SELECT
                id,
                key,
                value,
                description,
                updated_at
            FROM settings
            ORDER BY key;
        """)

        data = cursor.fetchall()

        cursor.close()
        connection.close()

        return {
            "status": "success",
            "count": len(data),
            "data": data
        }

    except Exception as error:

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(error)
            }
        )


# =========================================================
# PENGURUS
# =========================================================

@app.get("/api/pengurus")
def get_pengurus():

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute("""
            SELECT
                id,
                nama,
                jabatan,
                foto_file_id,
                deskripsi,
                urutan,
                periode_mulai,
                periode_selesai,
                is_active,
                created_at,
                updated_at
            FROM pengurus
            WHERE is_active = TRUE
            ORDER BY urutan ASC, nama ASC;
        """)

        data = cursor.fetchall()

        cursor.close()
        connection.close()

        return {
            "status": "success",
            "count": len(data),
            "data": data
        }

    except Exception as error:

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(error)
            }
        )


# =========================================================
# PENGUMUMAN
# =========================================================

@app.get("/api/pengumuman")
def get_pengumuman():

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute("""
            SELECT
                id,
                judul,
                slug,
                isi,
                kategori,
                prioritas,
                tanggal_mulai,
                tanggal_selesai,
                status,
                author_id,
                created_at,
                updated_at
            FROM pengumuman
            WHERE status = 'published'
            ORDER BY
                CASE
                    WHEN prioritas = 'darurat' THEN 1
                    WHEN prioritas = 'penting' THEN 2
                    ELSE 3
                END,
                tanggal_mulai DESC NULLS LAST,
                created_at DESC;
        """)

        data = cursor.fetchall()

        cursor.close()
        connection.close()

        return {
            "status": "success",
            "count": len(data),
            "data": data
        }

    except Exception as error:

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(error)
            }
        )


# =========================================================
# AGENDA
# =========================================================

@app.get("/api/agenda")
def get_agenda():

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute("""
            SELECT
                id,
                judul,
                deskripsi,
                tanggal,
                waktu_mulai,
                waktu_selesai,
                lokasi,
                kategori,
                status,
                created_by,
                created_at,
                updated_at
            FROM agenda
            WHERE status = 'published'
            ORDER BY
                tanggal ASC,
                waktu_mulai ASC NULLS LAST;
        """)

        data = cursor.fetchall()

        cursor.close()
        connection.close()

        return {
            "status": "success",
            "count": len(data),
            "data": data
        }

    except Exception as error:

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(error)
            }
        )
