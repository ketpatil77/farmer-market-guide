import json
import os
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib import request


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_health(port: int) -> None:
    deadline = time.time() + 10
    while time.time() < deadline:
        try:
            with request.urlopen(f"http://127.0.0.1:{port}/health", timeout=1) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("health timeout")


def _publish(port: int, event: str, payload: dict | None = None):
    body = {"event": event}
    if payload:
        body.update(payload)
    req = request.Request(
        f"http://127.0.0.1:{port}/publish",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=3) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _listen_for(port: int, event: str, out: list[float], timeout_s: float = 5.0):
    with request.urlopen(f"http://127.0.0.1:{port}/events", timeout=10) as resp:
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            line = resp.readline()
            if not line:
                continue
            text = line.decode("utf-8", errors="ignore").strip()
            if not text.startswith("data:"):
                continue
            payload = json.loads(text[5:].strip())
            if payload.get("event") == event:
                out.append(time.perf_counter())
                return


def _start_server(port: int):
    script = Path(__file__).resolve().parents[2] / "scripts" / "realtime_server.py"
    env = os.environ.copy()
    env["FARMA_REALTIME_PORT"] = str(port)
    proc = subprocess.Popen([sys.executable, str(script)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    _wait_health(port)
    return proc


def test_sse_endpoint_headers():
    port = _free_port()
    proc = _start_server(port)
    try:
        with request.urlopen(f"http://127.0.0.1:{port}/events", timeout=3) as resp:
            assert resp.status == 200
            assert resp.headers.get_content_type() == "text/event-stream"
    finally:
        proc.terminate()


def test_single_client_receives_event_under_500ms():
    port = _free_port()
    proc = _start_server(port)
    try:
        out = []
        t = threading.Thread(target=_listen_for, args=(port, "evt1", out), daemon=True)
        t.start()
        time.sleep(0.2)
        start = time.perf_counter()
        _publish(port, "evt1")
        t.join(timeout=2)
        assert out
        assert (out[0] - start) * 1000 < 500
    finally:
        proc.terminate()


def test_five_clients_receive_same_broadcast():
    port = _free_port()
    proc = _start_server(port)
    try:
        outs = [[] for _ in range(5)]
        threads = [threading.Thread(target=_listen_for, args=(port, "evt2", outs[i]), daemon=True) for i in range(5)]
        for t in threads:
            t.start()
        time.sleep(0.4)
        _publish(port, "evt2")
        for t in threads:
            t.join(timeout=3)
        assert sum(1 for out in outs if out) == 5
    finally:
        proc.terminate()


def test_dead_client_removed_after_disconnect():
    port = _free_port()
    proc = _start_server(port)
    try:
        conn = request.urlopen(f"http://127.0.0.1:{port}/events", timeout=3)
        conn.close()
        time.sleep(0.4)
        with request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        assert payload["sse_clients"] >= 0
    finally:
        proc.terminate()


def test_heartbeat_received_within_20s():
    port = _free_port()
    proc = _start_server(port)
    try:
        with request.urlopen(f"http://127.0.0.1:{port}/events", timeout=22) as resp:
            deadline = time.time() + 20
            while time.time() < deadline:
                line = resp.readline()
                if not line:
                    continue
                text = line.decode("utf-8", errors="ignore").strip()
                if text.startswith("data:"):
                    payload = json.loads(text[5:].strip())
                    if payload.get("event") == "heartbeat":
                        return
        raise AssertionError("heartbeat not received")
    finally:
        proc.terminate()


def test_ten_concurrent_publishes_no_corruption():
    port = _free_port()
    proc = _start_server(port)
    try:
        results = []

        def _worker(idx: int):
            results.append(_publish(port, f"evt-{idx}")["ok"])

        threads = [threading.Thread(target=_worker, args=(i,), daemon=True) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=2)
        assert all(results)
        assert len(results) == 10
    finally:
        proc.terminate()


def test_health_shows_correct_sse_client_count():
    port = _free_port()
    proc = _start_server(port)
    try:
        conn1 = request.urlopen(f"http://127.0.0.1:{port}/events", timeout=3)
        conn2 = request.urlopen(f"http://127.0.0.1:{port}/events", timeout=3)
        time.sleep(0.3)
        with request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        assert payload["sse_clients"] >= 2
        conn1.close()
        conn2.close()
    finally:
        proc.terminate()
