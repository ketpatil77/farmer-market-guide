from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import storage
from app.core.storage import DATA_FILES, read_store, write_store
from app.main import app


@pytest.fixture
def isolated_storage(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(storage, "DATA_DIR", data_dir)

    for filename in DATA_FILES:
        write_store(filename, [])
    return data_dir


@pytest.fixture
def client(isolated_storage):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def seed_users():
    users = [
        {"id": "farmer-1", "name": "Farmer 1", "role": "farmer", "city": "Pune", "created_at": "2026-01-01T00:00:00"},
        {"id": "farmer-2", "name": "Farmer 2", "role": "farmer", "city": "Nashik", "created_at": "2026-01-01T00:00:00"},
        {"id": "buyer-1", "name": "Buyer 1", "role": "buyer", "city": "Pune", "created_at": "2026-01-01T00:00:00"},
        {"id": "buyer-2", "name": "Buyer 2", "role": "buyer", "city": "Nagpur", "created_at": "2026-01-01T00:00:00"},
    ]
    write_store("users.json", users)
    return users


def create_listing(client: TestClient, farmer_id: str = "farmer-1", crop_name: str = "Onion", city: str = "Pune") -> dict:
    response = client.post(
        "/api/listings",
        json={
            "farmer_id": farmer_id,
            "crop_name": crop_name,
            "city": city,
            "quantity_kg": 1000,
            "price_per_quintal": 2000,
            "quality_grade": "A",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_offer(client: TestClient, listing_id: str, buyer_id: str = "buyer-1", offered_price: float = 390000) -> dict:
    response = client.post(
        "/api/offers",
        json={"listing_id": listing_id, "buyer_id": buyer_id, "offered_price": offered_price},
    )
    assert response.status_code == 201
    return response.json()


def accept_offer(client: TestClient, offer_id: str, user_id: str = "farmer-1") -> dict:
    response = client.put(
        f"/api/offers/{offer_id}",
        json={"user_id": user_id, "new_status": "accepted"},
    )
    assert response.status_code == 200
    return response.json()
