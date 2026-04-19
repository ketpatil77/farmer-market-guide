from app.core.storage import write_store


def _create_listing_and_offer(client):
    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": "Pune", "quantity_kg": 100, "price_per_quintal": 1200},
    ).json()
    offer = client.post(
        "/api/offers",
        json={"listing_id": listing["id"], "buyer_id": "buyer-1", "offered_price": 390000},
    ).json()
    return listing, offer


def test_pending_to_accepted(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    response = client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    assert response.status_code == 200


def test_pending_to_rejected(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    response = client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "rejected"})
    assert response.status_code == 200


def test_pending_to_countered_with_price(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    response = client.put(
        f"/api/offers/{offer['id']}",
        json={"user_id": "farmer-1", "new_status": "countered", "counter_price": 400000},
    )
    assert response.status_code == 200


def test_countered_to_accepted(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "countered", "counter_price": 400000})
    response = client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    assert response.status_code == 200


def test_countered_to_rejected(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "countered", "counter_price": 400000})
    response = client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "rejected"})
    assert response.status_code == 200


def test_accepted_to_accepted_409(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    response = client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    assert response.status_code == 409


def test_rejected_to_rejected_409(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "rejected"})
    response = client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "rejected"})
    assert response.status_code == 409


def test_accepted_to_countered_400(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "accepted"})
    response = client.put(
        f"/api/offers/{offer['id']}",
        json={"user_id": "farmer-1", "new_status": "countered", "counter_price": 410000},
    )
    assert response.status_code == 400


def test_rejected_to_countered_400(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-1", "new_status": "rejected"})
    response = client.put(
        f"/api/offers/{offer['id']}",
        json={"user_id": "farmer-1", "new_status": "countered", "counter_price": 410000},
    )
    assert response.status_code == 400


def test_buyer_accepts_own_offer_403(client, seed_users):
    _, offer = _create_listing_and_offer(client)
    response = client.put(f"/api/offers/{offer['id']}", json={"user_id": "buyer-1", "new_status": "accepted"})
    assert response.status_code == 403


def test_offer_on_nonexistent_listing_404(client, seed_users):
    response = client.post(
        "/api/offers",
        json={"listing_id": "missing", "buyer_id": "buyer-1", "offered_price": 390000},
    )
    assert response.status_code == 404
