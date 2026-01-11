#!/usr/bin/env python3
"""
Worktree Monitoring Service - Central Real-Time Streaming Service
Aggregates events from all worktree agents and streams to connected clients
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Set
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from pydantic import BaseModel, Field

# Import GitHub coordinator
from github_coordinator import create_github_coordinator, GitHubCoordinator

# Import Cloudflare manager
from cloudflare_manager import create_cloudflare_manager, CloudflareManager

# Configuration
SERVICE_VERSION = "2.0.0"
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "9000"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
EVENT_RETENTION_DAYS = int(os.getenv("EVENT_RETENTION_DAYS", "7"))

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# Data Models
# ============================================================================

class Event(BaseModel):
    """Base event model"""
    type: str = Field(..., description="Event type (e.g., git.commit, container.status)")
    worktree: str = Field(..., description="Worktree name")
    timestamp: datetime = Field(default_factory=datetime.now)
    data: dict = Field(default_factory=dict)

class AgentHeartbeat(BaseModel):
    """Agent heartbeat message"""
    worktree: str
    agent_version: str
    status: str = "online"
    timestamp: datetime = Field(default_factory=datetime.now)

class Command(BaseModel):
    """Command to send to agent"""
    command: str
    worktree: str
    params: dict = Field(default_factory=dict)
    request_id: str

class WorktreeStatus(BaseModel):
    """Current status of a worktree"""
    name: str
    status: str  # online, offline, degraded
    last_seen: datetime
    agent_version: str
    ports: dict
    health: dict = Field(default_factory=dict)

# ============================================================================
# Connection Managers
# ============================================================================

class ConnectionManager:
    """Manages WebSocket connections for agents and clients"""

    def __init__(self):
        # Agent connections: {worktree_name: websocket}
        self.agents: Dict[str, WebSocket] = {}

        # Client connections: {client_id: websocket}
        self.clients: Dict[str, WebSocket] = {}

        # Client subscriptions: {client_id: set(worktree_names)}
        self.subscriptions: Dict[str, Set[str]] = {}

        # Worktree metadata
        self.worktrees: Dict[str, WorktreeStatus] = {}

    async def connect_agent(self, worktree: str, websocket: WebSocket):
        """Register a worktree agent connection"""
        await websocket.accept()
        self.agents[worktree] = websocket
        self.worktrees[worktree] = WorktreeStatus(
            name=worktree,
            status="online",
            last_seen=datetime.now(),
            agent_version="2.0.0",
            ports={}
        )
        logger.info(f"✅ Agent connected: {worktree}")

        # Broadcast agent online event to all clients
        await self.broadcast_to_clients({
            "type": "agent.connected",
            "worktree": worktree,
            "timestamp": datetime.now().isoformat()
        })

    def disconnect_agent(self, worktree: str):
        """Unregister a worktree agent connection"""
        if worktree in self.agents:
            del self.agents[worktree]
        if worktree in self.worktrees:
            self.worktrees[worktree].status = "offline"
            self.worktrees[worktree].last_seen = datetime.now()
        logger.warning(f"⚠️  Agent disconnected: {worktree}")

    async def connect_client(self, client_id: str, websocket: WebSocket):
        """Register a client connection"""
        await websocket.accept()
        self.clients[client_id] = websocket
        self.subscriptions[client_id] = set()  # No subscriptions initially
        logger.info(f"✅ Client connected: {client_id}")

        # Send current worktree summary to new client
        await self.send_to_client(client_id, {
            "type": "worktree.summary",
            "worktrees": [wt.dict() for wt in self.worktrees.values()],
            "timestamp": datetime.now().isoformat()
        })

    def disconnect_client(self, client_id: str):
        """Unregister a client connection"""
        if client_id in self.clients:
            del self.clients[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        logger.info(f"Client disconnected: {client_id}")

    async def send_to_agent(self, worktree: str, message: dict):
        """Send message to specific agent"""
        if worktree in self.agents:
            try:
                await self.agents[worktree].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to agent {worktree}: {e}")
                self.disconnect_agent(worktree)

    async def send_to_client(self, client_id: str, message: dict):
        """Send message to specific client"""
        if client_id in self.clients:
            try:
                await self.clients[client_id].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to client {client_id}: {e}")
                self.disconnect_client(client_id)

    async def broadcast_to_clients(self, message: dict, worktree_filter: str = None):
        """Broadcast message to all subscribed clients"""
        disconnected = []

        for client_id, websocket in self.clients.items():
            # Check if client is subscribed to this worktree
            if worktree_filter:
                if worktree_filter not in self.subscriptions.get(client_id, set()):
                    continue  # Skip if not subscribed

            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to client {client_id}: {e}")
                disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect_client(client_id)

    def subscribe_client(self, client_id: str, worktrees: List[str]):
        """Subscribe client to specific worktrees"""
        if client_id not in self.subscriptions:
            self.subscriptions[client_id] = set()
        self.subscriptions[client_id].update(worktrees)
        logger.info(f"Client {client_id} subscribed to {worktrees}")

# ============================================================================
# FastAPI Application
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Worktree Monitoring Service starting...")
    logger.info(f"Version: {SERVICE_VERSION}")
    logger.info(f"Port: {SERVICE_PORT}")

    # Initialize Redis connection
    app.state.redis = await redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("✅ Connected to Redis")

    # Initialize GitHub coordinator
    app.state.github = create_github_coordinator()
    if app.state.github:
        logger.info("✅ GitHub integration enabled")
    else:
        logger.warning("⚠️  GitHub integration disabled (GITHUB_TOKEN not set)")

    # Initialize Cloudflare manager
    app.state.cloudflare = create_cloudflare_manager()
    if app.state.cloudflare:
        logger.info("✅ Cloudflare tunnel management enabled")
    else:
        logger.warning("⚠️  Cloudflare integration disabled (credentials not set)")

    # Start background tasks
    app.state.cleanup_task = asyncio.create_task(cleanup_old_events(app))

    yield

    # Cleanup
    logger.info("🛑 Worktree Monitoring Service shutting down...")
    app.state.cleanup_task.cancel()
    await app.state.redis.close()

app = FastAPI(
    title="Worktree Monitoring Service",
    version=SERVICE_VERSION,
    lifespan=lifespan
)

# CORS middleware for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global connection manager
manager = ConnectionManager()

# ============================================================================
# WebSocket Endpoints
# ============================================================================

@app.websocket("/ws/agent/{worktree}")
async def agent_websocket(websocket: WebSocket, worktree: str):
    """WebSocket endpoint for worktree agents"""
    await manager.connect_agent(worktree, websocket)

    try:
        while True:
            # Receive event from agent
            data = await websocket.receive_json()

            # Parse event
            event = Event(**data)
            event.worktree = worktree  # Ensure worktree is set correctly

            logger.info(f"📨 Event from {worktree}: {event.type}")

            # Store event in Redis
            try:
                await store_event(app.state.redis, event)
                logger.debug(f"✓ Event stored in Redis")
            except Exception as e:
                logger.error(f"Failed to store event in Redis: {e}")

            # Update GitHub if integration is enabled
            # TEMPORARILY DISABLED - causing authentication errors
            # if app.state.github:
            #     try:
            #         await app.state.github.handle_event({
            #             "type": event.type,
            #             "worktree": worktree,
            #             "data": event.data,
            #             "timestamp": event.timestamp.isoformat()
            #         })
            #     except Exception as e:
            #         logger.error(f"GitHub integration error: {e}")

            # Publish to Redis Pub/Sub for client broadcast
            await app.state.redis.publish(
                f"worktree:{worktree}",
                event.json()
            )

            # Broadcast to subscribed clients immediately
            await manager.broadcast_to_clients(
                {
                    "type": "worktree.event",
                    "worktree": worktree,
                    "event_type": event.type,
                    "timestamp": event.timestamp.isoformat(),
                    "data": event.data
                },
                worktree_filter=worktree
            )

            # Update worktree status
            if worktree in manager.worktrees:
                manager.worktrees[worktree].last_seen = datetime.now()
                manager.worktrees[worktree].status = "online"

    except WebSocketDisconnect:
        manager.disconnect_agent(worktree)
        await manager.broadcast_to_clients({
            "type": "agent.disconnected",
            "worktree": worktree,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in agent websocket {worktree}: {e}")
        manager.disconnect_agent(worktree)

@app.websocket("/ws/client/{client_id}")
async def client_websocket(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for client applications"""
    await manager.connect_client(client_id, websocket)

    try:
        while True:
            # Receive command from client
            data = await websocket.receive_json()

            command_type = data.get("command")

            if command_type == "subscribe":
                # Subscribe to specific worktrees
                worktrees = data.get("worktrees", [])
                manager.subscribe_client(client_id, worktrees)
                await manager.send_to_client(client_id, {
                    "type": "subscription.confirmed",
                    "worktrees": worktrees
                })

            elif command_type == "restart_container":
                # Forward command to agent
                worktree = data.get("worktree")
                container = data.get("container")

                if worktree in manager.agents:
                    await manager.send_to_agent(worktree, {
                        "command": "restart_container",
                        "container": container,
                        "request_id": f"req_{datetime.now().timestamp()}"
                    })
                    await manager.send_to_client(client_id, {
                        "type": "command.sent",
                        "command": "restart_container",
                        "worktree": worktree,
                        "container": container
                    })
                else:
                    await manager.send_to_client(client_id, {
                        "type": "error",
                        "message": f"Agent {worktree} not connected"
                    })

            elif command_type == "get_history":
                # Get historical events
                worktree = data.get("worktree")
                limit = data.get("limit", 50)

                events = await get_event_history(app.state.redis, worktree, limit)
                await manager.send_to_client(client_id, {
                    "type": "history",
                    "worktree": worktree,
                    "events": events
                })

    except WebSocketDisconnect:
        manager.disconnect_client(client_id)
    except Exception as e:
        logger.error(f"Error in client websocket {client_id}: {e}")
        manager.disconnect_client(client_id)

# ============================================================================
# REST API Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Service health check"""
    return {
        "status": "healthy",
        "version": SERVICE_VERSION,
        "worktrees_online": len([w for w in manager.worktrees.values() if w.status == "online"]),
        "clients_connected": len(manager.clients),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/worktrees")
async def list_worktrees():
    """List all registered worktrees"""
    return {
        "worktrees": [wt.dict() for wt in manager.worktrees.values()]
    }

@app.get("/api/v1/worktrees/{worktree}/status")
async def get_worktree_status(worktree: str):
    """Get current status of a worktree"""
    if worktree not in manager.worktrees:
        raise HTTPException(status_code=404, detail="Worktree not found")

    return manager.worktrees[worktree].dict()

@app.get("/api/v1/worktrees/{worktree}/events")
async def get_worktree_events(worktree: str, limit: int = 100, offset: int = 0):
    """Get historical events for a worktree"""
    events = await get_event_history(app.state.redis, worktree, limit, offset)
    return {"worktree": worktree, "events": events, "count": len(events)}

@app.post("/api/v1/worktrees/{worktree}/actions")
async def execute_action(worktree: str, action: dict):
    """Execute action on a worktree"""
    if worktree not in manager.agents:
        raise HTTPException(status_code=404, detail="Agent not connected")

    command = Command(
        command=action["action"],
        worktree=worktree,
        params=action.get("params", {}),
        request_id=f"req_{datetime.now().timestamp()}"
    )

    await manager.send_to_agent(worktree, command.dict())

    return {"status": "sent", "command": command.dict()}

# ============================================================================
# Cloudflare Tunnel Endpoints
# ============================================================================

@app.post("/api/v1/worktrees/{worktree}/tunnels/provision")
async def provision_tunnels(worktree: str, services: List[str] = None):
    """
    Provision Cloudflare tunnels for a worktree

    Args:
        worktree: Worktree name
        services: Services to expose (default: ["api", "ws", "web"])

    Returns:
        URL mapping for services
    """
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    # Get worktree ports - check runtime state first, then registry
    ports = None
    worktree_path = None

    if worktree in manager.worktrees:
        # Worktree is online - use runtime state
        wt_status = manager.worktrees[worktree]
        ports = wt_status.ports
    else:
        # Worktree offline - check registry
        import json
        from pathlib import Path
        registry_file = "/home/archiedev/.claude/worktree-monitor/registry.json"

        if Path(registry_file).exists():
            with open(registry_file) as f:
                registry = json.load(f)
                for wt in registry["worktrees"]:
                    if wt["name"] == worktree and wt["enabled"]:
                        ports = wt["ports"]
                        worktree_path = wt["path"]
                        break

        if not ports:
            raise HTTPException(
                status_code=404,
                detail=f"Worktree '{worktree}' not found in registry or is disabled"
            )

    if not ports:
        raise HTTPException(
            status_code=400,
            detail="Worktree has no port configuration"
        )

    # Provision tunnels
    services = services or ["api", "ws", "web"]
    urls = await app.state.cloudflare.provision_worktree_tunnels(
        worktree,
        ports,
        services
    )

    if not urls:
        raise HTTPException(
            status_code=500,
            detail="Failed to provision tunnels"
        )

    # Update worktree .env file
    if worktree_path:
        # Use path from earlier registry lookup
        from pathlib import Path
        await app.state.cloudflare.update_worktree_env(
            Path(worktree_path),
            urls
        )
    elif worktree in manager.worktrees:
        # Fallback: worktree online but no path from registry
        from pathlib import Path
        import json
        registry_file = "/home/archiedev/.claude/worktree-monitor/registry.json"
        with open(registry_file) as f:
            registry = json.load(f)
            for wt in registry["worktrees"]:
                if wt["name"] == worktree:
                    await app.state.cloudflare.update_worktree_env(
                        Path(wt["path"]),
                        urls
                    )
                    break

    return {
        "worktree": worktree,
        "status": "provisioned",
        "urls": urls
    }

@app.get("/api/v1/worktrees/{worktree}/tunnels/status")
async def get_tunnel_status(worktree: str):
    """Get Cloudflare tunnel status for worktree"""
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    status = await app.state.cloudflare.get_tunnel_status(worktree)
    return {
        "worktree": worktree,
        **status
    }

@app.post("/api/v1/worktrees/{worktree}/tunnels/start")
async def start_tunnel(worktree: str):
    """Start Cloudflare tunnel for worktree"""
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    success = await app.state.cloudflare.start_tunnel(worktree)

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to start tunnel"
        )

    return {
        "worktree": worktree,
        "status": "started"
    }

@app.post("/api/v1/worktrees/{worktree}/tunnels/stop")
async def stop_tunnel(worktree: str):
    """Stop Cloudflare tunnel for worktree"""
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    success = await app.state.cloudflare.stop_tunnel(worktree)

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Tunnel not running or not found"
        )

    return {
        "worktree": worktree,
        "status": "stopped"
    }

@app.get("/api/v1/tunnels")
async def list_all_tunnels():
    """List all configured Cloudflare tunnels"""
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    tunnels = app.state.cloudflare.get_all_tunnels()

    return {
        "tunnels": [
            {
                "worktree": name,
                "tunnel_id": config.tunnel_id,
                "urls": config.urls
            }
            for name, config in tunnels.items()
        ]
    }

@app.delete("/api/v1/worktrees/{worktree}/tunnels")
async def destroy_tunnel(worktree: str):
    """
    Destroy Cloudflare tunnel for worktree

    This will:
    - Stop the tunnel daemon if running
    - Delete DNS records
    - Delete tunnel from Cloudflare
    - Remove local configuration files
    - Remove URLs from worktree .env
    """
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    success = await app.state.cloudflare.destroy_tunnel(worktree)

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Tunnel not found or already destroyed"
        )

    return {
        "worktree": worktree,
        "status": "destroyed",
        "message": "Tunnel and all associated resources have been removed"
    }

@app.put("/api/v1/worktrees/{worktree}/tunnels/enable")
async def enable_tunnel(worktree: str):
    """
    Enable tunnel for worktree (provisions if not exists, then starts)
    """
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    # Check if tunnel exists
    if worktree not in app.state.cloudflare.tunnels:
        # Need to provision first
        raise HTTPException(
            status_code=404,
            detail="Tunnel not provisioned. Use POST /tunnels/provision first"
        )

    # Start tunnel
    success = await app.state.cloudflare.start_tunnel(worktree)

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to enable tunnel"
        )

    return {
        "worktree": worktree,
        "status": "enabled",
        "urls": app.state.cloudflare.tunnels[worktree].urls
    }

@app.put("/api/v1/worktrees/{worktree}/tunnels/disable")
async def disable_tunnel(worktree: str):
    """
    Disable tunnel for worktree (stops but does not destroy)
    """
    if not app.state.cloudflare:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare integration not enabled"
        )

    success = await app.state.cloudflare.stop_tunnel(worktree)

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Tunnel not running or not found"
        )

    return {
        "worktree": worktree,
        "status": "disabled",
        "message": "Tunnel stopped but configuration preserved"
    }

# ============================================================================
# Helper Functions
# ============================================================================

async def store_event(redis_client, event: Event):
    """Store event in Redis with TTL"""
    key = f"events:{event.worktree}"
    value = event.json()

    # Add to list
    await redis_client.lpush(key, value)

    # Trim to last 1000 events
    await redis_client.ltrim(key, 0, 999)

    # Set expiry (7 days)
    await redis_client.expire(key, EVENT_RETENTION_DAYS * 86400)

async def get_event_history(redis_client, worktree: str, limit: int = 100, offset: int = 0):
    """Retrieve event history from Redis"""
    key = f"events:{worktree}"

    # Get events from list
    events_json = await redis_client.lrange(key, offset, offset + limit - 1)

    # Parse JSON
    events = [json.loads(e) for e in events_json]

    return events

async def cleanup_old_events(app: FastAPI):
    """Background task to cleanup old events"""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            logger.info("Running event cleanup...")

            # Redis TTL handles automatic cleanup
            # This is a placeholder for additional cleanup logic if needed

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    logger.info("=" * 60)
    logger.info("  Worktree Monitoring Service - Real-Time Streaming")
    logger.info(f"  Version: {SERVICE_VERSION}")
    logger.info("=" * 60)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=SERVICE_PORT,
        log_level="info",
        access_log=True
    )
