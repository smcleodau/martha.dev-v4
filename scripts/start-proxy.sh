#!/bin/bash
# Start Martha proxy for Cloudflare tunnel compatibility
# Routes port 21004 -> 20000

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROXY_FILE="$SCRIPT_DIR/martha-proxy.js"
LOG_FILE="/tmp/martha-proxy.log"
PID_FILE="/tmp/martha-proxy.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "Proxy already running (PID: $PID)"
        exit 0
    fi
fi

# Start proxy
echo "Starting Martha proxy (21004 -> 20000)..."
nohup node "$PROXY_FILE" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 2

# Verify it started
if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
    echo "✓ Proxy started (PID: $(cat "$PID_FILE"))"
    echo "  Logs: $LOG_FILE"
    curl -s http://localhost:21004/health | jq -r '.status' && echo "  Status: healthy"
else
    echo "✗ Failed to start proxy"
    exit 1
fi
