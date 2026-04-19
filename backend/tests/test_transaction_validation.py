from app.core.storage import read_store


def _setup_accepted_offer(client):
    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1200},
    ).json()
    offer = client.post(
        "/api/offers",
        json={"listing_id": listing["id"], "buyer_id": "buyer-1", "offered_price": 390000},
    ).json()
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    return listing, offer


def test_valid_finalization_from_accepted_offer(client, seed_users):
    _, offer = _setup_accepted_offer(client)
    response = client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    assert response.status_code == 201


def test_finalize_pending_offer_400(client, seed_users):
    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1200},
    ).json()
    offer = client.post(
        "/api/offers",
        json={"listing_id": listing["id"], "buyer_id": "buyer-1", "offered_price": 390000},
    ).json()
    response = client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    assert response.status_code == 400


def test_finalize_rejected_offer_400(client, seed_users):
    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1200},
    ).json()
    offer = client.post(
        "/api/offers",
        json={"listing_id": listing["id"], "buyer_id": "buyer-1", "offered_price": 390000},
    ).json()
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "rejected"})
    response = client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    assert response.status_code == 400


def test_duplicate_transaction_same_offer_409(client, seed_users):
    _, offer = _setup_accepted_offer(client)
    client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    response = client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    assert response.status_code == 409


def test_commission_math_390000(client, seed_users):
    _, offer = _setup_accepted_offer(client)
    response = client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    commission = response.json()["commission"]
    assert commission == {
        "platform_fee": 11700.0,
        "facilitator_fee": 7800.0,
        "farmer_receives": 370500.0,
        "total_commission": 19500.0,
    }


def test_audit_log_created_on_finalization(client, seed_users):
    _, offer = _setup_accepted_offer(client)
    client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    logs = read_store("audit_log.json")
    assert any(log.get("action") == "TRANSACTION_COMPLETED" for log in logs)


def test_listing_status_sold_after_finalization(client, seed_users):
    listing, offer = _setup_accepted_offer(client)
    client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-1"})
    listings = read_store("listings.json")
    sold = next(row for row in listings if row["id"] == listing["id"])
    assert sold["status"] == "sold"
