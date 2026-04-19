from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.marketplace import ListingCreateRequest
from app.services.marketplace import ConflictError, ForbiddenError, ListingService, NotFoundError, ValidationError


router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_listing(payload: ListingCreateRequest) -> dict:
    try:
        return ListingService.create(**payload.model_dump())
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("")
def get_listings(
    crop: str | None = Query(default=None),
    city: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
) -> dict:
    return ListingService.get_active(crop=crop, city=city, page=page, limit=limit)


@router.delete("/{listing_id}")
def delete_listing(listing_id: str, farmer_id: str = Query(...)) -> dict:
    try:
        return ListingService.soft_delete(listing_id=listing_id, farmer_id=farmer_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
