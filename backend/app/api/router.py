from fastapi import APIRouter

from app.api.routes import analytics, audit, health, listings, market_rates, offers, transactions, users


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(listings.router, prefix="/listings", tags=["listings"])
api_router.include_router(offers.router, prefix="/offers", tags=["offers"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(market_rates.router, prefix="/market-rates", tags=["market-rates"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
