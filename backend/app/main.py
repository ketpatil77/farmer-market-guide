from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.storage import ensure_data_files


ensure_data_files()

app = FastAPI(title=settings.app_name, version=settings.version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root() -> dict:
    return {
        "service": settings.app_name,
        "version": settings.version,
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
    }
