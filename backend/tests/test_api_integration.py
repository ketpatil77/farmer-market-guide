from app.core.storage import read_store


def test_full_happy_path(client, seed_users):
    assert client.post("/api/users", json={"id": "farmer-x", "name": "Farmer X", "role": "farmer", "city": "Pune"}).status_code == 201
    assert client.post("/api/users", json={"id": "buyer-x", "name": "Buyer X", "role": "buyer", "city": "Pune"}).status_code == 201

    listing = client.post(
        "/api/listings",
        json={"farmer_id": "farmer-x", "crop_name": "Onion", "city": "Pune", "quantity_kg": 800, "price_per_quintal": 390000},
    ).json()

    offer = client.post("/api/offers", json={"listing_id": listing["id"], "buyer_id": "buyer-x", "offered_price": 380000}).json()
    assert client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-x", "new_status": "countered", "counter_price": 390000}).status_code == 200
    assert client.put(f"/api/offers/{offer['id']}", json={"user_id": "farmer-x", "new_status": "accepted"}).status_code == 200

    tx = client.post("/api/transactions", json={"offer_id": offer["id"], "user_id": "farmer-x"}).json()
    assert tx["commission"]["total_commission"] == 19500.0

    listing_row = next(item for item in read_store("listings.json") if item["id"] == listing["id"])
    assert listing_row["status"] == "sold"

    assert len(read_store("audit_log.json")) >= 5


def test_health_returns_required_fields(client):
    payload = client.get("/api/health").json()
    for key in ["status", "storage", "data_dir", "sse_clients", "uptime_seconds", "version", "timestamp"]:
        assert key in payload


def test_price_history_sorted_and_positive(client, seed_users):
    client.post("/api/market-rates", json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1500, "recorded_at": "2026-01-01T00:00:00"})
    client.post("/api/market-rates", json={"user_id": "buyer-2", "crop": "Onion", "city": "Pune", "price_per_quintal": 1700, "recorded_at": "2026-01-02T00:00:00"})
    history = client.get("/api/analytics/price-history/Onion").json()
    timestamps = [row["timestamp"] for row in history]
    assert timestamps == sorted(timestamps)
    assert all(row["price"] > 0 for row in history)


def test_heatmap_returns_8_plus_cities(client, seed_users):
    cities = ["Pune", "Nashik", "Nagpur", "Aurangabad", "Kolhapur", "Solapur", "Amravati", "Latur"]
    for idx, city in enumerate(cities):
        client.post(
            "/api/listings",
            json={"farmer_id": "farmer-1", "crop_name": "Onion", "city": city, "quantity_kg": 100 + idx, "price_per_quintal": 1500 + idx},
        )
    heatmap = client.get("/api/analytics/demand-heatmap").json()
    assert len({row["city"] for row in heatmap}) >= 8


def test_pagination_25_listings_page_1_has_10(client, seed_users):
    cities = ["Pune", "Nashik", "Nagpur", "Aurangabad", "Kolhapur", "Solapur", "Amravati", "Latur"]
    crops = ["Onion", "Wheat", "Soybean", "Cotton", "Jowar", "Rice", "Turmeric", "Bajra"]
    for idx in range(25):
        client.post(
            "/api/listings",
            json={
                "farmer_id": f"farmer-{1 + (idx % 2)}",
                "crop_name": crops[idx % len(crops)],
                "city": cities[(idx // len(crops)) % len(cities)],
                "quantity_kg": 200 + idx,
                "price_per_quintal": 1500 + idx,
            },
        )
    response = client.get("/api/listings", params={"page": 1, "limit": 10})
    assert response.status_code == 200
    assert len(response.json()["items"]) == 10
