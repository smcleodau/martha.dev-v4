#!/usr/bin/env python3
"""
Worktree Monitoring Agent - Lightweight Per-Worktree Client
Connects to central service and streams events in real-time
"""

import asyncio
import json
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
import sys

import websockets
from websockets.exceptions import ConnectionClosed
import docker

# Configuration
SERVICE_URL = os.getenv("MONITOR_SERVICE_URL", "ws://localhost:9000")
WORKTREE_NAME = os.getenv("WORKTREE_NAME")
WORKTREE_PATH = Path(os.getenv("WORKTREE_PATH", os.getcwd()))
AGENT_VERSION = "2.0.0"

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# Event Collectors
# ============================================================================

class GitWatcher:
    """Watches Git repository for changes"""

    def __init__(self, repo_path: Path):
        self.repo_path = repo_path
        self.last_commit = None
        self.last_branch = None

    async def check_status(self) -> list:
        """Check Git status and return events"""
        events = []

        try:
            # Check current branch
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                branch = result.stdout.strip()
                if branch != self.last_branch:
                    events.append({
                        "type": "git.branch",
                        "data": {
                            "old_branch": self.last_branch,
                            "new_branch": branch
                        }
                    })
                    self.last_branch = branch

            # Check latest commit
            result = subprocess.run(
                ["git", "log", "-1", "--format=%H:%s"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0 and result.stdout.strip():
                commit_info = result.stdout.strip()
                if commit_info != self.last_commit:
                    hash, message = commit_info.split(":", 1)
                    events.append({
                        "type": "git.commit",
                        "data": {
                            "hash": hash[:8],
                            "message": message,
                            "branch": self.last_branch
                        }
                    })
                    self.last_commit = commit_info

            # Check uncommitted changes
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                uncommitted = len([l for l in result.stdout.strip().split("\n") if l])
                if uncommitted > 0:
                    events.append({
                        "type": "git.uncommitted",
                        "data": {
                            "count": uncommitted
                        }
                    })

        except Exception as e:
            logger.error(f"Git check failed: {e}")

        return events


class DockerWatcher:
    """Watches Docker containers for status changes"""

    def __init__(self, worktree_name: str):
        self.worktree_name = worktree_name
        self.client = docker.from_env()
        self.last_status = {}

    async def check_status(self) -> list:
        """Check Docker container status and return events"""
        events = []

        try:
            containers = self.client.containers.list(
                all=True,
                filters={"name": f"archie-{self.worktree_name}-"}
            )

            current_status = {}

            for container in containers:
                name = container.name
                status = container.status
                health = None

                # Check health status
                if container.attrs.get("State", {}).get("Health"):
                    health = container.attrs["State"]["Health"]["Status"]

                current_status[name] = {"status": status, "health": health}

                # Detect status changes
                if name in self.last_status:
                    old = self.last_status[name]
                    if old["status"] != status:
                        events.append({
                            "type": "container.status",
                            "data": {
                                "container": name,
                                "old_status": old["status"],
                                "new_status": status,
                                "health": health
                            }
                        })
                else:
                    # New container detected
                    events.append({
                        "type": "container.detected",
                        "data": {
                            "container": name,
                            "status": status,
                            "health": health
                        }
                    })

            self.last_status = current_status

        except Exception as e:
            logger.error(f"Docker check failed: {e}")

        return events


class HealthChecker:
    """Performs health checks on services"""

    def __init__(self, ports: Dict[str, int]):
        self.ports = ports

    async def check_health(self) -> list:
        """Check service health and return events"""
        events = []

        try:
            # Check API health
            if "api" in self.ports:
                result = subprocess.run(
                    ["curl", "-sf", f"http://localhost:{self.ports['api']}/health"],
                    capture_output=True,
                    timeout=5
                )

                api_healthy = result.returncode == 0
                events.append({
                    "type": "health.check",
                    "data": {
                        "service": "api",
                        "port": self.ports["api"],
                        "status": "healthy" if api_healthy else "unhealthy"
                    }
                })

            # Check PostgreSQL
            if "postgres" in self.ports:
                result = subprocess.run(
                    ["pg_isready", "-h", "localhost", "-p", str(self.ports["postgres"])],
                    capture_output=True,
                    timeout=5
                )

                pg_healthy = result.returncode == 0
                events.append({
                    "type": "health.check",
                    "data": {
                        "service": "postgres",
                        "port": self.ports["postgres"],
                        "status": "healthy" if pg_healthy else "unhealthy"
                    }
                })

        except Exception as e:
            logger.error(f"Health check failed: {e}")

        return events

# ============================================================================
# Worktree Agent
# ============================================================================

class WorktreeAgent:
    """Main agent that connects to service and streams events"""

    def __init__(self, worktree_name: str, worktree_path: Path, service_url: str):
        self.worktree_name = worktree_name
        self.worktree_path = worktree_path
        self.service_url = f"{service_url}/ws/agent/{worktree_name}"

        # Load worktree config
        config_file = worktree_path / ".worktree-config.json"
        if config_file.exists():
            with open(config_file) as f:
                config = json.load(f)
                self.ports = config.get("ports", {})
        else:
            self.ports = {}

        # Event collectors
        self.git_watcher = GitWatcher(worktree_path)
        self.docker_watcher = DockerWatcher(worktree_name)
        self.health_checker = HealthChecker(self.ports)

        # Connection state
        self.websocket = None
        self.running = False

    async def connect(self):
        """Connect to monitoring service"""
        logger.info(f"🔌 Connecting to service: {self.service_url}")

        retry_count = 0
        max_retries = 10

        while retry_count < max_retries and not self.websocket:
            try:
                self.websocket = await websockets.connect(self.service_url)
                logger.info(f"✅ Connected to monitoring service")

                # Send initial heartbeat
                await self.send_event({
                    "type": "agent.startup",
                    "data": {
                        "agent_version": AGENT_VERSION,
                        "worktree": self.worktree_name,
                        "path": str(self.worktree_path),
                        "ports": self.ports
                    }
                })

                return True

            except Exception as e:
                retry_count += 1
                wait_time = min(2 ** retry_count, 30)  # Exponential backoff
                logger.warning(f"Connection failed (attempt {retry_count}/{max_retries}): {e}")
                logger.info(f"Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)

        logger.error("Failed to connect to monitoring service")
        return False

    async def send_event(self, event: dict):
        """Send event to service"""
        if not self.websocket:
            return

        try:
            event["worktree"] = self.worktree_name
            event["timestamp"] = datetime.now().isoformat()
            await self.websocket.send(json.dumps(event))
            logger.debug(f"📤 Sent event: {event['type']}")
        except Exception as e:
            logger.error(f"Failed to send event: {e}")

    async def handle_commands(self):
        """Listen for commands from service"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                command = data.get("command")

                logger.info(f"📥 Received command: {command}")

                if command == "restart_container":
                    await self.restart_container(data.get("container"))
                elif command == "git_pull":
                    await self.git_pull()
                elif command == "health_check":
                    await self.run_health_check()

        except ConnectionClosed:
            logger.warning("Connection to service closed")
            self.websocket = None
        except Exception as e:
            logger.error(f"Error handling commands: {e}")

    async def restart_container(self, container_name: str):
        """Restart a Docker container"""
        try:
            logger.info(f"🔄 Restarting container: {container_name}")

            result = subprocess.run(
                ["docker", "compose", "restart", container_name],
                cwd=self.worktree_path,
                capture_output=True,
                timeout=60
            )

            if result.returncode == 0:
                await self.send_event({
                    "type": "container.restarted",
                    "data": {
                        "container": container_name,
                        "success": True
                    }
                })
            else:
                await self.send_event({
                    "type": "container.restart_failed",
                    "data": {
                        "container": container_name,
                        "error": result.stderr.decode()
                    }
                })

        except Exception as e:
            logger.error(f"Failed to restart container: {e}")

    async def git_pull(self):
        """Pull latest changes from Git"""
        try:
            logger.info("📥 Pulling from Git")

            result = subprocess.run(
                ["git", "pull"],
                cwd=self.worktree_path,
                capture_output=True,
                timeout=30
            )

            await self.send_event({
                "type": "git.pulled",
                "data": {
                    "success": result.returncode == 0,
                    "output": result.stdout.decode()
                }
            })

        except Exception as e:
            logger.error(f"Git pull failed: {e}")

    async def run_health_check(self):
        """Run health checks on demand"""
        events = await self.health_checker.check_health()
        for event in events:
            await self.send_event(event)

    async def watch_loop(self):
        """Main watching loop"""
        logger.info("👀 Starting watch loop...")

        while self.running:
            try:
                # Collect events from all watchers
                git_events = await self.git_watcher.check_status()
                docker_events = await self.docker_watcher.check_status()
                health_events = await self.health_checker.check_health()

                # Send all events
                for event in git_events + docker_events + health_events:
                    await self.send_event(event)

                # Wait before next check
                await asyncio.sleep(10)  # Check every 10 seconds

            except Exception as e:
                logger.error(f"Error in watch loop: {e}")
                await asyncio.sleep(5)

    async def run(self):
        """Run the agent"""
        self.running = True

        # Connect to service
        if not await self.connect():
            return

        # Start watch loop and command handler concurrently
        try:
            await asyncio.gather(
                self.watch_loop(),
                self.handle_commands()
            )
        except KeyboardInterrupt:
            logger.info("🛑 Agent stopped by user")
        finally:
            self.running = False
            if self.websocket:
                await self.websocket.close()

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    if not WORKTREE_NAME:
        logger.error("WORKTREE_NAME environment variable is required")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info(f"  Worktree Agent - {WORKTREE_NAME}")
    logger.info(f"  Version: {AGENT_VERSION}")
    logger.info(f"  Path: {WORKTREE_PATH}")
    logger.info("=" * 60)

    agent = WorktreeAgent(WORKTREE_NAME, WORKTREE_PATH, SERVICE_URL)

    try:
        asyncio.run(agent.run())
    except KeyboardInterrupt:
        logger.info("Agent stopped")
