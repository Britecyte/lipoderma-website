#!/usr/bin/env python3
"""Serve the New V3 static site from this folder (site root = /)."""
from __future__ import annotations

import http.server
import os
import socket
import socketserver
from urllib.parse import unquote

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


def local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        decoded = unquote(self.path.split("?", 1)[0]).lower()
        if "new v3" in decoded or "new%20v3" in self.path.lower():
            self.send_response(301)
            self.send_header("Location", "/")
            self.end_headers()
            return
        super().do_GET()


if __name__ == "__main__":
    ip = local_ip()
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving New V3 at http://127.0.0.1:{PORT}/")
        print(f"On your phone (same Wi‑Fi): http://{ip}:{PORT}/")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()
