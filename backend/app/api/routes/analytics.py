from app.core.storage import read_store
from fastapi import APIRouter


router = APIRouter()


@router.get("/price-history/{crop}")
def price_history(crop: str) -> list[dict]:
    rates = [row for row in read_store("market_rates.json") if row.get("crop") == crop]
    rates = [row for row in rates if float(row.get("price_per_quintal", 0)) > 0]
    rates.sort(key=lambda row: row.get("recorded_at", ""))
    return [{"timestamp": row["recorded_at"], "price": row["price_per_quintal"], "city": row["city"]} for row in rates]


@router.get("/demand-heatmap")
def demand_heatmap() -> list[dict]:
    counts: dict[str, int] = {}
    for listing in read_store("listings.json"):
        if listing.get("status") != "active":
            continue
        city = listing.get("city")
        counts[city] = counts.get(city, 0) + 1
    return [{"city": city, "active_listings": value} for city, value in sorted(counts.items(), key=lambda item: item[1], reverse=True)]


@router.get("/top-crops")
def top_crops() -> list[dict]:
    totals: dict[str, dict] = {}
    for tx in read_store("transactions.json"):
        crop = next(
            (listing.get("crop_name") for listing in read_store("listings.json") if listing.get("id") == tx.get("listing_id")),
            "unknown",
        )
        entry = totals.setdefault(crop, {"crop": crop, "deals": 0, "deal_value_total": 0.0})
        entry["deals"] += 1
        entry["deal_value_total"] += float(tx.get("deal_value", 0))
    return sorted(totals.values(), key=lambda row: row["deals"], reverse=True)
