from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import os
import psycopg2
import jwt
import bcrypt

from datetime import datetime, timedelta, timezone
from psycopg2.extras import RealDictCursor


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="Portal RT API",
    description="Backend API untuk Portal RT",
    version="1.1.0"
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
# AUTH CONFIGURATION
# =========================================================

security = HTTPBearer()

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 480


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_connection():

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise Exception(
            "DATABASE_URL belum dikonfigurasi"
        )

    return psycopg2.connect(database_url)


# =========================================================
# LOGIN MODEL
# =========================================================

class LoginRequest(BaseModel):

    username: str
    password: str


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

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT current_database();"
        )

        result = cursor.fetchone()

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

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# AUTHENTICATION
# =========================================================

@app.post("/api/auth/login")
def login(request: LoginRequest):

    jwt_secret = os.getenv("JWT_SECRET")

    if not jwt_secret:

        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET belum dikonfigurasi"
        )

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                password_hash,
                name,
                role,
                is_active
            FROM users
            WHERE username = %s
            LIMIT 1;
            """,
            (request.username,)
        )

        user = cursor.fetchone()

        if not user:

            raise HTTPException(
                status_code=401,
                detail="Username atau password salah"
            )

        if not user["is_active"]:

            raise HTTPException(
                status_code=403,
                detail="Akun tidak aktif"
            )

        password_valid = bcrypt.checkpw(
            request.password.encode("utf-8"),
            user["password_hash"].encode("utf-8")
        )

        if not password_valid:

            raise HTTPException(
                status_code=401,
                detail="Username atau password salah"
            )

        now = datetime.now(timezone.utc)

        payload = {
            "sub": str(user["id"]),
            "username": user["username"],
            "name": user["name"],
            "role": user["role"],
            "iat": now,
            "exp": now + timedelta(
                minutes=JWT_EXPIRE_MINUTES
            )
        }

        token = jwt.encode(
            payload,
            jwt_secret,
            algorithm=JWT_ALGORITHM
        )

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

    except Exception as error:

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(error)
            }
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# AUTHENTICATED USER
# =========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    )
):

    jwt_secret = os.getenv("JWT_SECRET")

    if not jwt_secret:

        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET belum dikonfigurasi"
        )

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=[JWT_ALGORITHM]
        )

        return payload

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token sudah expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Token tidak valid"
        )


@app.get("/api/auth/me")
def auth_me(
    current_user=Depends(get_current_user)
):

    return {
        "status": "success",
        "user": current_user
    }


# =========================================================
# SETTINGS
# =========================================================

@app.get("/api/settings")
def get_settings():

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute(
            """
            SELECT
                id,
                key,
                value,
                description,
                updated_at
            FROM settings
            ORDER BY key;
            """
        )

        data = cursor.fetchall()

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

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# PENGURUS
# =========================================================

@app.get("/api/pengurus")
def get_pengurus():

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute(
            """
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
            ORDER BY
                urutan ASC,
                nama ASC;
            """
        )

        data = cursor.fetchall()

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

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# PENGUMUMAN
# =========================================================

@app.get("/api/pengumuman")
def get_pengumuman():

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute(
            """
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
                    WHEN prioritas = 'darurat'
                        THEN 1
                    WHEN prioritas = 'penting'
                        THEN 2
                    ELSE 3
                END,
                tanggal_mulai DESC NULLS LAST,
                created_at DESC;
            """
        )

        data = cursor.fetchall()

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

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# AGENDA
# =========================================================

@app.get("/api/agenda")
def get_agenda():

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute(
            """
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
            """
        )

        data = cursor.fetchall()

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

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()
