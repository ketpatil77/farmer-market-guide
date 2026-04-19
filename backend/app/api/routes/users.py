from datetime import datetime

from fastapi import APIRouter, status

from app.core.storage import append_record, read_store
from app.schemas.marketplace import UserCreateRequest
from app.services.audit import audit_log


router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreateRequest) -> dict:
    users = read_store("users.json")
    if any(user.get("id") == payload.id for user in users):
        return next(user for user in users if user.get("id") == payload.id)

    record = payload.model_dump()
    record["created_at"] = datetime.utcnow().isoformat()
    append_record("users.json", record)
    audit_log("USER_CREATED", "user", record["id"], record["id"], None, record)
    return record
