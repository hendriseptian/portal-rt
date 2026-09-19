from fastapi import FastAPI

app = FastAPI(
    title="Portal RT API",
    description="Backend API untuk Portal RT",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Portal RT API is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }
