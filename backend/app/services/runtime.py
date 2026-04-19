from threading import Lock


_started_sse_clients = 0
_lock = Lock()


def set_sse_clients(count: int) -> None:
    global _started_sse_clients
    with _lock:
        _started_sse_clients = max(0, int(count))


def get_sse_clients() -> int:
    with _lock:
        return _started_sse_clients
