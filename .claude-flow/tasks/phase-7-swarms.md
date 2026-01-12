# Phase 7: Swarm Orchestration

## Goal
Implement claude-flow swarm integration for autonomous multi-agent development.

## Context
- Claude-flow uses hive-mind topology for parallel agent execution
- Swarms communicate via hooks (callbacks to Martha service)
- State tracked in `.swarm/state.json`
- Resource monitoring via PID tracking

## Tasks

### 1. Implement Swarm Orchestrator (`src/core/swarm-orchestrator.ts`)

**Requirements:**
- SwarmOrchestrator class with methods:
  - `spawn(options: SwarmSpawnOptions): Promise<Swarm>` - Spawn new swarm
  - `getStatus(swarmId: string): Promise<SwarmStatus>` - Get swarm status
  - `terminate(swarmId: string): Promise<void>` - Terminate swarm
  - `list(): Promise<Swarm[]>` - List all active swarms
  - `handleHook(hookType: string, payload: any): Promise<void>` - Handle callbacks

**Spawn Implementation:**
```typescript
async spawn(options: {
  epicNumber: number;
  worktreePath: string;
  epicContext: EpicContext;
}): Promise<Swarm> {
  // 1. Create .claude-flow/config.json
  const config = {
    project: `epic-${options.epicNumber}`,
    epic_context: options.epicContext,
    reasoning: { enable: true, database: '.swarm/memory.db' },
    telemetry: {
      braintrust: {
        enabled: true,
        project: 'martha-dev',
        experiment: `epic-${options.epicNumber}`,
        tags: [`epic:${options.epicNumber}`]
      }
    }
  };
  await fs.writeFile(...);

  // 2. Setup hooks in .claude/settings.json
  await this.setupHooks(options.worktreePath);

  // 3. Spawn process
  const process = spawn('npx', [
    'claude-flow@alpha',
    'hive-mind',
    'spawn',
    '--config', '.claude-flow/config.json'
  ], {
    cwd: options.worktreePath,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // 4. Store in database
  const swarm = await this.swarmRepository.create({
    epicNumber: options.epicNumber,
    pid: process.pid!,
    worktreePath: options.worktreePath,
    status: 'running'
  });

  // 5. Start health monitoring
  this.startHealthMonitoring(swarm.id);

  // 6. Setup logging
  this.setupLogging(process, swarm.id);

  return swarm;
}
```

**Health Monitoring:**
```typescript
private startHealthMonitoring(swarmId: string) {
  const interval = setInterval(async () => {
    const swarm = await this.swarmRepository.findById(swarmId);
    if (!swarm) {
      clearInterval(interval);
      return;
    }

    // Read .swarm/state.json
    const statePath = path.join(swarm.worktreePath, '.swarm', 'state.json');
    const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));

    // Update database
    await this.swarmRepository.update(swarmId, {
      agentCount: state.agents?.length || 0,
      taskCount: state.tasks?.length || 0,
      status: state.status,
      lastHeartbeat: new Date()
    });

    // Check for crashes
    if (state.status === 'crashed') {
      await this.attemptRecovery(swarm);
    }
  }, 30000); // Every 30 seconds

  this.monitoringIntervals.set(swarmId, interval);
}
```

**Resource Usage:**
```typescript
import pidusage from 'pidusage';

async getResourceUsage(pid: number): Promise<ResourceUsage> {
  const stats = await pidusage(pid);
  return {
    cpu: stats.cpu,
    memory: stats.memory,
    elapsed: stats.elapsed
  };
}
```

### 2. Implement Swarm Models & Repository

**Database Model** (`src/database/models/swarm.ts`):
```typescript
export interface Swarm {
  id: string; // UUID
  epicNumber: number;
  worktreeId: number;
  pid: number;
  status: 'spawning' | 'running' | 'paused' | 'completed' | 'crashed';
  config: any; // .claude-flow/config.json
  resourceUsage: {
    cpu: number;
    memory: number;
  };
  agentCount: number;
  taskCount: number;
  lastHeartbeat: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Repository** (`src/database/repositories/swarm-repository.ts`):
```typescript
export class SwarmRepository {
  async create(data: CreateSwarmDTO): Promise<Swarm> { /* ... */ }
  async findById(id: string): Promise<Swarm | null> { /* ... */ }
  async findByEpicNumber(epicNumber: number): Promise<Swarm[]> { /* ... */ }
  async findActive(): Promise<Swarm[]> { /* ... */ }
  async update(id: string, data: Partial<Swarm>): Promise<void> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
}
```

### 3. Implement Hook Handlers (`src/server/routes/hooks.ts`)

**Hook Endpoints:**
```typescript
// POST /api/v1/hooks/task-complete
fastify.post('/api/v1/hooks/task-complete', async (request, reply) => {
  const payload = request.body as TaskCompletePayload;

  // Forward to swarm orchestrator
  await swarmOrchestrator.handleHook('task-complete', payload);

  // Emit event to Redis
  await redisClient.publish('martha:hooks', JSON.stringify({
    type: 'hook.task-complete',
    payload,
    timestamp: new Date()
  }));

  return { received: true };
});

// POST /api/v1/hooks/phase-complete
fastify.post('/api/v1/hooks/phase-complete', async (request, reply) => {
  const payload = request.body as PhaseCompletePayload;

  // Update epic progress
  await epicCoordinator.updatePhaseProgress(payload);

  // Notify GitHub
  await issueTracker.postPhaseComment(payload.epicNumber, payload.phase);

  return { received: true };
});

// POST /api/v1/hooks/error
fastify.post('/api/v1/hooks/error', async (request, reply) => {
  const payload = request.body as ErrorPayload;

  logger.error('Swarm error', payload);

  // Post to GitHub issue
  await projectBoard.commentWorkBlocked(payload.issueNumber, payload.error);

  return { received: true };
});
```

### 4. Implement Swarm Routes (`src/server/routes/swarms.ts`)

**API Endpoints:**
```typescript
// GET /api/v1/swarms
fastify.get('/api/v1/swarms', async (request, reply) => {
  const swarms = await swarmRepository.findActive();
  return {
    total: swarms.length,
    swarms: swarms.map(s => ({
      id: s.id,
      epic_number: s.epicNumber,
      status: s.status,
      agent_count: s.agentCount,
      task_count: s.taskCount,
      resource_usage: s.resourceUsage,
      uptime: Date.now() - s.createdAt.getTime()
    }))
  };
});

// GET /api/v1/swarms/:id
fastify.get('/api/v1/swarms/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const swarm = await swarmRepository.findById(id);

  if (!swarm) {
    return reply.code(404).send({ error: 'Swarm not found' });
  }

  // Read state file
  const statePath = path.join(swarm.worktreePath, '.swarm', 'state.json');
  const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));

  return {
    swarm,
    state,
    resource_usage: await swarmOrchestrator.getResourceUsage(swarm.pid)
  };
});

// DELETE /api/v1/swarms/:id
fastify.delete('/api/v1/swarms/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  await swarmOrchestrator.terminate(id);
  return { success: true };
});
```

### 5. Implement MCP Swarm Tools (`src/mcp/tools/swarm-tools.ts`)

**Four MCP Tools:**

**Tool 1: `martha__swarm__spawn`**
```typescript
{
  name: 'martha__swarm__spawn',
  description: 'Spawn a claude-flow swarm for an epic',
  inputSchema: {
    type: 'object',
    properties: {
      epic_number: { type: 'number' },
      worktree_path: { type: 'string' }
    },
    required: ['epic_number', 'worktree_path']
  }
}
```

**Tool 2: `martha__swarm__status`**
```typescript
{
  name: 'martha__swarm__status',
  description: 'Get status of a running swarm',
  inputSchema: {
    type: 'object',
    properties: {
      swarm_id: { type: 'string' }
    },
    required: ['swarm_id']
  }
}
```

**Tool 3: `martha__swarm__terminate`**
```typescript
{
  name: 'martha__swarm__terminate',
  description: 'Terminate a running swarm',
  inputSchema: {
    type: 'object',
    properties: {
      swarm_id: { type: 'string' },
      reason: { type: 'string' }
    },
    required: ['swarm_id']
  }
}
```

**Tool 4: `martha__swarm__list_active`**
```typescript
{
  name: 'martha__swarm__list_active',
  description: 'List all active swarms',
  inputSchema: {
    type: 'object',
    properties: {}
  }
}
```

### 6. Hook Setup Configuration

Create `.claude/settings.json` in worktree:
```json
{
  "hooks": {
    "post-task": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "http://localhost:21000/api/v1/hooks/task-complete",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    },
    "session-end": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "http://localhost:21000/api/v1/hooks/session-end",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    },
    "agent-complete": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "http://localhost:21000/api/v1/hooks/agent-complete",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    }
  }
}
```

## Testing

### Unit Tests
- Swarm orchestrator methods
- Hook handler logic
- Resource monitoring
- State file parsing

### Integration Tests
- Spawn swarm end-to-end
- Hook callbacks received
- Status tracking works
- Termination cleanup

### Manual Testing
```bash
# Spawn test swarm
echo '{"epic_number": 123, "worktree_path": "/path/to/worktree"}' | \
  node dist/mcp/server.js --tool martha__swarm__spawn

# Check status
curl http://localhost:21000/api/v1/swarms

# Terminate
echo '{"swarm_id": "abc-123"}' | \
  node dist/mcp/server.js --tool martha__swarm__terminate
```

## Dependencies

```bash
npm install pidusage --save
```

## Success Criteria

- [ ] Can spawn swarm via MCP tool
- [ ] Swarm process starts and runs
- [ ] Hooks fire and reach Martha service
- [ ] State file monitored and parsed
- [ ] Resource usage tracked
- [ ] Can terminate swarm cleanly
- [ ] Database tracks swarm lifecycle

## Files to Create

1. `src/core/swarm-orchestrator.ts` (~500 lines)
2. `src/database/models/swarm.ts` (~100 lines)
3. `src/database/repositories/swarm-repository.ts` (~200 lines)
4. `src/server/routes/hooks.ts` (~200 lines)
5. `src/server/routes/swarms.ts` (~250 lines)
6. `src/mcp/tools/swarm-tools.ts` (~400 lines)
7. `tests/unit/swarm/*.test.ts` (~300 lines)

**Total:** ~1,950 lines of code

## Commit Message Template

```
Implement Phase 7: Swarm orchestration

Created claude-flow swarm integration:
- SwarmOrchestrator for swarm lifecycle management
- Hook system for swarm callbacks to Martha
- Health monitoring with state file polling
- Resource usage tracking (CPU, memory)
- 4 MCP tools for swarm management
- Database persistence for swarm tracking

Enables autonomous multi-agent development for epics.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```
