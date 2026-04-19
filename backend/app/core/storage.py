import json
from datetime import datetime
from pathlib import Path
from threading import Lock

from app.core.config import settings


DATA_DIR = Path(settings.data_dir)
DATA_DIR.mkdir(exist_ok=True)

DATA_FILES = [
    "listings.json",
    "offers.json",
    "transactions.json",
    "market_rates.json",
    "audit_log.json",
    "users.json",
    "notifications.json",
]

_locks: dict[str, Lock] = {}


def _lock(filename: str) -> Lock:
    if filename not in _locks:
        _locks[filename] = Lock()
    return _locks[filename]


def ensure_data_files() -> None:
    for filename in DATA_FILES:
        path = DATA_DIR / filename
        if not path.exists():
            write_store(filename, [])


def read_store(filename: str) -> list:
    path = DATA_DIR / filename
    with _lock(filename):
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
            return data if isinstance(data, list) else []


def write_store(filename: str, data: list) -> None:
    path = DATA_DIR / filename
    with _lock(filename):
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, default=str)


def append_record(filename: str, record: dict) -> None:
    records = read_store(filename)
    records.append(record)
    write_store(filename, records)


def update_record(filename: str, record_id: str, updates: dict) -> dict | None:
    records = read_store(filename)
    updated: dict | None = None
    for record in records:
        if record.get("id") == record_id:
            record.update(updates)
            record["updated_at"] = datetime.utcnow().isoformat()
            updated = record
            break
    write_store(filename, records)
    return updated


def find_record(filename: str, **kwargs) -> dict | None:
    for record in read_store(filename):
        if all(record.get(key) == value for key, value in kwargs.items()):
            return record
    return None
