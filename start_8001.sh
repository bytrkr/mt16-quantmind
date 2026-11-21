#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -x "/home/bytrkr/bistapp/.venv/bin/python" ]; then
  PY_BIN="/home/bytrkr/bistapp/.venv/bin/python"
else
  PY_BIN="python3"
fi
exec "$PY_BIN" -m uvicorn python.api_server:app --host 127.0.0.1 --port 8001
