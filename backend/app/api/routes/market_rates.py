from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.marketplace import MarketRateCreateRequest
from app.services.marketplace import MarketRateService, RateLimitError, ValidationError


router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_market_rate(payload: MarketRateCreateRequest) -> dict:
    try:
        recorded_at = payload.recorded_at.isoformat() if payload.recorded_at else None
        return MarketRateService.create(
            user_id=payload.user_id,
            crop=payload.crop,
            city=payload.city,
            price_per_quintal=payload.price_per_quintal,
            recorded_at=recorded_at,
        )
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("")
def get_market_rates(crop: str | None = Query(default=None), city: str | None = Query(default=None)) -> dict:
    return MarketRateService.list_rates(crop=crop, city=city)
