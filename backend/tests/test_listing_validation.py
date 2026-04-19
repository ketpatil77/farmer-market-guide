from datetime import datetime

from app.core.storage import read_store, write_store


def test_valid_listing_returns_201_and_id(client, seed_users):
    response = client.post(
        "/api/listings",
        json={
            "farmer_id": "farmer-1",
            "crop_name": "Onion",
            "city": "Pune",
            "quantity_kg": 100,
            "price_per_quintal": 2000,
        },
    )
    assert response.status_code == 201
    assert response.json()["id"]


def test_missing_crop_name_422(client, seed_users):
    response = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 2000},
    )
    assert response.status_code == 422


def test_missing_price_422(client, seed_users):
    response = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100},
    )
    assert response.status_code == 422


def test_price_zero_422(client, seed_users):
    response = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 0},
    )
    assert response.status_code == 422


def test_price_negative_422(client, seed_users):
    response = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": -50},
    )
    assert response.status_code == 422


def test_quantity_zero_422(client, seed_users):
    response = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 0, "price_per_quintal": 1200},
    )
    assert response.status_code == 422


def test_quantity_gt_100000_422(client, seed_users):
    response = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100001, "price_per_quintal": 1200},
    )
    assert response.status_code == 422


def test_invalid_city_422(client, seed_users):
    response = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Mumbai", "quantity_kg": 100, "price_per_quintal": 1200},
    )
    assert response.status_code == 422


def test_duplicate_listing_within_1hr_409(client, seed_users):
    payload = {
        "farmer_id": "farmer-1",
        "crop_name": "Onion",
        "city": "Pune",
        "quantity_kg": 100,
        "price_per_quintal": 1200,
    }
    assert client.post("/api/listings", json=payload).status_code == 201
    response = client.post("/api/listings", json=payload)
    assert response.status_code == 409


def test_soft_delete_sets_deleted_and_hides_from_get(client, seed_users):
    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1200},
    ).json()
    delete_response = client.delete(f"/api/listings/{listing['id']}?farmer_id=farmer-1")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"

    listings = client.get("/api/listings").json()["items"]
    assert all(item["id"] != listing["id"] for item in listings)
