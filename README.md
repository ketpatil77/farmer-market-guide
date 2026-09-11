# Farmer Market Guide

Farmer Market Guide is a multi-role agricultural marketplace prototype for rural and semi-urban trading workflows in Maharashtra, India. It provides dedicated browser experiences for farmers, buyers, and middlemen, backed by a FastAPI service for marketplace operations and reporting.

## Project Ownership

This repository was originally created in collaboration with [Janvi Girase](https://github.com/janvigirase30). The current GitHub fork is maintained under `ketpatil77/farmer-market-guide`.

## Highlights

- Farmer, buyer, and middleman dashboards
- Listings, offers, and transaction workflows
- Market analytics and audit logging
- Server-Sent Events support for realtime updates
- English and Marathi interface support
- Seeded demo data for local evaluation and presentations
- Automated backend tests for core marketplace flows

## Project Structure

```text
.
├── index.html                     # Role selector / landing screen
├── buyer-dashboard.html           # Buyer dashboard
├── farmer-dashboard.html          # Farmer dashboard
├── middleman-dashboard.html       # Middleman dashboard
├── scripts/                       # Frontend, static-server, and realtime scripts
├── styles/                        # Shared and dashboard-specific styles
├── data/                          # Frontend demo data
├── backend/                       # FastAPI service, tests, and Docker assets
└── start_server_and_dashboards.bat
```

## Quick Start

### Frontend demo

1. Install Python 3.12 or newer.
2. Copy `local.env.example.bat` to `local.env.bat` if live commodity-pricing integrations are required.
3. Run `start_server_and_dashboards.bat`.
4. Open the landing page at <http://localhost:8000/>.

The role-specific dashboards are available at:

- <http://localhost:8000/farmer-dashboard.html>
- <http://localhost:8000/buyer-dashboard.html>
- <http://localhost:8000/middleman-dashboard.html>

### Backend API

From `backend/`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

API documentation is then available at <http://localhost:8080/docs>.

## Testing

Run backend tests from the `backend/` directory:

```bash
pytest -q
```

## Configuration

Keep environment files local and never commit credentials.

- `local.env.bat` is used by the Windows demo launcher.
- `backend/.env` contains backend runtime configuration.
- `local.env.example.bat` and `backend/.env.example` are safe templates.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Chart.js, Anime.js
- **Backend:** FastAPI, Pydantic, Uvicorn, Pytest
- **Realtime:** Server-Sent Events (SSE)
- **Packaging:** Docker and Docker Compose assets under `backend/`

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
