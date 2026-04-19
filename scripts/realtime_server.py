#!/usr/bin/env python3
from __future__ import annotations

import json
import logging
import os
import queue
import threading
import time
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import Request, urlopen


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger("realtime")

HEARTBEAT_INTERVAL = 15
HOST = "0.0.0.0"
PORT = int(os.getenv("FARMA_REALTIME_PORT", "8765"))
API_NINJAS_ENDPOINT = "https://api.api-ninjas.com/v1/commodityprice"

COMMODITY_BASELINES = {
    "WHEAT": 28.0,
    "RICE": 34.0,
    "ONION": 24.0,
    "TOMATO": 22.0,
    "COTTON": 62.0,
    "SOYBEAN": 46.0,
    "MAIZE": 27.0,
    "TUR": 95.0,
    "POTATO": 18.0,
}

COMMODITY_API_NAMES = {
    "WHEAT": "Wheat",
    "RICE": "Rice",
    "ONION": "Onion",
    "TOMATO": "Tomato",
    "COTTON": "Cotton",
    "SOYBEAN": "Soybean",
    "MAIZE": "Corn",
    "TUR": "Pigeon Pea",
    "POTATO": "Potato",
}

_clients: list[queue.Queue[str]] = []
_clients_lock = threading.Lock()


def _log(event_type: str) -> None:
    with _clients_lock:
        client_count = len(_clients)
    logger.info("event_type=%s client_count=%s", event_type, client_count)


def _add_client() -> queue.Queue[str]:
    channel: queue.Queue[str] = queue.Queue(maxsize=200)
    with _clients_lock:
        _clients.append(channel)
    _log("client_connected")
    return channel


def _remove_client(channel: queue.Queue[str]) -> None:
    with _clients_lock:
        if channel in _clients:
            _clients.remove(channel)
    _log("client_disconnected")


def _broadcast(payload: dict) -> int:
    message = f"data: {json.dumps(payload, separators=(',', ':'))}\n\n"
    dead: list[queue.Queue[str]] = []
    with _clients_lock:
        snapshot = list(_clients)
    for channel in snapshot:
        try:
            channel.put_nowait(message)
        except queue.Full:
            dead.append(channel)
    for channel in dead:
        _remove_client(channel)
    _log(payload.get("event", "publish"))
    return len(snapshot) - len(dead)


def _normalize_commodity(token: str) -> str:
    return str(token or "").strip().upper().replace(" ", "_")


def _safe_float(value) -> float | None:
    try:
        num = float(value)
        if num > 0:
            return num
    except (TypeError, ValueError):
        pass
    return None


def _fallback_price(token: str, city: str = "") -> float:
    base = COMMODITY_BASELINES.get(token, 30.0 + (sum(ord(c) for c in token) % 35))
    city_score = sum(ord(c) for c in city.lower()) % 11 if city else 0
    city_adjust = ((city_score - 5) / 100.0)
    day_adjust = ((datetime.now(UTC).timetuple().tm_yday % 7) - 3) / 120.0
    price = base * (1.0 + city_adjust + day_adjust)
    return round(max(1.0, price), 2)


def _extract_price(payload) -> float | None:
    if isinstance(payload, list):
        for item in payload:
            price = _extract_price(item)
            if price:
                return price
        return None
    if isinstance(payload, dict):
        for key in ("price", "latest_price", "close", "value"):
            price = _safe_float(payload.get(key))
            if price:
                return price
    return None


def _fetch_live_price(token: str) -> tuple[float | None, str | None]:
    api_key = os.getenv("API_NINJAS_KEY", "").strip()
    if not api_key:
        return None, "API_NINJAS_KEY missing"
    name = COMMODITY_API_NAMES.get(token, token.replace("_", " ").title())
    req = Request(
        f"{API_NINJAS_ENDPOINT}?name={quote(name)}",
        headers={"X-Api-Key": api_key, "Accept": "application/json"},
        method="GET",
    )
    try:
        with urlopen(req, timeout=6) as response:
            if response.status != 200:
                return None, f"API Ninjas HTTP {response.status}"
            payload = json.loads(response.read().decode("utf-8"))
            price = _extract_price(payload)
            if not price:
                return None, "No numeric price in API response"
            return round(price, 2), None
    except Exception as exc:
        return None, str(exc)


def _build_external_prices(commodities: list[str], city: str = "") -> dict:
    prices: list[dict] = []
    errors: list[str] = []
    live_count = 0
    for raw in commodities:
        token = _normalize_commodity(raw)
        if not token:
            continue
        live_price, err = _fetch_live_price(token)
        if live_price:
            prices.append(
                {
                    "commodity": token,
                    "price": live_price,
                    "unit": "kg",
                    "live": True,
                    "source": "api_ninjas",
                }
            )
            live_count += 1
            continue
        prices.append(
            {
                "commodity": token,
                "price": _fallback_price(token, city),
                "unit": "kg",
                "live": False,
                "source": "internal_fallback",
            }
        )
        if err:
            errors.append(f"{token}: {err}")
    source = "live" if live_count == len(prices) else ("fallback" if live_count == 0 else "hybrid")
    return {"source": source, "prices": prices, "errors": errors[:3]}


def _build_recommendation(city: str, crop: str, external_commodity: str = "") -> dict:
    token = _normalize_commodity(external_commodity or crop)
    live_price, live_err = _fetch_live_price(token)
    external_price = live_price if live_price else _fallback_price(token, city)
    local_estimate = _fallback_price(token, city) * 0.96
    recommended = round((external_price * 0.6) + (local_estimate * 0.4), 2)
    source = "live" if live_price else "fallback"
    explanation = (
        f"Recommended ₹{recommended:.2f}/kg based on 60% external benchmark and 40% local trend "
        f"for {city or 'selected city'} ({token})."
    )
    return {
        "price": recommended,
        "source": source,
        "external_price": round(external_price, 2),
        "local_estimate": round(local_estimate, 2),
        "explanation": explanation,
        "errors": [] if live_price else ([f"Live feed unavailable: {live_err}"] if live_err else []),
    }


class ReusableThreadingServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class RealtimeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        split = urlsplit(self.path)
        path = split.path
        query = parse_qs(split.query)
        if path == "/health":
            with _clients_lock:
                clients = len(_clients)
            self._json(200, {"status": "ok", "sse_clients": clients, "timestamp": datetime.utcnow().isoformat()})
            return
        if path == "/api/v1/external-prices":
            raw = query.get("commodities", ["WHEAT,RICE,ONION"])[0]
            commodities = [part for part in str(raw).split(",") if part.strip()]
            city = query.get("city", [""])[0]
            self._json(200, _build_external_prices(commodities, city))
            return
        if path == "/api/v1/price-recommendation":
            city = str(query.get("city", [""])[0] or "")
            crop = str(query.get("crop", [""])[0] or "")
            if not crop:
                self._json(400, {"detail": "crop is required"})
                return
            external_commodity = str(query.get("externalCommodity", [""])[0] or "")
            self._json(200, _build_recommendation(city, crop, external_commodity))
            return
        if path != "/events":
            self._json(404, {"detail": "Not found"})
            return

        channel = _add_client()
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        try:
            ready = {"event": "connected", "timestamp": datetime.utcnow().isoformat()}
            self.wfile.write(f"data: {json.dumps(ready)}\n\n".encode("utf-8"))
            self.wfile.flush()
            last_heartbeat = time.monotonic()
            while True:
                try:
                    item = channel.get(timeout=1)
                    self.wfile.write(item.encode("utf-8"))
                    self.wfile.flush()
                except queue.Empty:
                    pass

                if time.monotonic() - last_heartbeat >= HEARTBEAT_INTERVAL:
                    heartbeat = {"event": "heartbeat", "timestamp": datetime.utcnow().isoformat()}
                    self.wfile.write(f"data: {json.dumps(heartbeat)}\n\n".encode("utf-8"))
                    self.wfile.flush()
                    last_heartbeat = time.monotonic()
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        finally:
            _remove_client(channel)

    def do_POST(self) -> None:
        if self.path != "/publish":
            self._json(404, {"detail": "Not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("invalid payload")
        except Exception:
            self._json(400, {"detail": "Invalid JSON payload"})
            return

        if "event" not in payload and "eventName" in payload:
            payload["event"] = payload["eventName"]
        payload.setdefault("timestamp", datetime.utcnow().isoformat())
        delivered = _broadcast(payload)
        self._json(200, {"ok": True, "delivered": delivered})


def main() -> None:
    server = ReusableThreadingServer((HOST, PORT), RealtimeHandler)
    _log("server_start")
    server.serve_forever()


if __name__ == "__main__":
    main()
