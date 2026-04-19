from datetime import datetime

from fastapi import APIRouter

from app.core.config import settings
from app.services.runtime import get_sse_clients


router = APIRouter()
STARTED_AT = datetime.utcnow()


@router.get("/health")
def health_check() -> dict:
    now = datetime.utcnow()
    return {
        "status": "healthy",
        "storage": "local_json",
        "data_dir": "data/",
        "sse_clients": get_sse_clients(),
        "uptime_seconds": int((now - STARTED_AT).total_seconds()),
        "version": settings.version,
        "timestamp": now.isoformat(),
    }
