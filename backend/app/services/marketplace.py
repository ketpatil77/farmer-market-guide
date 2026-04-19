from datetime import datetime, timedelta
from math import ceil
from uuid import uuid4

from app.core.storage import append_record, read_store, update_record, write_store
from app.services.audit import audit_log
from app.services.commission import calculate_commission


VALID_CITIES = [
    "Pune", "Nashik", "Nagpur", "Aurangabad",
    "Kolhapur", "Solapur", "Amravati", "Latur",
    "Satara", "Sangli", "Jalgaon", "Akola",
    "Nanded", "Chandrapur", "Parbhani", "Osmanabad",
]

VALID_CROPS = [
    "Alphonso Mango", "Wheat", "Onion", "Soybean",
    "Pomegranate", "Cotton", "Sugarcane", "Jowar",
    "Rice", "Groundnut", "Turmeric", "Bajra",
]


class ServiceError(Exception):
    status_code = 500


class ValidationError(ServiceError):
    status_code = 400


class NotFoundError(ServiceError):
    status_code = 404


class ConflictError(ServiceError):
    status_code = 409


class ForbiddenError(ServiceError):
    status_code = 403


class RateLimitError(ServiceError):
    status_code = 429


def _now() -> datetime:
    return datetime.utcnow()


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


class ListingService:
    @staticmethod
    def create(farmer_id, crop_name, city, quantity_kg, price_per_quintal, quality_grade="A") -> dict:
        if city not in VALID_CITIES:
            raise ValidationError("city must be a valid Maharashtra city")
        if crop_name not in VALID_CROPS:
            raise ValidationError("crop_name must be a supported crop")
        if price_per_quintal <= 0:
            raise ValidationError("price_per_quintal must be greater than 0")
        if quantity_kg < 1 or quantity_kg > 100000:
            raise ValidationError("quantity_kg must be between 1 and 100000")

        now = _now()
        for listing in read_store("listings.json"):
            created_at = _parse_time(listing.get("created_at"))
            if (
                listing.get("farmer_id") == farmer_id
                and listing.get("crop_name") == crop_name
                and listing.get("city") == city
                and created_at
                and now - created_at <= timedelta(hours=1)
                and listing.get("status") != "deleted"
            ):
                raise ConflictError("duplicate listing within 1 hour")

        record = {
            "id": str(uuid4()),
            "farmer_id": farmer_id,
            "crop_name": crop_name,
            "city": city,
            "quantity_kg": float(quantity_kg),
            "price_per_quintal": float(price_per_quintal),
            "quality_grade": quality_grade,
            "status": "active",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        append_record("listings.json", record)
        audit_log("LISTING_CREATED", "listing", record["id"], farmer_id, None, record)
        return record

    @staticmethod
    def get_active(crop=None, city=None, page=1, limit=10) -> dict:
        listings = [row for row in read_store("listings.json") if row.get("status") == "active"]
        if crop:
            listings = [row for row in listings if row.get("crop_name") == crop]
        if city:
            listings = [row for row in listings if row.get("city") == city]

        listings.sort(key=lambda row: row.get("created_at", ""), reverse=True)
        total = len(listings)
        pages = ceil(total / limit) if total else 1
        start = (page - 1) * limit
        end = start + limit
        return {"items": listings[start:end], "total": total, "page": page, "pages": pages}

    @staticmethod
    def soft_delete(listing_id, farmer_id):
        listings = read_store("listings.json")
        listing = next((row for row in listings if row.get("id") == listing_id), None)
        if not listing:
            raise NotFoundError("listing not found")
        if listing.get("farmer_id") != farmer_id:
            raise ForbiddenError("listing does not belong to farmer")

        old = dict(listing)
        updated = update_record("listings.json", listing_id, {"status": "deleted"})
        audit_log("LISTING_DELETED", "listing", listing_id, farmer_id, old, updated)
        return updated


class OfferService:
    VALID_TRANSITIONS = {
        "pending": ["accepted", "rejected", "countered"],
        "countered": ["accepted", "rejected"],
    }

    @staticmethod
    def create(listing_id, buyer_id, offered_price) -> dict:
        listing = next((row for row in read_store("listings.json") if row.get("id") == listing_id), None)
        if not listing:
            raise NotFoundError("listing not found")
        if listing.get("status") != "active":
            raise ConflictError("listing is not active")
        if listing.get("farmer_id") == buyer_id:
            raise ForbiddenError("buyer cannot place offer on own listing")

        record = {
            "id": str(uuid4()),
            "listing_id": listing_id,
            "buyer_id": buyer_id,
            "farmer_id": listing.get("farmer_id"),
            "offered_price": float(offered_price),
            "counter_price": None,
            "accepted_price": None,
            "status": "pending",
            "created_at": _now().isoformat(),
            "updated_at": _now().isoformat(),
        }
        append_record("offers.json", record)

        notification = {
            "id": str(uuid4()),
            "user_id": listing.get("farmer_id"),
            "message": f"New offer on listing {listing_id}",
            "read": False,
            "created_at": _now().isoformat(),
        }
        append_record("notifications.json", notification)
        audit_log("OFFER_CREATED", "offer", record["id"], buyer_id, None, record)
        return record

    @staticmethod
    def transition(offer_id, new_status, user_id, counter_price=None):
        offers = read_store("offers.json")
        offer = next((row for row in offers if row.get("id") == offer_id), None)
        if not offer:
            raise NotFoundError("offer not found")

        current_status = offer.get("status")
        if current_status == new_status:
            raise ConflictError("offer is already in requested state")
        if current_status not in OfferService.VALID_TRANSITIONS:
            raise ValidationError("offer is in terminal state")
        if new_status not in OfferService.VALID_TRANSITIONS[current_status]:
            raise ValidationError("invalid state transition")

        if user_id != offer.get("farmer_id"):
            raise ForbiddenError("only listing farmer can change offer status")

        updates = {"status": new_status}
        if new_status == "countered":
            if counter_price is None or counter_price <= 0:
                raise ValidationError("counter_price must be greater than 0")
            updates["counter_price"] = float(counter_price)
        if new_status == "accepted":
            updates["accepted_price"] = float(counter_price or offer.get("counter_price") or offer.get("offered_price"))

        old = dict(offer)
        updated = update_record("offers.json", offer_id, updates)
        audit_log(f"OFFER_{new_status.upper()}", "offer", offer_id, user_id, old, updated)
        return updated


class TransactionService:
    @staticmethod
    def finalize(offer_id, user_id) -> dict:
        offer = next((row for row in read_store("offers.json") if row.get("id") == offer_id), None)
        if not offer:
            raise NotFoundError("offer not found")
        if offer.get("status") != "accepted":
            raise ValidationError("offer status must be accepted")
        if user_id not in {offer.get("farmer_id"), offer.get("buyer_id")}:
            raise ForbiddenError("user cannot finalize this offer")

        existing = next((row for row in read_store("transactions.json") if row.get("offer_id") == offer_id), None)
        if existing:
            raise ConflictError("transaction already exists for this offer")

        listing = next((row for row in read_store("listings.json") if row.get("id") == offer.get("listing_id")), None)
        if not listing:
            raise NotFoundError("listing not found")

        deal_value = float(offer.get("accepted_price") or offer.get("counter_price") or offer.get("offered_price"))
        commission = calculate_commission(deal_value)

        transaction = {
            "id": str(uuid4()),
            "offer_id": offer_id,
            "listing_id": offer.get("listing_id"),
            "farmer_id": offer.get("farmer_id"),
            "buyer_id": offer.get("buyer_id"),
            "deal_value": deal_value,
            "commission": commission,
            "created_at": _now().isoformat(),
        }
        append_record("transactions.json", transaction)
        update_record("listings.json", listing.get("id"), {"status": "sold"})
        audit_log("TRANSACTION_COMPLETED", "transaction", transaction["id"], user_id, None, transaction)
        return transaction


class MarketRateService:
    @staticmethod
    def create(user_id: str, crop: str, city: str, price_per_quintal: float, recorded_at: str | None = None) -> dict:
        if city not in VALID_CITIES:
            raise ValidationError("city must be a valid Maharashtra city")
        if crop not in VALID_CROPS:
            raise ValidationError("crop_name must be a supported crop")
        if price_per_quintal <= 0:
            raise ValidationError("price_per_quintal must be greater than 0")
        if price_per_quintal > 50000:
            raise ValidationError("price_per_quintal outlier")

        now = _now()
        at = _parse_time(recorded_at) or now
        for rate in read_store("market_rates.json"):
            rate_at = _parse_time(rate.get("recorded_at"))
            if (
                rate.get("user_id") == user_id
                and rate.get("crop") == crop
                and rate.get("city") == city
                and rate_at
                and at - rate_at <= timedelta(hours=1)
                and at >= rate_at
            ):
                raise RateLimitError("duplicate market rate within 1 hour")

        record = {
            "id": str(uuid4()),
            "user_id": user_id,
            "crop": crop,
            "city": city,
            "price_per_quintal": float(price_per_quintal),
            "recorded_at": at.isoformat(),
            "created_at": now.isoformat(),
        }
        append_record("market_rates.json", record)
        audit_log("MARKET_RATE_REPORTED", "market_rate", record["id"], user_id, None, record)
        return record

    @staticmethod
    def list_rates(crop: str | None = None, city: str | None = None) -> dict:
        rates = read_store("market_rates.json")
        if crop:
            rates = [row for row in rates if row.get("crop") == crop]
        if city:
            rates = [row for row in rates if row.get("city") == city]
        rates.sort(key=lambda row: row.get("recorded_at", ""), reverse=True)

        cutoff = _now() - timedelta(days=7)
        scoped = [
            row for row in rates
            if _parse_time(row.get("recorded_at")) and _parse_time(row.get("recorded_at")) >= cutoff
        ]
        average = round(sum(float(row.get("price_per_quintal", 0)) for row in scoped) / len(scoped), 2) if scoped else 0.0
        return {"items": rates, "average_price_per_quintal": average}
