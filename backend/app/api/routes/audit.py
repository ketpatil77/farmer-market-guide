from fastapi import APIRouter, HTTPException


router = APIRouter()


@router.delete("/{audit_id}")
def delete_audit(audit_id: str) -> dict:
    raise HTTPException(status_code=405, detail="Audit entries cannot be deleted")
