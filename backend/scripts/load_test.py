#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
import threading
import time
from urllib import request

import httpx


def _listen(sse_url: str, expected: str, out: list[float], stop: threading.Event) -> None:
    try:
        with request.urlopen(sse_url, timeout=15) as resp:
            while not stop.is_set():
                line = resp.readline()
                if not line:
                    continue
                txt = line.decode("utf-8", errors="ignore").strip()
                if not txt.startswith("data:"):
                    continue
                payload = json.loads(txt[5:].strip())
                if payload.get("event") == expected:
                    out.append(time.perf_counter())
    except Exception:
        return


async def run(api_base: str, sse_base: str) -> dict:
    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        jobs = []
        for i in range(50):
            jobs.append(
                client.get(f"{api_base}/listings", params={"page": 1, "limit": 10})
            )
        responses = await asyncio.gather(*jobs, return_exceptions=True)

    http_errors = sum(1 for r in responses if not isinstance(r, httpx.Response) or r.status_code != 200)

    sse_url = f"{sse_base}/events"
    publish_url = f"{sse_base}/publish"
    received: list[float] = []
    stop = threading.Event()
    listeners = [threading.Thread(target=_listen, args=(sse_url, "load", received, stop), daemon=True) for _ in range(20)]
    for t in listeners:
        t.start()

    time.sleep(1)
    sent_at = time.perf_counter()
    for _ in range(10):
        req = request.Request(
            publish_url,
            data=json.dumps({"event": "load", "value": 1}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        request.urlopen(req, timeout=5).read()

    deadline = time.perf_counter() + 8
    while time.perf_counter() < deadline and len(received) < 200:
        time.sleep(0.05)

    stop.set()
    latencies = [(t - sent_at) * 1000 for t in received]

    total_ops = 50
    errors = http_errors
    return {
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 9999.0,
        "error_rate": round(errors / total_ops, 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-base", default="http://localhost:8000/api")
    parser.add_argument("--sse-base", default="http://localhost:8080")
    args = parser.parse_args()

    results = asyncio.run(run(args.api_base.rstrip("/"), args.sse_base.rstrip("/")))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
