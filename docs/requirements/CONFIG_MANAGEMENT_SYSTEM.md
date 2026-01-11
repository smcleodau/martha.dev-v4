# Martha.dev Configuration Management System - Requirements

## Document Purpose

This document specifies requirements for a future configuration management system where Martha can deploy, enforce, and view worktree configurations via API.

**Status:** Requirements gathering
**Priority:** High
**Timeline:** 4 weeks implementation
**Created:** 2026-01-11

---

## Problem Statement

### Current State

**Configuration is mostly manual:**
- Edit registry.json manually
- Copy templates and fill in values manually
- Create .env.local by hand
- Create .worktree-config.json by hand
- No validation until agent starts
- Risk of configuration drift between registry and actual worktree files

**Exception:** Cloudflare tunnel provisioning works well via API - it reads registry, creates infrastructure, and writes EXTERNAL_*_URL to .env.local automatically.

### Desired State

**API-driven configuration management:**
- Martha can push configuration to worktrees
- Martha can validate worktree configuration compliance
- Martha can view/inspect worktree configuration
- Martha can detect and fix configuration drift
- Single API call to provision new worktree
- Automatic synchronization between registry and worktree files

---

## Configuration Management Components

### 1. Registry Management API

**Purpose:** CRUD operations on the central registry

**Endpoints:**

```
POST   /api/v1/config/registry/worktrees              # Add worktree to registry
GET    /api/v1/config/registry/worktrees              # List all worktrees in registry
GET    /api/v1/config/registry/worktrees/{name}       # Get worktree config
PUT    /api/v1/config/registry/worktrees/{name}       # Update worktree config
DELETE /api/v1/config/registry/worktrees/{name}       # Remove worktree from registry
POST   /api/v1/config/registry/validate               # Validate entire registry
```

**Example Request:**
```json
POST /api/v1/config/registry/worktrees
{
  "name": "new-feature-branch",
  "index": 8,
  "branch": "feature/new-feature",
  "path": "/mnt/data/archie-platform-v2-worktrees/new-feature",
  "enabled": true,
  "production": false
}
```

**Example Response:**
```json
{
  "status": "created",
  "worktree": {
    "name": "new-feature-branch",
    "index": 8,
    "ports": {
      "postgres": 8000,
      "redis": 8001,
      "api": 8002,
      "pgadmin": 8003,
      "frontend": 8004
    },
    "containers": {
      "postgres": "archie-new-feature-branch-postgres",
      "redis": "archie-new-feature-branch-redis"
    },
    "network": "archie-new-feature-branch-network",
    "volumes": {
      "postgres": "archie-new-feature-branch-postgres-data"
    }
  }
}
```

**Features:**
- Auto-generate ports from index (INDEX × 1000 + offset)
- Auto-generate container names from worktree name
- Auto-generate network and volume names
- Validate no port conflicts before accepting
- Validate no container name conflicts
- Atomic updates with rollback on failure

---

### 2. Configuration Deployment API

**Purpose:** Generate and deploy configuration files to worktrees

**Endpoints:**

```
POST   /api/v1/config/deploy/{worktree}               # Deploy full config to worktree
POST   /api/v1/config/deploy/{worktree}/env           # Deploy .env.local only
POST   /api/v1/config/deploy/{worktree}/worktree-config  # Deploy .worktree-config.json only
POST   /api/v1/config/deploy/{worktree}/docker-compose  # Deploy docker-compose.yml
GET    /api/v1/config/deploy/{worktree}/preview       # Preview what would be deployed
```

**Example Request:**
```json
POST /api/v1/config/deploy/new-feature-branch
{
  "components": ["env", "worktree-config", "docker-compose"],
  "backup": true,
  "validate": true
}
```

**Example Response:**
```json
{
  "status": "deployed",
  "worktree": "new-feature-branch",
  "deployed": {
    ".env.local": {
      "path": "/mnt/data/archie-platform-v2-worktrees/new-feature/.env.local",
      "status": "created",
      "backup": "/mnt/data/archie-platform-v2-worktrees/new-feature/.env.local.backup-20260111-213000"
    },
    ".worktree-config.json": {
      "path": "/mnt/data/archie-platform-v2-worktrees/new-feature/.worktree-config.json",
      "status": "created"
    },
    "docker-compose.yml": {
      "path": "/mnt/data/archie-platform-v2-worktrees/new-feature/docker-compose.yml",
      "status": "updated",
      "backup": "/mnt/data/archie-platform-v2-worktrees/new-feature/docker-compose.yml.backup-20260111-213000"
    }
  },
  "validation": {
    "passed": true,
    "checks": [
      {"check": "port_allocation", "status": "passed"},
      {"check": "container_names", "status": "passed"},
      {"check": "network_isolation", "status": "passed"}
    ]
  }
}
```

**Features:**
- Template-based generation (Jinja2)
- Automatic backups before overwriting files
- Validation before writing files
- Preview mode (dry-run without writing)
- Component-level deployment (can update just .env.local)
- Git safety (never commit .env.local)

---

### 3. Configuration Enforcement API

**Purpose:** Validate that worktree configuration matches registry

**Endpoints:**

```
POST   /api/v1/config/validate/{worktree}             # Validate worktree config
POST   /api/v1/config/validate/all                    # Validate all worktrees
POST   /api/v1/config/enforce/{worktree}              # Fix non-compliant config
GET    /api/v1/config/compliance                      # Get compliance report
```

**Example Response:**
```json
GET /api/v1/config/compliance
{
  "compliant": 4,
  "non_compliant": 2,
  "not_deployed": 1,
  "worktrees": [
    {
      "name": "main-develop",
      "compliance": "compliant",
      "last_checked": "2026-01-11T21:45:00Z"
    },
    {
      "name": "copilot-integration",
      "compliance": "non_compliant",
      "issues": [
        {
          "severity": "error",
          "check": "port_allocation",
          "message": ".env.local has POSTGRES_PORT=5432 but registry specifies 4000",
          "file": ".env.local",
          "line": 20
        }
      ],
      "last_checked": "2026-01-11T21:45:00Z"
    }
  ]
}
```

**Features:**
- Port allocation validation
- Container name validation
- Network isolation validation
- Volume name validation
- Environment variable completeness check
- One-click enforcement to fix drift
- Scheduled compliance checks
- Clear actionable error messages

---

### 4. Configuration Inspection API

**Purpose:** View effective configuration of worktrees

**Endpoints:**

```
GET    /api/v1/config/inspect/{worktree}              # Get full config dump
GET    /api/v1/config/inspect/{worktree}/env          # Get .env.local contents
GET    /api/v1/config/inspect/{worktree}/ports        # Get port allocation
GET    /api/v1/config/inspect/{worktree}/containers   # Get container config
GET    /api/v1/config/diff/{worktree}                 # Diff registry vs actual
```

**Example Response:**
```json
GET /api/v1/config/inspect/main-develop
{
  "worktree": "main-develop",
  "sources": {
    "registry": "/home/archiedev/.martha/registry.json",
    "env": "/mnt/data/archie-platform-v2/.env.local",
    "worktree_config": "/mnt/data/archie-platform-v2/.worktree-config.json",
    "docker_compose": "/mnt/data/archie-platform-v2/docker-compose.yml"
  },
  "effective_config": {
    "index": 1,
    "ports": {
      "postgres": 1000,
      "redis": 1001,
      "api": 1002,
      "pgadmin": 1003,
      "frontend": 1004
    },
    "environment": {
      "COMPOSE_PROJECT_NAME": "archie-main-dev",
      "DATABASE_URL": "postgresql://archie_user:***@localhost:1000/archie_dev"
    },
    "containers": {
      "postgres": {
        "name": "archie-main-dev-postgres-1",
        "status": "running",
        "port_mapping": "1000:5432"
      }
    }
  }
}
```

**Features:**
- Full configuration dump
- Sensitive data masking (passwords hidden)
- Diff between registry and actual files
- Show which files exist vs missing
- Parse and merge all config sources
- No need to SSH and cat files manually

---

### 5. Template Management API

**Purpose:** Manage configuration templates

**Endpoints:**

```
GET    /api/v1/config/templates                       # List available templates
GET    /api/v1/config/templates/{template}            # Get template content
POST   /api/v1/config/templates/{template}/render     # Render template with vars
```

**Templates:**

**.env.local template:**
```jinja2
# ============================================================================
# {{ name }} Worktree Configuration
# Index: {{ index }}
# Port Range: {{ ports.postgres }}-{{ ports.frontend }}
# ============================================================================
# MANAGED BY: Martha Configuration Management
# DO NOT COMMIT THIS FILE
# ============================================================================

WORKTREE_INDEX={{ index }}
WORKTREE_NAME={{ name }}
COMPOSE_PROJECT_NAME={{ compose_project_name }}

# ============================================================================
# Port Configuration ({{ index }}xxx range)
# ============================================================================
POSTGRES_PORT={{ ports.postgres }}
REDIS_PORT={{ ports.redis }}
API_PORT={{ ports.api }}
PGADMIN_PORT={{ ports.pgadmin }}
FRONTEND_PORT={{ ports.frontend }}

# ============================================================================
# Database Configuration
# ============================================================================
POSTGRES_DB={{ database.name }}
DATABASE_URL=postgresql://{{ database.user }}:{{ database.password }}@localhost:{{ ports.postgres }}/{{ database.name }}
DATABASE_URL_INTERNAL=postgresql://{{ database.user }}:{{ database.password }}@postgres:5432/{{ database.name }}

# ============================================================================
# Redis Configuration
# ============================================================================
REDIS_URL=redis://:{{ redis.password }}@localhost:{{ ports.redis }}
REDIS_URL_INTERNAL=redis://:{{ redis.password }}@redis:6379

# ============================================================================
# API Configuration
# ============================================================================
API_URL=http://localhost:{{ ports.api }}
FRONTEND_URL=http://localhost:{{ ports.frontend }}

{% if external_urls %}
# ============================================================================
# External URLs (Cloudflare Tunnels)
# ============================================================================
EXTERNAL_API_URL={{ external_urls.api }}
EXTERNAL_WS_URL={{ external_urls.ws }}
EXTERNAL_WEB_URL={{ external_urls.web }}
{% endif %}
```

**.worktree-config.json template:**
```jinja2
{
  "worktree": {
    "name": "{{ name }}",
    "index": {{ index }},
    "path": "{{ path }}",
    "branch": "{{ branch }}",
    "enabled": {{ enabled | lower }},
    "production": {{ production | lower }}
  },
  "ports": {
    "postgres": {{ ports.postgres }},
    "redis": {{ ports.redis }},
    "api": {{ ports.api }},
    "pgadmin": {{ ports.pgadmin }},
    "frontend": {{ ports.frontend }}
  },
  "services": {
    "postgres": {
      "url": "postgresql://{{ database.user }}:{{ database.password }}@localhost:{{ ports.postgres }}/{{ database.name }}",
      "health_check": "pg_isready -h localhost -p {{ ports.postgres }}"
    },
    "redis": {
      "url": "redis://:{{ redis.password }}@localhost:{{ ports.redis }}",
      "health_check": "redis-cli -h localhost -p {{ ports.redis }} -a {{ redis.password }} ping"
    },
    "api": {
      "url": "http://localhost:{{ ports.api }}",
      "health_check": "curl -sf http://localhost:{{ ports.api }}/health"
    }
  },
  "monitoring": {
    "service_url": "ws://localhost:20000",
    "check_interval_seconds": 10,
    "health_check_enabled": true
  }
}
```

---

## Implementation Approach

### Phase 1: Registry Management (Week 1)

**Files to create:**
- `service/config_manager.py` - Registry CRUD operations

**Key Classes:**
```python
class ConfigManager:
    def __init__(self, registry_path: str):
        self.registry_path = Path(registry_path)
        self.registry = self._load_registry()

    async def add_worktree(self, worktree_config: dict) -> dict:
        """
        Add worktree to registry with auto-generated names/ports

        Auto-generates:
        - Port allocation from index (INDEX × 1000 + offset)
        - Container names (archie-{name}-{service})
        - Network name (archie-{name}-network)
        - Volume names (archie-{name}-{service}-data)

        Validates:
        - No port conflicts
        - No container name conflicts
        - Index not already in use
        """

    async def update_worktree(self, name: str, updates: dict) -> dict:
        """Update worktree configuration"""

    async def remove_worktree(self, name: str) -> bool:
        """Remove worktree from registry"""

    async def validate_registry(self) -> dict:
        """
        Validate entire registry for conflicts

        Checks:
        - Port conflicts across worktrees
        - Container name uniqueness
        - Network name uniqueness
        - Volume name uniqueness
        - Valid index assignments
        """

    def _check_port_conflicts(self, ports: dict, exclude_name: str = None) -> List[str]:
        """Check if any ports conflict with existing worktrees"""

    def _generate_container_names(self, name: str) -> dict:
        """Generate standard container names for worktree"""
```

**Endpoints to add to service.py:**
```python
@app.post("/api/v1/config/registry/worktrees")
async def create_worktree(config: WorktreeConfig):
    """Add new worktree to registry"""

@app.get("/api/v1/config/registry/worktrees")
async def list_worktrees():
    """List all worktrees in registry"""

@app.get("/api/v1/config/registry/worktrees/{name}")
async def get_worktree(name: str):
    """Get specific worktree config"""

@app.put("/api/v1/config/registry/worktrees/{name}")
async def update_worktree(name: str, updates: WorktreeUpdate):
    """Update worktree configuration"""

@app.delete("/api/v1/config/registry/worktrees/{name}")
async def delete_worktree(name: str):
    """Remove worktree from registry"""

@app.post("/api/v1/config/registry/validate")
async def validate_registry():
    """Validate entire registry"""
```

---

### Phase 2: Configuration Deployment (Week 2)

**Files to create:**
- `service/config_deployer.py` - File generation and deployment
- `service/templates/env.local.j2` - .env.local template
- `service/templates/worktree-config.json.j2` - Agent config template

**Key Classes:**
```python
class ConfigDeployer:
    def __init__(self, registry_path: str, templates_dir: str):
        self.registry = load_registry(registry_path)
        self.jinja_env = Environment(loader=FileSystemLoader(templates_dir))

    async def deploy_config(
        self,
        worktree_name: str,
        components: List[str],
        backup: bool = True,
        validate: bool = True
    ) -> dict:
        """
        Deploy configuration files to worktree

        Components:
        - env: .env.local
        - worktree-config: .worktree-config.json
        - docker-compose: docker-compose.yml

        Process:
        1. Validate worktree exists in registry
        2. Backup existing files (if backup=True)
        3. Render templates with worktree config
        4. Validate rendered config (if validate=True)
        5. Write files atomically
        6. Return deployment report
        """

    async def preview_deployment(self, worktree_name: str) -> dict:
        """Preview what would be deployed without writing"""

    async def render_env_file(self, worktree_config: dict) -> str:
        """Render .env.local from template"""

    async def render_worktree_config(self, worktree_config: dict) -> str:
        """Render .worktree-config.json"""

    async def backup_file(self, file_path: Path) -> Path:
        """Create timestamped backup of file"""

    async def write_atomic(self, file_path: Path, content: str):
        """Write file atomically (write to temp, then rename)"""
```

**Endpoints:**
```python
@app.post("/api/v1/config/deploy/{worktree}")
async def deploy_config(worktree: str, request: DeployRequest):
    """Deploy full config to worktree"""

@app.post("/api/v1/config/deploy/{worktree}/env")
async def deploy_env(worktree: str):
    """Deploy .env.local only"""

@app.post("/api/v1/config/deploy/{worktree}/worktree-config")
async def deploy_worktree_config(worktree: str):
    """Deploy .worktree-config.json only"""

@app.get("/api/v1/config/deploy/{worktree}/preview")
async def preview_deployment(worktree: str):
    """Preview deployment without writing"""
```

---

### Phase 3: Validation & Enforcement (Week 3)

**Files to create:**
- `service/config_validator.py` - Configuration validation

**Key Classes:**
```python
class ConfigValidator:
    def __init__(self, registry_path: str):
        self.registry = load_registry(registry_path)

    async def validate_worktree(self, worktree_name: str) -> dict:
        """
        Validate worktree configuration against registry

        Checks:
        1. .env.local exists and matches registry
        2. .worktree-config.json exists and matches registry
        3. Ports in .env.local match registry
        4. Container names follow standard pattern
        5. No hardcoded ports in docker-compose.yml
        6. Network isolation properly configured

        Returns detailed report with issues and suggestions
        """

    async def check_port_conflicts(self) -> List[dict]:
        """Check for port conflicts across all worktrees"""

    async def check_file_sync(self, worktree_name: str) -> dict:
        """
        Check if files match registry

        Returns:
        - Missing files
        - Files with mismatched values
        - Files with extra values not in registry
        """

    async def enforce_config(self, worktree_name: str) -> dict:
        """
        Fix non-compliant configuration

        Actions:
        1. Backup existing files
        2. Regenerate from registry
        3. Deploy corrected files
        4. Validate again
        5. Return enforcement report
        """

    async def parse_env_file(self, env_path: Path) -> dict:
        """Parse .env.local file into dict"""

    async def compare_env_values(
        self,
        actual: dict,
        expected: dict
    ) -> List[dict]:
        """Compare actual vs expected env values"""
```

**Endpoints:**
```python
@app.post("/api/v1/config/validate/{worktree}")
async def validate_worktree(worktree: str):
    """Validate worktree config"""

@app.post("/api/v1/config/validate/all")
async def validate_all():
    """Validate all worktrees"""

@app.post("/api/v1/config/enforce/{worktree}")
async def enforce_config(worktree: str):
    """Fix non-compliant config"""

@app.get("/api/v1/config/compliance")
async def get_compliance_report():
    """Get compliance report for all worktrees"""
```

---

### Phase 4: Inspection & Diffing (Week 4)

**Files to create:**
- `service/config_inspector.py` - Configuration inspection

**Key Classes:**
```python
class ConfigInspector:
    async def inspect_worktree(self, worktree_name: str) -> dict:
        """
        Get full configuration dump

        Returns:
        - Registry configuration
        - .env.local contents (with masked passwords)
        - .worktree-config.json contents
        - docker-compose.yml relevant sections
        - Running container status
        - Port bindings
        """

    async def diff_config(self, worktree_name: str) -> dict:
        """
        Compare registry vs actual files

        Returns:
        - Line-by-line diffs for each file
        - Missing values
        - Extra values
        - Mismatched values
        """

    async def get_effective_config(self, worktree_name: str) -> dict:
        """
        Parse and merge all config sources

        Priority:
        1. Environment variables (runtime)
        2. .env.local (worktree-specific)
        3. .env (defaults)
        4. Registry (expected)
        """

    async def mask_sensitive_data(self, config: dict) -> dict:
        """Replace passwords/tokens with ***"""

    async def get_container_status(self, worktree_name: str) -> List[dict]:
        """Get status of all containers for worktree"""
```

**Endpoints:**
```python
@app.get("/api/v1/config/inspect/{worktree}")
async def inspect_worktree(worktree: str):
    """Get full config dump"""

@app.get("/api/v1/config/inspect/{worktree}/env")
async def inspect_env(worktree: str):
    """Get .env.local contents"""

@app.get("/api/v1/config/inspect/{worktree}/ports")
async def inspect_ports(worktree: str):
    """Get port allocation"""

@app.get("/api/v1/config/inspect/{worktree}/containers")
async def inspect_containers(worktree: str):
    """Get container config"""

@app.get("/api/v1/config/diff/{worktree}")
async def diff_config(worktree: str):
    """Diff registry vs actual"""
```

---

## Success Criteria

### Registry Management
- ✅ Can add/update/remove worktrees via API
- ✅ Port conflicts detected before registry update
- ✅ Registry updates are atomic (rollback on failure)
- ✅ Auto-generation of ports/names from index
- ✅ Validation prevents invalid configurations

### Configuration Deployment
- ✅ Can deploy full config to new worktree via single API call
- ✅ Automatic backups before overwriting files
- ✅ Template-based generation with variable substitution
- ✅ Preview deployment without writing files
- ✅ Component-level deployment (update just .env.local)
- ✅ Git safety maintained (.env.local never committed)

### Validation & Enforcement
- ✅ Can validate any worktree against registry
- ✅ Clear compliance reports with actionable errors
- ✅ One-click enforcement to fix drift
- ✅ Scheduled compliance checks
- ✅ Port conflict detection
- ✅ Container name validation

### Inspection
- ✅ Can view effective configuration via API
- ✅ Diff shows exact differences between registry and files
- ✅ Sensitive data properly masked
- ✅ No need to SSH and cat files manually
- ✅ Container status included in inspection

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Martha Service (Port 20000)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Config Manager   │  │ Config Deployer  │                │
│  │ (Registry CRUD)  │  │ (File Generation)│                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                           │
│           ▼                     ▼                           │
│  ┌──────────────────────────────────────────┐              │
│  │   Central Registry (registry.json)       │              │
│  │   Single Source of Truth                 │              │
│  └──────────────────┬──────────────────────┘              │
│                     │                                       │
│           ┌─────────┴─────────┐                            │
│           ▼                   ▼                            │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ Config Validator │  │ Config Inspector │              │
│  │ (Compliance)     │  │ (Query/Diff)     │              │
│  └──────────────────┘  └──────────────────┘              │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ API Calls
                       ▼
         ┌─────────────────────────────────────────┐
         │         Worktree File System             │
         │                                          │
         │  • .env.local                           │
         │  • .worktree-config.json                │
         │  • docker-compose.yml                   │
         └─────────────────────────────────────────┘
```

---

## Benefits

**Reduced Human Error:**
- Templates ensure consistency
- Validation prevents misconfigurations
- Auto-generation eliminates manual calculation

**Faster Worktree Provisioning:**
- Single API call creates full configuration
- No manual file editing required
- Automatic validation before deployment

**Configuration Drift Detection:**
- Compliance reports show mismatches
- Automatic enforcement to fix drift
- Scheduled checks maintain compliance

**Better Visibility:**
- Inspect effective configuration via API
- Diff shows exact changes needed
- No need to SSH and read files manually

**Audit Trail:**
- All configuration changes via API
- Logged and traceable
- Easy to understand who changed what when

**Scalability:**
- Easy to add new worktrees
- Consistent configuration across all worktrees
- Template updates apply to all

---

## Timeline

**Week 1:** Registry Management API
**Week 2:** Configuration Deployment API
**Week 3:** Validation & Enforcement API
**Week 4:** Inspection & Documentation

**Total:** 4 weeks for complete system

---

## Dependencies

- **Existing:** `cloudflare_manager.py` demonstrates successful config deployment pattern
- **Existing:** `validate-worktree-config.py` has validation logic to port to API
- **New:** Jinja2 for template rendering
- **New:** Atomic file operations library (or custom implementation)

---

## Future Enhancements

**Phase 2 (Future):**
- Web UI for configuration management
- Git integration (auto-commit registry changes)
- Scheduled compliance checks
- Notifications for drift detection
- Configuration history/rollback
- Multi-worktree updates (bulk operations)

**Phase 3 (Future):**
- Integration with GitHub API (sync worktrees with branches)
- Automatic worktree creation from GitHub webhooks
- Docker Compose generation from templates
- Secrets management integration (Vault, etc.)
