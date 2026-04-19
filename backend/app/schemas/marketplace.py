from datetime import datetime

from pydantic import BaseModel, Field


class ListingCreateRequest(BaseModel):
    farmer_id: str
    crop_name: str
    city: str
    quantity_kg: float = Field(gt=0, le=100000)
    price_per_quintal: float = Field(gt=0)
    quality_grade: str = "A"


class ListingResponse(BaseModel):
    id: str
    farmer_id: str
    crop_name: str
    city: str
    quantity_kg: float
    price_per_quintal: float
    quality_grade: str
    status: str
    created_at: str
    updated_at: str | None = None


class ListingPageResponse(BaseModel):
    items: list[ListingResponse]
    total: int
    page: int
    pages: int


class OfferCreateRequest(BaseModel):
    listing_id: str
    buyer_id: str
    offered_price: float = Field(gt=0)


class OfferTransitionRequest(BaseModel):
    user_id: str
    new_status: str
    counter_price: float | None = None


class OfferResponse(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    farmer_id: str
    offered_price: float
    counter_price: float | None = None
    accepted_price: float | None = None
    status: str
    created_at: str
    updated_at: str | None = None


class TransactionCreateRequest(BaseModel):
    offer_id: str
    user_id: str


class CommissionBreakdown(BaseModel):
    platform_fee: float
    facilitator_fee: float
    farmer_receives: float
    total_commission: float


class TransactionResponse(BaseModel):
    id: str
    offer_id: str
    listing_id: str
    farmer_id: str
    buyer_id: str
    deal_value: float
    commission: CommissionBreakdown
    created_at: str


class MarketRateCreateRequest(BaseModel):
    user_id: str
    crop: str
    city: str
    price_per_quintal: float = Field(gt=0)
    recorded_at: datetime | None = None


class MarketRateResponse(BaseModel):
    id: str
    user_id: str
    crop: str
    city: str
    price_per_quintal: float
    recorded_at: str
    created_at: str


class MarketRateListResponse(BaseModel):
    items: list[MarketRateResponse]
    average_price_per_quintal: float


class UserCreateRequest(BaseModel):
    id: str
    name: str
    role: str
    city: str


class UserResponse(BaseModel):
    id: str
    name: str
    role: str
    city: str
    created_at: str


class HealthResponse(BaseModel):
    status: str
    storage: str
    data_dir: str
    sse_clients: int
    uptime_seconds: int
    version: str
    timestamp: str
