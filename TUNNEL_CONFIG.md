# Martha TypeScript - Cloudflare Tunnel Configuration

## Required Tunnels

### 1. Frontend Dashboard
- **Domain:** martha.arch.ie
- **Port:** 21004
- **Status:** ✅ CONFIGURED & WORKING

### 2. API Service
- **Domain:** martha-api.arch.ie
- **Port:** 21000
- **Status:** 🔄 NEEDS CONFIGURATION

## Quick Setup Commands

### Check Current Tunnels
```bash
cloudflared tunnel list
cloudflared tunnel route dns list
```

### Configure API Tunnel

**Option A: Add route to existing tunnel**
```bash
# If you have an existing tunnel for martha.arch.ie
cloudflared tunnel route dns <tunnel-name-or-id> martha-api.arch.ie
```

**Option B: Update tunnel config file**
Add to your tunnel configuration file (usually `~/.cloudflared/config.yml` or `/etc/cloudflared/config.yml`):

```yaml
tunnel: <your-tunnel-id>
credentials-file: /path/to/credentials.json

ingress:
  # Frontend (existing)
  - hostname: martha.arch.ie
    service: http://localhost:21004

  # API Service (new)
  - hostname: martha-api.arch.ie
    service: http://localhost:21000

  # Catch-all rule (required)
  - service: http_status:404
```

Then restart the tunnel:
```bash
sudo systemctl restart cloudflared
# or
cloudflared tunnel run <tunnel-name>
```

### Verify Configuration

**Test API Access:**
```bash
# Local (should work)
curl http://localhost:21000/health

# Public (after tunnel configured)
curl https://martha-api.arch.ie/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "martha-typescript",
  "version": "3.0.0",
  "worktree": "typescript-rewrite",
  "timestamp": "2026-01-12T..."
}
```

## Port Reference

| Service | Port | Purpose | Public URL |
|---------|------|---------|------------|
| Martha API | 21000 | REST API, WebSocket | martha-api.arch.ie |
| Dashboard | 21004 | React Frontend | martha.arch.ie |
| PostgreSQL | 21005 | Database | (internal only) |
| Redis | 20001 | Cache/Events | (internal only) |
| MCP Server | stdio | Claude Code | (local only) |

## Dashboard Configuration

The dashboard's Vite config already includes the allowed host:

```typescript
// dashboard/vite.config.ts
server: {
  port: 21004,
  allowedHosts: ['martha.arch.ie'], // ✅ Already configured
  proxy: {
    '/api': {
      target: 'http://localhost:21000',
      changeOrigin: true,
    }
  }
}
```

## CORS Configuration

The API service has CORS enabled for the dashboard domain:

```typescript
// src/server/fastify.ts
fastify.register(cors, {
  origin: [
    'http://localhost:21004',
    'https://martha.arch.ie'  // ✅ Frontend domain allowed
  ]
});
```

## Testing After Configuration

### 1. Test API Health
```bash
curl https://martha-api.arch.ie/health
```

### 2. Test API Endpoints
```bash
# List worktrees
curl https://martha-api.arch.ie/api/v1/worktrees

# Get worktree status
curl https://martha-api.arch.ie/api/v1/worktrees/typescript-rewrite

# Get recent events
curl https://martha-api.arch.ie/api/v1/worktrees/typescript-rewrite/events?limit=10
```

### 3. Test Dashboard Access
```bash
# Should load React app
curl https://martha.arch.ie

# Check that API proxy works through dashboard
curl https://martha.arch.ie/api/health
```

## Troubleshooting

### API Returns 502 Bad Gateway
- Check that service is running: `curl http://localhost:21000/health`
- Check tunnel configuration: `cloudflared tunnel info <tunnel-name>`
- Check tunnel logs: `journalctl -u cloudflared -f`

### Dashboard Can't Reach API
- Verify CORS configuration allows dashboard domain
- Check browser console for errors
- Verify API endpoint in dashboard config

### WebSocket Connection Issues
If using WebSocket through tunnel, ensure tunnel config supports WebSocket:
```yaml
ingress:
  - hostname: martha-api.arch.ie
    service: http://localhost:21000
    originRequest:
      noTLSVerify: true  # If using self-signed certs
```

## Security Notes

- API is currently configured for development (no authentication)
- Dashboard displays configuration (sensitive values masked)
- PostgreSQL and Redis are internal only (not exposed via tunnel)
- GitHub token should be set via environment variable (never committed)

## Next Steps After Configuration

Once `martha-api.arch.ie` is configured:

1. ✅ Test all API endpoints from public URL
2. ✅ Verify dashboard can connect to API
3. ✅ Test MCP tools (they use localhost:21000, so no changes needed)
4. 🚀 Continue with Phase 6: Cloudflare integration implementation
5. 🚀 Implement tunnel provisioning automation for new worktrees
