#!/usr/bin/env python3
from __future__ import annotations

import random
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from app.core.storage import DATA_DIR, write_store
from app.services.audit import audit_log
from app.services.commission import calculate_commission


random.seed(42)

CITIES = ["Pune", "Nashik", "Nagpur", "Aurangabad", "Kolhapur", "Solapur", "Amravati", "Latur"]
CROPS = ["Alphonso Mango", "Onion", "Wheat", "Pomegranate", "Soybean", "Cotton", "Sugarcane", "Jowar"]
PRICE_BANDS = {
    "Alphonso Mango": (7500, 9000),
    "Onion": (1200, 2200),
    "Wheat": (1900, 2100),
    "Pomegranate": (6000, 8000),
    "Soybean": (4200, 4800),
    "Cotton": (6500, 7500),
    "Sugarcane": (280, 320),
    "Jowar": (2200, 2600),
}


def _price(crop: str) -> float:
    lo, hi = PRICE_BANDS[crop]
    return round(random.uniform(lo, hi), 2)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def seed() -> tuple[int, int, int, int]:
    DATA_DIR.mkdir(exist_ok=True)

    users = []
    now = datetime.utcnow()
    for i in range(6):
        users.append({"id": f"farmer-{i+1}", "name": f"Farmer {i+1}", "role": "farmer", "city": CITIES[i % len(CITIES)], "created_at": _iso(now)})
    for i in range(4):
        users.append({"id": f"buyer-{i+1}", "name": f"Buyer {i+1}", "role": "buyer", "city": CITIES[(i + 2) % len(CITIES)], "created_at": _iso(now)})
    for i in range(2):
        users.append({"id": f"middleman-{i+1}", "name": f"Middleman {i+1}", "role": "middleman", "city": CITIES[(i + 4) % len(CITIES)], "created_at": _iso(now)})

    listings = []
    for i in range(20):
        crop = CROPS[i % len(CROPS)]
        listing = {
            "id": str(uuid4()),
            "farmer_id": users[i % 6]["id"],
            "crop_name": crop,
            "city": CITIES[i % len(CITIES)],
            "quantity_kg": float(random.randint(500, 9000)),
            "price_per_quintal": _price(crop),
            "quality_grade": random.choice(["A", "A", "B"]),
            "status": "active",
            "created_at": _iso(now - timedelta(hours=i)),
            "updated_at": _iso(now - timedelta(hours=i)),
        }
        listings.append(listing)

    offers = []
    statuses = ["pending", "accepted", "accepted", "pending", "accepted", "rejected", "countered", "accepted", "accepted", "pending"]
    for i in range(10):
        listing = listings[i]
        offered = round(listing["price_per_quintal"] * random.uniform(0.9, 1.03), 2)
        offer = {
            "id": str(uuid4()),
            "listing_id": listing["id"],
            "buyer_id": users[6 + (i % 4)]["id"],
            "farmer_id": listing["farmer_id"],
            "offered_price": offered,
            "counter_price": round(offered * 1.01, 2) if statuses[i] == "countered" else None,
            "accepted_price": offered if statuses[i] == "accepted" else None,
            "status": statuses[i],
            "created_at": _iso(now - timedelta(hours=i + 1)),
            "updated_at": _iso(now - timedelta(hours=i)),
        }
        offers.append(offer)

    transactions = []
    accepted = [offer for offer in offers if offer["status"] == "accepted"]
    for i, offer in enumerate(accepted[:5]):
        deal_value = float(offer["accepted_price"] or offer["offered_price"])
        tx = {
            "id": str(uuid4()),
            "offer_id": offer["id"],
            "listing_id": offer["listing_id"],
            "farmer_id": offer["farmer_id"],
            "buyer_id": offer["buyer_id"],
            "deal_value": deal_value,
            "commission": calculate_commission(deal_value),
            "created_at": _iso(now - timedelta(days=i)),
        }
        transactions.append(tx)

    sold_listing_ids = {tx["listing_id"] for tx in transactions}
    for listing in listings:
        if listing["id"] in sold_listing_ids:
            listing["status"] = "sold"

    market_rates = []
    top5 = ["Alphonso Mango", "Onion", "Wheat", "Pomegranate", "Soybean"]
    for day in range(30):
        for crop in top5:
            market_rates.append(
                {
                    "id": str(uuid4()),
                    "user_id": users[6 + (day % 4)]["id"],
                    "crop": crop,
                    "city": CITIES[day % len(CITIES)],
                    "price_per_quintal": _price(crop),
                    "recorded_at": _iso(now - timedelta(days=day)),
                    "created_at": _iso(now - timedelta(days=day)),
                }
            )

    notifications = []
    for user in users:
        notifications.append(
            {
                "id": str(uuid4()),
                "user_id": user["id"],
                "message": f"Welcome {user['name']} - seed data ready",
                "read": False,
                "created_at": _iso(now),
            }
        )

    write_store("users.json", users)
    write_store("listings.json", listings)
    write_store("offers.json", offers)
    write_store("transactions.json", transactions)
    write_store("market_rates.json", market_rates)
    write_store("notifications.json", notifications)
    write_store("audit_log.json", [])

    for user in users:
        audit_log("USER_CREATED", "user", user["id"], user["id"], None, user)
    for listing in listings:
        audit_log("LISTING_CREATED", "listing", listing["id"], listing["farmer_id"], None, listing)
    for offer in offers:
        audit_log("OFFER_CREATED", "offer", offer["id"], offer["buyer_id"], None, offer)
    for tx in transactions:
        audit_log("TRANSACTION_COMPLETED", "transaction", tx["id"], tx["farmer_id"], None, tx)
    for rate in market_rates:
        audit_log("MARKET_RATE_REPORTED", "market_rate", rate["id"], rate["user_id"], None, rate)

    return len(listings), len(offers), len(transactions), len(market_rates)


if __name__ == "__main__":
    listings_count, offers_count, transactions_count, rates_count = seed()
    print(f"✅ Seeded {listings_count} listings, {offers_count} offers, {transactions_count} transactions, {rates_count} market rates")
