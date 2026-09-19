from fastapi import FastAPI
import os
import psycopg2

app = FastAPI(
    title="Portal RT API",
    description="Backend API untuk Portal RT",
    version="1.0.0"
)


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


@app.get("/api/db-test")
def database_test():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        return {
            "status": "error",
            "message": "DATABASE_URL belum dikonfigurasi"
        }

    try:
        connection = psycopg2.connect(database_url)
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
        return {
            "status": "error",
            "message": str(error)
        }
