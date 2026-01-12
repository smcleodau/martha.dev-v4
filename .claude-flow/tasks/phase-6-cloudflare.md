# Phase 6: Cloudflare Integration

## Goal
Port Python CloudflareManager to TypeScript and implement automated tunnel provisioning for worktrees.

## Context
- Reference implementation: `/mnt/data/martha.dev-v4/service/cloudflare_manager.py` (895 lines)
- Current tunnels: martha.arch.ie (port 21004), martha-api.arch.ie (port 21000)
- Need to automate tunnel creation for new worktrees

## Tasks

### 1. Implement Cloudflare API Client (`src/integrations/cloudflare/api-client.ts`)

**Requirements:**
- Axios-based HTTP client for Cloudflare API
- Authentication with API token
- Endpoints:
  - `POST /accounts/:account_id/cfd_tunnel` - Create tunnel
  - `GET /accounts/:account_id/cfd_tunnel/:tunnel_id` - Get tunnel details
  - `DELETE /accounts/:account_id/cfd_tunnel/:tunnel_id` - Delete tunnel
  - `GET /accounts/:account_id/cfd_tunnel/:tunnel_id/connections` - Get tunnel connections
  - `POST /zones/:zone_id/dns_records` - Create DNS record
  - `DELETE /zones/:zone_id/dns_records/:record_id` - Delete DNS record
  - `GET /zones/:zone_id/dns_records` - List DNS records
- Error handling for API failures
- Rate limiting respect
- TypeScript interfaces for all responses

**Reference:**
```python
# From cloudflare_manager.py lines 100-200
def create_tunnel(self, name: str) -> Dict:
    response = requests.post(
        f"{self.api_base}/accounts/{self.account_id}/cfd_tunnel",
        headers=self.headers,
        json={"name": name}
    )
    return response.json()
```

### 2. Implement Tunnel Manager (`src/integrations/cloudflare/tunnel-manager.ts`)

**Requirements:**
- TunnelManager class with methods:
  - `createTunnel(name: string)` - Create tunnel and credentials
  - `deleteTunnel(tunnelId: string)` - Delete tunnel
  - `startTunnelDaemon(tunnelId: string, port: number)` - Start cloudflared daemon
  - `stopTunnelDaemon(tunnelId: string)` - Stop daemon
  - `getTunnelStatus(tunnelId: string)` - Check if tunnel is running
  - `listTunnels()` - List all tunnels
- Credential file management (`~/.cloudflared/`)
- Config file generation for each tunnel
- PID tracking for daemon processes
- Automatic credential cleanup on deletion
- Singleton pattern for shared instance

**Daemon Management:**
```typescript
// Use child_process.spawn for cloudflared
const daemon = spawn('cloudflared', [
  'tunnel',
  '--config', configPath,
  'run',
  tunnelId
], { detached: true, stdio: 'ignore' });

// Store PID in database or file
await fs.writeFile(`/tmp/cloudflared-${tunnelId}.pid`, daemon.pid);
```

### 3. Implement DNS Manager (`src/integrations/cloudflare/dns-manager.ts`)

**Requirements:**
- DNSManager class with methods:
  - `createDNSRecord(hostname: string, tunnelId: string)` - Create CNAME to tunnel
  - `deleteDNSRecord(hostname: string)` - Delete DNS record
  - `listDNSRecords()` - List all DNS records
  - `findRecordByHostname(hostname: string)` - Find specific record
- CNAME record format: `{tunnelId}.cfargotunnel.com`
- Proxied mode enabled by default
- TTL management
- Error handling for existing records

### 4. Implement MCP Tunnel Tools (`src/mcp/tools/tunnel-tools.ts`)

**Requirements:**
- Two MCP tools:

**Tool 1: `martha__tunnel__provision`**
```typescript
{
  name: 'martha__tunnel__provision',
  description: 'Provision Cloudflare tunnel for a worktree',
  inputSchema: {
    type: 'object',
    properties: {
      worktree_name: { type: 'string', description: 'Worktree name' },
      port: { type: 'number', description: 'Local port to expose' },
      subdomain: { type: 'string', description: 'Optional custom subdomain' }
    },
    required: ['worktree_name', 'port']
  }
}
```

Actions:
1. Create tunnel: `{worktree_name}-tunnel`
2. Generate hostname: `{worktree_name}.martha.arch.ie` or custom
3. Create DNS record
4. Start tunnel daemon
5. Store tunnel info in database
6. Return tunnel URL and status

**Tool 2: `martha__tunnel__destroy`**
```typescript
{
  name: 'martha__tunnel__destroy',
  description: 'Destroy Cloudflare tunnel for a worktree',
  inputSchema: {
    type: 'object',
    properties: {
      worktree_name: { type: 'string', description: 'Worktree name' }
    },
    required: ['worktree_name']
  }
}
```

Actions:
1. Stop tunnel daemon
2. Delete DNS record
3. Delete tunnel from Cloudflare
4. Remove credentials file
5. Update database
6. Return confirmation

### 5. Database Schema Updates

Add tunnel tracking to worktrees table:
```sql
ALTER TABLE ts_martha.worktrees ADD COLUMN tunnel JSONB;

-- Example structure:
{
  "tunnel_id": "abc-123",
  "tunnel_name": "excel-sidebar-tunnel",
  "hostname": "excel-sidebar.martha.arch.ie",
  "port": 22000,
  "status": "running",
  "daemon_pid": 12345,
  "created_at": "2026-01-12T..."
}
```

### 6. Integration with Worktree Creation

Update `martha__worktree__create` to call tunnel provisioning:
```typescript
// In worktree creation flow:
1. Allocate port
2. Create git worktree
3. Generate .env.local
4. **Provision tunnel** <- NEW
5. Start monitoring agent
6. Return worktree info with tunnel URL
```

## Testing

### Unit Tests
- API client methods
- Tunnel manager operations
- DNS record creation/deletion
- Config file generation

### Integration Tests
- Create tunnel end-to-end
- Start/stop daemon
- Verify DNS propagation
- Delete tunnel cleanup

### Manual Testing
```bash
# Test MCP tool
echo '{"worktree_name": "test-worktree", "port": 22000}' | \
  node dist/mcp/server.js --tool martha__tunnel__provision

# Verify tunnel
curl https://test-worktree.martha.arch.ie/health

# Cleanup
echo '{"worktree_name": "test-worktree"}' | \
  node dist/mcp/server.js --tool martha__tunnel__destroy
```

## Configuration Requirements

```bash
# Required environment variables
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_ZONE_ID="your-zone-id"
export CLOUDFLARE_DOMAIN="martha.arch.ie"
```

## Success Criteria

- [ ] All TypeScript compiles without errors
- [ ] Can create tunnel via API
- [ ] Daemon starts and maintains connection
- [ ] DNS record created and resolves
- [ ] MCP tools work end-to-end
- [ ] Cleanup removes all resources
- [ ] Integration with worktree creation works

## Files to Create

1. `src/integrations/cloudflare/api-client.ts` (~200 lines)
2. `src/integrations/cloudflare/tunnel-manager.ts` (~400 lines)
3. `src/integrations/cloudflare/dns-manager.ts` (~200 lines)
4. `src/mcp/tools/tunnel-tools.ts` (~300 lines)
5. `tests/unit/cloudflare/*.test.ts` (~200 lines)

**Total:** ~1,300 lines of code

## Commit Message Template

```
Implement Phase 6: Cloudflare tunnel integration

Created automated tunnel provisioning system:
- CloudflareAPI client with full CRUD operations
- TunnelManager for tunnel lifecycle management
- DNSManager for DNS record automation
- 2 MCP tools: provision and destroy tunnels
- Integration with worktree creation workflow

Enables automatic public URLs for new worktrees.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```
