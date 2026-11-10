#!/usr/bin/env bash
# Sobe o site localmente em http://localhost:8080 (Linux/macOS)
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8080}"
( sleep 1; command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT/" || open "http://localhost:$PORT/" 2>/dev/null ) &
exec python3 -m http.server "$PORT"
