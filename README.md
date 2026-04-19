# Farmer Market Guide

Farmer Market Guide is a multi-role agricultural marketplace prototype built for rural and semi-urban trading workflows in Maharashtra, India. It combines three browser dashboards for farmers, buyers, and middlemen with a FastAPI backend for listings, offers, transactions, analytics, audit logging, and realtime market updates.

## Highlights

- Multi-role experience across dedicated Farmer, Buyer, and Middleman dashboards
- Real-time market signals and Server-Sent Events support
- Dual-language interface support with English and Marathi toggles
- Backend API for users, listings, offers, transactions, analytics, audit, and health checks
- Seeded demo data for local evaluation and presentation use
- Automated backend tests for core marketplace flows

## Project Structure

```text
.
├── index.html                     # Role selector / landing screen
├── buyer-dashboard.html           # Buyer experience
├── farmer-dashboard.html          # Farmer experience
├── middleman-dashboard.html       # Middleman experience
├── scripts/                       # Frontend logic, static server, realtime server
├── styles/                        # Shared and dashboard-specific styles
├── data/                          # Frontend demo data
├── backend/                       # FastAPI service, tests, Docker assets
└── start_server_and_dashboards.bat
```

## Quick Start

### Frontend demo

1. Install Python 3.12+.
2. Copy `local.env.example.bat` to `local.env.bat` and add keys only if you need live commodity pricing.
3. Run `start_server_and_dashboards.bat`.
4. Open:
   - `http://localhost:8000/`
   - `http://localhost:8000/farmer-dashboard.html`
   - `http://localhost:8000/buyer-dashboard.html`
   - `http://localhost:8000/middleman-dashboard.html`

### Backend API

1. Go to `backend/`.
2. Copy `.env.example` to `.env`.
3. Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

4. Start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

5. Open `http://localhost:8080/docs`.

## Testing

Run backend tests from `backend/`:

```bash
pytest -q
```

## Configuration

- `local.env.bat` is for the Windows demo launcher and should stay local.
- `backend/.env` is for API runtime configuration and should stay local.
- Safe templates are included as `local.env.example.bat` and `backend/.env.example`.

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Chart.js, Anime.js
- Backend: FastAPI, Pydantic, Uvicorn, Pytest
- Realtime: Python SSE server
- Packaging: Docker and `docker compose` assets under `backend/`

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
