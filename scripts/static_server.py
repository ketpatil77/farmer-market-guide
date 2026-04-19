#!/usr/bin/env python3
from __future__ import annotations

import argparse
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


HOST = "0.0.0.0"
DEFAULT_PORT = 8000


class NoCacheStaticHandler(BaseHTTPRequestHandler):
    server_version = "NoCacheStaticServer/1.0"
    protocol_version = "HTTP/1.1"

    def do_GET(self) -> None:
        self._serve(send_body=True)

    def do_HEAD(self) -> None:
        self._serve(send_body=False)

    def _serve(self, send_body: bool) -> None:
        root = Path(os.getcwd()).resolve()
        request_path = urlsplit(self.path).path or "/"
        relative = unquote(request_path).lstrip("/")
        fs_path = (root / relative).resolve()

        if fs_path.is_dir():
            fs_path = fs_path / "index.html"

        if fs_path != root and root not in fs_path.parents:
            self._respond_error(403, b"Forbidden")
            return

        if not fs_path.exists() or not fs_path.is_file():
            self._respond_error(404, b"Not found")
            return

        try:
            body = fs_path.read_bytes()
        except OSError:
            self._respond_error(500, b"Unable to read file")
            return

        content_type = mimetypes.guess_type(str(fs_path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        if send_body:
            self.wfile.write(body)

    def _respond_error(self, status: int, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Static file server with no-cache headers.")
    parser.add_argument("port", nargs="?", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    with ThreadingHTTPServer((HOST, args.port), NoCacheStaticHandler) as httpd:
        print(f"No-cache static server running at http://localhost:{args.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
