# Farmer Market Guide Backend (Phase 2)

FastAPI + PostgreSQL + Redis service layer for the marketplace.

## Quick Start

1. Copy environment file:
   `cp .env.example .env`
2. Start infra and API:
   `docker compose up --build`
3. Open API docs:
   `http://localhost:8080/docs`

## Run Locally (without Docker)

1. Create venv and install deps:
   `python3 -m venv .venv && source .venv/bin/activate`
   `pip install -r requirements.txt`
2. Start API:
   `uvicorn app.main:app --reload --host 0.0.0.0 --port 8080`

## Database Migrations (Alembic)

- Apply latest migration:
  `alembic upgrade head`
- Create a new migration:
  `alembic revision --autogenerate -m "message"`

## Key Endpoints

- `GET /api/v1/health`
- `GET /api/v1/market/rates`
- `POST /api/v1/market/signals`
- `GET /api/v1/external-prices?commodities=WHEAT,RICE,ONION`
- `GET /api/v1/price-recommendation?city=Pune&crop=Onion`
- `POST /api/v1/listings`
- `POST /api/v1/offers`
- `POST /api/v1/offers/{offer_id}/counter`
- `POST /api/v1/offers/{offer_id}/accept`
- `POST /api/v1/offers/{offer_id}/finalize`
- `GET /api/v1/insights/demand`
- `GET /api/v1/insights/price-recommendation`
- `WS /api/v1/events`

## Tests

- Run:
  `pytest -q -s`
