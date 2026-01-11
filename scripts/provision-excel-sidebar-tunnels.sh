#!/bin/bash
set -e

# Provision Cloudflare Tunnels for Excel Sidebar
# Automatically creates:
# - excel-sidebar-api.arch.ie → localhost:5002
# - excel-sidebar-ws.arch.ie → localhost:5002/ws
# - excel-sidebar-web.arch.ie → localhost:5004

SERVICE_URL=${SERVICE_URL:-http://localhost:9000}
WORKTREE="excel-sidebar-epics"

echo "🌐 Provisioning Cloudflare tunnels for $WORKTREE"
echo "================================================"
echo ""

# Check service is running
if ! curl -sf "$SERVICE_URL/health" > /dev/null 2>&1; then
    echo "❌ Monitoring service not running at $SERVICE_URL"
    echo "   Start it with: cd service && python service.py"
    exit 1
fi

echo "✅ Service is running"
echo ""

# Provision tunnels
echo "📡 Creating tunnels via API..."
RESPONSE=$(curl -sf -X POST "$SERVICE_URL/api/v1/worktrees/$WORKTREE/tunnels/provision" \
    -H "Content-Type: application/json" \
    2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to provision tunnels"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ Tunnels provisioned successfully!"
echo ""

# Parse and display URLs
API_URL=$(echo "$RESPONSE" | jq -r '.urls.api // empty')
WS_URL=$(echo "$RESPONSE" | jq -r '.urls.ws // empty')
WEB_URL=$(echo "$RESPONSE" | jq -r '.urls.web // empty')

echo "🎉 Excel Sidebar External URLs:"
echo "================================"
echo ""
echo "  📡 API:       $API_URL"
echo "  🔌 WebSocket: $WS_URL"
echo "  🌐 Frontend:  $WEB_URL"
echo ""

# Start tunnel
echo "🚀 Starting tunnel..."
START_RESPONSE=$(curl -sf -X POST "$SERVICE_URL/api/v1/worktrees/$WORKTREE/tunnels/start" 2>&1)

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Could not start tunnel automatically"
    echo "$START_RESPONSE"
    echo ""
    echo "Start manually with:"
    echo "  curl -X POST $SERVICE_URL/api/v1/worktrees/$WORKTREE/tunnels/start"
else
    echo "✅ Tunnel started!"
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Update Excel plugin .env.local:"
echo "   REACT_APP_API_URL=$API_URL"
echo "   REACT_APP_WS_URL=$WS_URL"
echo ""
echo "2. Restart Excel plugin development server"
echo ""
echo "3. Test access from anywhere:"
echo "   curl $API_URL/health"
echo ""
echo "4. Check tunnel status:"
echo "   curl $SERVICE_URL/api/v1/worktrees/$WORKTREE/tunnels/status"
echo ""
echo "5. View tunnel logs:"
echo "   tail -f ~/.claude/worktree-monitor/tunnels/$WORKTREE-tunnel.log"
echo ""
