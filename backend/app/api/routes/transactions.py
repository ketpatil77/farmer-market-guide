from fastapi import APIRouter, HTTPException, Query, status

from app.core.storage import read_store
from app.schemas.marketplace import TransactionCreateRequest
from app.services.marketplace import ConflictError, ForbiddenError, NotFoundError, TransactionService, ValidationError


router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreateRequest) -> dict:
    try:
        return TransactionService.finalize(payload.offer_id, payload.user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("")
def get_transactions(
    farmer_id: str | None = Query(default=None),
    buyer_id: str | None = Query(default=None),
) -> list[dict]:
    records = read_store("transactions.json")
    if farmer_id:
        records = [row for row in records if row.get("farmer_id") == farmer_id]
    if buyer_id:
        records = [row for row in records if row.get("buyer_id") == buyer_id]
    return records
