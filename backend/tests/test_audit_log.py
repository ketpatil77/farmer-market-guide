from pathlib import Path

from app.core.storage import DATA_DIR, read_store


def test_listing_creation_audit_entry_exists(client, seed_users):
    client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1500},
    )
    logs = read_store("audit_log.json")
    assert any(item["action"] == "LISTING_CREATED" for item in logs)


def test_offer_acceptance_audit_entry_exists(client, seed_users):
    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1500},
    ).json()
    offer = client.post("/api/offers", json={"listing_id": listing["id"], "buyer_id": "buyer-1", "offered_price": 390000}).json()
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    logs = read_store("audit_log.json")
    assert any(item["action"] == "OFFER_ACCEPTED" for item in logs)


def test_transaction_audit_entry_exists(client, seed_users):
    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1500},
    ).json()
    offer = client.post("/api/offers", json={"listing_id": listing["id"], "buyer_id": "buyer-1", "offered_price": 390000}).json()
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    logs = read_store("audit_log.json")
    assert any(item["action"] == "TRANSACTION_COMPLETED" for item in logs)


def test_audit_log_file_written_to_disk(client):
    client.get("/api/health")
    assert (DATA_DIR / "audit_log.json").exists()


def test_audit_entries_cannot_be_deleted_405(client):
    response = client.delete("/api/audit/any-id")
    assert response.status_code == 405
