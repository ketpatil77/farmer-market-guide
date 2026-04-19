from datetime import datetime, timedelta


def test_valid_report_201(client, seed_users):
    response = client.post(
        "/api/market-rates",
        json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1800},
    )
    assert response.status_code == 201


def test_duplicate_same_user_crop_city_under_1hr_429(client, seed_users):
    payload = {"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1800}
    assert client.post("/api/market-rates", json=payload).status_code == 201
    response = client.post("/api/market-rates", json=payload)
    assert response.status_code == 429


def test_same_user_after_1hr_201(client, seed_users):
    old_time = (datetime.utcnow() - timedelta(hours=2)).isoformat()
    assert client.post(
        "/api/market-rates",
        json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1700, "recorded_at": old_time},
    ).status_code == 201
    response = client.post(
        "/api/market-rates",
        json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1800},
    )
    assert response.status_code == 201


def test_different_user_same_crop_city_under_1hr_201(client, seed_users):
    assert client.post(
        "/api/market-rates",
        json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1700},
    ).status_code == 201
    response = client.post(
        "/api/market-rates",
        json={"user_id": "buyer-2", "crop": "Onion", "city": "Pune", "price_per_quintal": 1800},
    )
    assert response.status_code == 201


def test_price_outlier_gt_50000_400(client, seed_users):
    response = client.post(
        "/api/market-rates",
        json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 50001},
    )
    assert response.status_code == 400


def test_average_of_3_reports_correct(client, seed_users):
    client.post("/api/market-rates", json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1500})
    client.post("/api/market-rates", json={"user_id": "buyer-2", "crop": "Onion", "city": "Pune", "price_per_quintal": 1800})
    client.post("/api/market-rates", json={"user_id": "farmer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 2100})
    response = client.get("/api/market-rates", params={"crop": "Onion", "city": "Pune"})
    assert response.status_code == 200
    assert response.json()["average_price_per_quintal"] == 1800.0


def test_reports_older_than_7_days_excluded_from_average(client, seed_users):
    old_date = (datetime.utcnow() - timedelta(days=8)).isoformat()
    client.post(
        "/api/market-rates",
        json={"user_id": "buyer-1", "crop": "Onion", "city": "Pune", "price_per_quintal": 1000, "recorded_at": old_date},
    )
    client.post(
        "/api/market-rates",
        json={"user_id": "buyer-2", "crop": "Onion", "city": "Pune", "price_per_quintal": 2000},
    )
    response = client.get("/api/market-rates", params={"crop": "Onion", "city": "Pune"})
    assert response.json()["average_price_per_quintal"] == 2000.0
