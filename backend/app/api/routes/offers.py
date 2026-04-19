from fastapi import APIRouter, HTTPException, status

from app.core.storage import read_store
from app.schemas.marketplace import OfferCreateRequest, OfferTransitionRequest
from app.services.marketplace import ConflictError, ForbiddenError, NotFoundError, OfferService, ValidationError


router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_offer(payload: OfferCreateRequest) -> dict:
    try:
        return OfferService.create(**payload.model_dump())
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.put("/{offer_id}")
def transition_offer(offer_id: str, payload: OfferTransitionRequest) -> dict:
    try:
        return OfferService.transition(
            offer_id=offer_id,
            new_status=payload.new_status,
            user_id=payload.user_id,
            counter_price=payload.counter_price,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{listing_id}")
def list_offers(listing_id: str) -> list[dict]:
    return [offer for offer in read_store("offers.json") if offer.get("listing_id") == listing_id]
