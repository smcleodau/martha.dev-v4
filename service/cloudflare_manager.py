#!/usr/bin/env python3
"""
Cloudflare Tunnel & DNS Manager
Automatically provisions tunnels and DNS records for worktrees
"""

import asyncio
import os
import logging
import subprocess
import json
from typing import Dict, List, Optional
from pathlib import Path
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class TunnelConfig(BaseModel):
    """Cloudflare tunnel configuration"""
    name: str
    tunnel_id: Optional[str] = None
    credentials_file: Optional[str] = None
    urls: Dict[str, str] = {}  # {service: url}


class CloudflareManager:
    """
    Manages Cloudflare tunnels and DNS for worktrees

    Features:
    - Automatic tunnel creation per worktree
    - DNS record provisioning
    - Tunnel health monitoring
    - Automatic reconnection
    - URL management
    """

    def __init__(
        self,
        api_token: str,
        zone_id: str,
        domain: str = "arch.ie",
        tunnel_dir: str = "/home/archiedev/.claude/worktree-monitor/tunnels"
    ):
        self.api_token = api_token
        self.zone_id = zone_id
        self.domain = domain
        self.tunnel_dir = Path(tunnel_dir)
        self.tunnel_dir.mkdir(parents=True, exist_ok=True)

        # Worktree tunnel configs
        self.tunnels: Dict[str, TunnelConfig] = {}

        # Load existing tunnels
        self._load_existing_tunnels()

        logger.info(f"✅ Cloudflare manager initialized for {domain}")

    def _load_existing_tunnels(self):
        """Load existing tunnel configurations"""
        config_file = self.tunnel_dir / "tunnels.json"
        if config_file.exists():
            with open(config_file) as f:
                data = json.load(f)
                for name, config in data.items():
                    self.tunnels[name] = TunnelConfig(**config)
            logger.info(f"Loaded {len(self.tunnels)} existing tunnels")

    def _save_tunnels(self):
        """Save tunnel configurations"""
        config_file = self.tunnel_dir / "tunnels.json"
        data = {name: config.dict() for name, config in self.tunnels.items()}
        with open(config_file, 'w') as f:
            json.dump(data, f, indent=2)

    async def provision_worktree_tunnels(
        self,
        worktree_name: str,
        ports: Dict[str, int],
        services: List[str] = ["api", "ws", "web"]
    ) -> Dict[str, str]:
        """
        Provision Cloudflare tunnels for a worktree

        Args:
            worktree_name: Name of worktree (e.g., "excel-sidebar-epics")
            ports: Port mapping {service: port}
            services: Services to expose (default: api, ws, web)

        Returns:
            URL mapping {service: url}

        Example:
            {
                "api": "https://excel-sidebar-api.arch.ie",
                "ws": "wss://excel-sidebar-api.arch.ie/ws",
                "web": "https://excel-sidebar-web.arch.ie"
            }
        """
        logger.info(f"🌐 Provisioning Cloudflare tunnels for {worktree_name}")

        # Generate subdomain prefix (e.g., "excel-sidebar")
        prefix = worktree_name.replace("-epics", "").replace("-integration", "")
        prefix = prefix.replace("-service", "")

        # Check if tunnel already exists
        if worktree_name in self.tunnels:
            logger.info(f"Tunnel already exists for {worktree_name}")
            return self.tunnels[worktree_name].urls

        # Create tunnel
        tunnel_id = await self._create_tunnel(worktree_name)
        if not tunnel_id:
            logger.error(f"Failed to create tunnel for {worktree_name}")
            return {}

        # Create tunnel configuration
        config = TunnelConfig(
            name=worktree_name,
            tunnel_id=tunnel_id,
            credentials_file=str(self.tunnel_dir / f"{tunnel_id}.json")
        )

        # Provision DNS records and configure tunnel
        urls = {}

        if "api" in services:
            api_url = f"{prefix}-api.{self.domain}"
            api_port = ports.get("api", 8000)

            # Create DNS record
            await self._create_dns_record(api_url, tunnel_id)

            # Configure tunnel route
            await self._configure_tunnel_route(
                tunnel_id,
                api_url,
                f"http://localhost:{api_port}"
            )

            urls["api"] = f"https://{api_url}"
            urls["ws"] = f"wss://{api_url}/ws"

        if "web" in services and "frontend" in ports:
            web_url = f"{prefix}-web.{self.domain}"
            web_port = ports["frontend"]

            await self._create_dns_record(web_url, tunnel_id)
            await self._configure_tunnel_route(
                tunnel_id,
                web_url,
                f"http://localhost:{web_port}"
            )

            urls["web"] = f"https://{web_url}"

        config.urls = urls
        self.tunnels[worktree_name] = config
        self._save_tunnels()

        logger.info(f"✅ Provisioned {len(urls)} tunnels for {worktree_name}")
        for service, url in urls.items():
            logger.info(f"  {service}: {url}")

        return urls

    async def _create_tunnel(self, name: str) -> Optional[str]:
        """Create Cloudflare tunnel using REST API (async)"""
        try:
            import httpx
            logger.info(f"Creating Cloudflare tunnel via API: {name}")

            # Get account ID (first get all accounts associated with token)
            accounts_url = "https://api.cloudflare.com/client/v4/accounts"
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get account ID from zone details
                zone_url = f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}"
                zone_response = await client.get(zone_url, headers=headers)

                if zone_response.status_code != 200:
                    logger.error(f"Failed to get zone details: {zone_response.text}")
                    return None

                zone_data = zone_response.json()
                if not zone_data.get("result"):
                    logger.error("No zone data found")
                    return None

                account_id = zone_data["result"]["account"]["id"]
                logger.info(f"Using Cloudflare account: {account_id}")

                # Create tunnel via API
                tunnel_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel"
                tunnel_data = {
                    "name": name,
                    "tunnel_secret": self._generate_tunnel_secret()
                }

                response = await client.post(tunnel_url, headers=headers, json=tunnel_data)

                if response.status_code in [200, 201]:
                    result = response.json()
                    tunnel_id = result["result"]["id"]
                    logger.info(f"✅ Created tunnel {name} with ID: {tunnel_id}")

                    # Save tunnel credentials
                    credentials = {
                        "AccountTag": account_id,
                        "TunnelSecret": tunnel_data["tunnel_secret"],
                        "TunnelID": tunnel_id
                    }
                    cred_file = self.tunnel_dir / f"{tunnel_id}.json"
                    with open(cred_file, 'w') as f:
                        json.dump(credentials, f)

                    return tunnel_id
                else:
                    logger.error(f"Failed to create tunnel: {response.text}")
                    return None

        except Exception as e:
            logger.error(f"Error creating tunnel: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    def _generate_tunnel_secret(self) -> str:
        """Generate a random tunnel secret (base64 encoded 32 bytes)"""
        import secrets
        import base64
        random_bytes = secrets.token_bytes(32)
        return base64.b64encode(random_bytes).decode('utf-8')

    async def _create_dns_record(self, hostname: str, tunnel_id: str):
        """Create DNS CNAME record pointing to tunnel (async)"""
        try:
            import httpx

            # Remove domain suffix to get subdomain
            subdomain = hostname.replace(f".{self.domain}", "")

            url = f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}/dns_records"
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }
            data = {
                "type": "CNAME",
                "name": subdomain,
                "content": f"{tunnel_id}.cfargotunnel.com",
                "proxied": True,
                "ttl": 1  # Auto
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=data)

                if response.status_code == 200:
                    logger.info(f"✅ Created DNS record: {hostname}")
                else:
                    # Check if record already exists
                    if "already exists" in response.text:
                        logger.info(f"DNS record already exists: {hostname}")
                    else:
                        logger.error(f"Failed to create DNS record: {response.text}")

        except Exception as e:
            logger.error(f"Error creating DNS record: {e}")

    async def _configure_tunnel_route(
        self,
        tunnel_id: str,
        hostname: str,
        service: str
    ):
        """Configure tunnel route (hostname -> local service)"""
        try:
            # Create tunnel config file
            config_file = self.tunnel_dir / f"{tunnel_id}-config.yml"

            # Read existing config or create new
            if config_file.exists():
                with open(config_file) as f:
                    import yaml
                    config = yaml.safe_load(f) or {}
            else:
                config = {
                    "tunnel": tunnel_id,
                    "credentials-file": str(self.tunnel_dir / f"{tunnel_id}.json"),
                    "ingress": []
                }

            # Ensure ingress array exists
            if "ingress" not in config:
                config["ingress"] = []

            # Remove catch-all if it exists (we'll add it back at the end)
            catch_all = {"service": "http_status:404"}
            config["ingress"] = [r for r in config["ingress"] if r != catch_all]

            # Add new route if it doesn't exist
            route = {
                "hostname": hostname,
                "service": service
            }
            if route not in config["ingress"]:
                config["ingress"].append(route)

            # Add catch-all rule at the end (required by cloudflared, must be last)
            config["ingress"].append(catch_all)

            # Save config
            import yaml
            with open(config_file, 'w') as f:
                yaml.dump(config, f, default_flow_style=False)

            logger.info(f"✅ Configured route: {hostname} → {service}")

        except Exception as e:
            logger.error(f"Error configuring tunnel route: {e}")

    async def start_tunnel(self, worktree_name: str) -> bool:
        """Start Cloudflare tunnel for worktree"""
        if worktree_name not in self.tunnels:
            logger.error(f"No tunnel configuration for {worktree_name}")
            return False

        config = self.tunnels[worktree_name]
        config_file = self.tunnel_dir / f"{config.tunnel_id}-config.yml"

        if not config_file.exists():
            logger.error(f"Tunnel config file not found: {config_file}")
            return False

        try:
            logger.info(f"Starting tunnel for {worktree_name}")

            # Start tunnel in background
            log_file = self.tunnel_dir / f"{worktree_name}-tunnel.log"
            pid_file = self.tunnel_dir / f"{worktree_name}-tunnel.pid"

            process = subprocess.Popen(
                [
                    "cloudflared", "tunnel",
                    "--config", str(config_file),
                    "run",
                    config.tunnel_id
                ],
                stdout=open(log_file, 'a'),
                stderr=subprocess.STDOUT,
                env={**os.environ, "CLOUDFLARE_API_TOKEN": self.api_token}
            )

            # Save PID
            with open(pid_file, 'w') as f:
                f.write(str(process.pid))

            logger.info(f"✅ Tunnel started for {worktree_name} (PID: {process.pid})")
            logger.info(f"   Logs: {log_file}")

            return True

        except Exception as e:
            logger.error(f"Error starting tunnel: {e}")
            return False

    async def stop_tunnel(self, worktree_name: str) -> bool:
        """Stop Cloudflare tunnel for worktree"""
        pid_file = self.tunnel_dir / f"{worktree_name}-tunnel.pid"

        if not pid_file.exists():
            logger.warning(f"No PID file for {worktree_name} tunnel")
            return False

        try:
            with open(pid_file) as f:
                pid = int(f.read().strip())

            # Kill process
            subprocess.run(["kill", str(pid)], check=True)
            pid_file.unlink()

            logger.info(f"✅ Stopped tunnel for {worktree_name}")
            return True

        except Exception as e:
            logger.error(f"Error stopping tunnel: {e}")
            return False

    async def get_tunnel_status(self, worktree_name: str) -> Dict:
        """Get tunnel status and health"""
        if worktree_name not in self.tunnels:
            return {"status": "not_configured"}

        config = self.tunnels[worktree_name]
        pid_file = self.tunnel_dir / f"{worktree_name}-tunnel.pid"

        if not pid_file.exists():
            return {
                "status": "stopped",
                "urls": config.urls
            }

        try:
            with open(pid_file) as f:
                pid = int(f.read().strip())

            # Check if process is running
            result = subprocess.run(
                ["ps", "-p", str(pid)],
                capture_output=True
            )

            if result.returncode == 0:
                return {
                    "status": "running",
                    "pid": pid,
                    "urls": config.urls
                }
            else:
                # Process dead but PID file exists
                pid_file.unlink()
                return {
                    "status": "crashed",
                    "urls": config.urls
                }

        except Exception as e:
            logger.error(f"Error checking tunnel status: {e}")
            return {"status": "error", "error": str(e)}

    async def update_worktree_env(
        self,
        worktree_path: Path,
        urls: Dict[str, str]
    ):
        """
        Update worktree .env.local file with tunnel URLs

        IMPORTANT: We write to .env.local (not .env) to avoid committing
        environment-specific configuration to git.
        """
        env_file = worktree_path / ".env.local"

        if not env_file.exists():
            logger.warning(f"No .env.local file at {env_file}, will create it")
            # Create basic .env.local if it doesn't exist
            env_file.touch()


        try:
            # Read existing .env
            with open(env_file) as f:
                lines = f.readlines()

            # Update or add URL variables
            updated = False
            for i, line in enumerate(lines):
                if line.startswith("EXTERNAL_API_URL="):
                    lines[i] = f"EXTERNAL_API_URL={urls.get('api', '')}\n"
                    updated = True
                elif line.startswith("EXTERNAL_WS_URL="):
                    lines[i] = f"EXTERNAL_WS_URL={urls.get('ws', '')}\n"
                    updated = True
                elif line.startswith("EXTERNAL_WEB_URL="):
                    lines[i] = f"EXTERNAL_WEB_URL={urls.get('web', '')}\n"
                    updated = True

            # Add if not found
            if not updated:
                lines.append(f"\n# External URLs (Cloudflare Tunnels)\n")
                lines.append(f"EXTERNAL_API_URL={urls.get('api', '')}\n")
                lines.append(f"EXTERNAL_WS_URL={urls.get('ws', '')}\n")
                lines.append(f"EXTERNAL_WEB_URL={urls.get('web', '')}\n")

            # Write back
            with open(env_file, 'w') as f:
                f.writelines(lines)

            logger.info(f"✅ Updated {env_file} with tunnel URLs")

        except Exception as e:
            logger.error(f"Error updating .env.local file: {e}")

    async def _get_tunnel_config(self, tunnel_id: str) -> Optional[dict]:
        """
        Get current tunnel configuration from Cloudflare API

        Returns the ingress configuration for the tunnel
        """
        try:
            import httpx

            # Get account ID from zone
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get account ID
                zone_url = f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}"
                zone_response = await client.get(zone_url, headers=headers)

                if zone_response.status_code != 200:
                    logger.error(f"Failed to get zone details: {zone_response.text}")
                    return None

                account_id = zone_response.json()["result"]["account"]["id"]

                # Get tunnel configuration
                config_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations"
                config_response = await client.get(config_url, headers=headers)

                if config_response.status_code == 200:
                    result = config_response.json()
                    if result.get("result") and "config" in result["result"]:
                        return result["result"]["config"]
                    else:
                        logger.warning("No configuration found in response")
                        return {"ingress": [{"service": "http_status:404"}]}
                else:
                    logger.error(f"Failed to get tunnel config: {config_response.text}")
                    return None

        except Exception as e:
            logger.error(f"Error getting tunnel config: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    async def _update_tunnel_config(self, tunnel_id: str, config: dict) -> bool:
        """
        Update tunnel configuration via Cloudflare API

        Args:
            tunnel_id: Cloudflare tunnel ID
            config: Configuration dict with ingress rules

        Returns:
            True if successful, False otherwise
        """
        try:
            import httpx

            # Get account ID from zone
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get account ID
                zone_url = f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}"
                zone_response = await client.get(zone_url, headers=headers)

                if zone_response.status_code != 200:
                    logger.error(f"Failed to get zone details: {zone_response.text}")
                    return False

                account_id = zone_response.json()["result"]["account"]["id"]

                # Update tunnel configuration
                config_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations"

                # Wrap config in the expected format
                payload = {
                    "config": config
                }

                config_response = await client.put(config_url, headers=headers, json=payload)

                if config_response.status_code == 200:
                    logger.info(f"✅ Updated tunnel configuration for {tunnel_id}")
                    return True
                else:
                    logger.error(f"Failed to update tunnel config: {config_response.text}")
                    return False

        except Exception as e:
            logger.error(f"Error updating tunnel config: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    async def _provision_route(self, tunnel_id: str, route: dict) -> bool:
        """
        Provision a single route: DNS record + tunnel ingress entry

        Args:
            tunnel_id: Cloudflare tunnel ID
            route: Route configuration dict with hostname, service, etc.

        Returns:
            True if successful, False otherwise
        """
        try:
            hostname = route["hostname"]
            service = route["service"]

            logger.info(f"Provisioning route: {hostname} → {service}")

            # 1. Create DNS CNAME record
            await self._create_dns_record(hostname, tunnel_id)

            # 2. Get current tunnel config
            current_config = await self._get_tunnel_config(tunnel_id)
            if not current_config:
                logger.error("Failed to get current tunnel configuration")
                return False

            # 3. Check if route already exists
            ingress = current_config.get("ingress", [])
            route_exists = False
            for existing_route in ingress:
                if existing_route.get("hostname") == hostname:
                    logger.info(f"Route already exists: {hostname}")
                    route_exists = True
                    break

            if not route_exists:
                # 4. Add new ingress route (before the catch-all at the end)
                new_route = {
                    "hostname": hostname,
                    "service": service,
                    "originRequest": {"noTLSVerify": True}
                }

                # Remove catch-all if it exists
                catch_all = None
                filtered_ingress = []
                for r in ingress:
                    if "hostname" not in r:
                        catch_all = r
                    else:
                        filtered_ingress.append(r)

                # Add new route
                filtered_ingress.append(new_route)

                # Add catch-all back
                if catch_all:
                    filtered_ingress.append(catch_all)
                else:
                    filtered_ingress.append({"service": "http_status:404"})

                current_config["ingress"] = filtered_ingress

                # 5. Update tunnel config via API
                success = await self._update_tunnel_config(tunnel_id, current_config)
                if not success:
                    logger.error("Failed to update tunnel configuration")
                    return False

            logger.info(f"✅ Provisioned route: {hostname} → {service}")
            return True

        except Exception as e:
            logger.error(f"Error provisioning route: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    async def provision_from_config(self, worktree_name: str, config_path: str) -> dict:
        """
        Provision DNS + tunnels declaratively from worktree config

        Reads .worktree-config.json, extracts tunnel spec, and provisions:
        1. DNS CNAME records for each hostname
        2. Updates tunnel ingress configuration via Cloudflare API

        Args:
            worktree_name: Name of the worktree
            config_path: Path to .worktree-config.json file

        Returns:
            Dict with provisioned routes and tunnel_id

        Raises:
            Exception if provisioning fails
        """
        logger.info(f"🌐 Provisioning tunnels from config for {worktree_name}")

        # Read config
        import json
        from pathlib import Path

        config_file = Path(config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")

        with open(config_file) as f:
            config = json.load(f)

        tunnel_spec = config.get("tunnels", {})

        if not tunnel_spec.get("enabled"):
            logger.info(f"Tunnels disabled for {worktree_name}")
            return {
                "status": "disabled",
                "routes": [],
                "tunnel_id": None
            }

        tunnel_id = tunnel_spec.get("tunnel_id")
        if not tunnel_id:
            raise ValueError("tunnel_id not specified in config")

        routes = tunnel_spec.get("routes", [])

        # Provision each enabled route
        provisioned_routes = []
        for route in routes:
            if route.get("enabled", True):
                success = await self._provision_route(tunnel_id, route)
                if success:
                    provisioned_routes.append({
                        "hostname": route["hostname"],
                        "service": route["service"],
                        "type": route.get("type", "unknown"),
                        "description": route.get("description", "")
                    })

        logger.info(f"✅ Provisioned {len(provisioned_routes)} routes for {worktree_name}")

        return {
            "status": "success",
            "routes": provisioned_routes,
            "tunnel_id": tunnel_id
        }

    async def destroy_tunnel(self, worktree_name: str) -> bool:
        """
        Completely destroy a Cloudflare tunnel

        This will:
        1. Stop the tunnel daemon if running
        2. Delete DNS records from Cloudflare
        3. Delete the tunnel from Cloudflare
        4. Remove local configuration files
        5. Remove from tunnel registry
        6. Remove EXTERNAL_*_URL from worktree .env
        """
        if worktree_name not in self.tunnels:
            logger.warning(f"Tunnel {worktree_name} not found in registry")
            return False

        try:
            config = self.tunnels[worktree_name]
            tunnel_id = config.tunnel_id

            logger.info(f"🗑️  Destroying tunnel for {worktree_name}")

            # Step 1: Stop tunnel daemon if running
            await self.stop_tunnel(worktree_name)

            # Step 2: Delete DNS records
            import httpx
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get all DNS records for this zone
                dns_url = f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}/dns_records"
                response = await client.get(dns_url, headers=headers)

                if response.status_code == 200:
                    records = response.json().get("result", [])

                    # Delete records that point to our tunnel
                    for record in records:
                        if record.get("content") == f"{tunnel_id}.cfargotunnel.com":
                            delete_url = f"{dns_url}/{record['id']}"
                            await client.delete(delete_url, headers=headers)
                            logger.info(f"✅ Deleted DNS record: {record['name']}")

                # Step 3: Delete tunnel from Cloudflare
                # First get account ID from zone
                zone_url = f"https://api.cloudflare.com/client/v4/zones/{self.zone_id}"
                zone_response = await client.get(zone_url, headers=headers)

                if zone_response.status_code == 200:
                    account_id = zone_response.json()["result"]["account"]["id"]

                    # Delete tunnel
                    tunnel_delete_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}"
                    tunnel_response = await client.delete(tunnel_delete_url, headers=headers)

                    if tunnel_response.status_code in [200, 204]:
                        logger.info(f"✅ Deleted tunnel {tunnel_id} from Cloudflare")
                    else:
                        logger.warning(f"Could not delete tunnel from Cloudflare: {tunnel_response.text}")

            # Step 4: Remove local configuration files
            config_file = self.tunnel_dir / f"{tunnel_id}-config.yml"
            cred_file = self.tunnel_dir / f"{tunnel_id}.json"
            log_file = self.tunnel_dir / f"{worktree_name}-tunnel.log"
            pid_file = self.tunnel_dir / f"{worktree_name}-tunnel.pid"

            for file in [config_file, cred_file, log_file, pid_file]:
                if file.exists():
                    file.unlink()
                    logger.info(f"✅ Removed {file.name}")

            # Step 5: Remove from tunnel registry
            del self.tunnels[worktree_name]
            self._save_tunnels()

            # Step 6: Remove EXTERNAL_*_URL from worktree .env.local
            registry_file = Path("/home/archiedev/.claude/worktree-monitor/registry.json")
            if registry_file.exists():
                import json
                with open(registry_file) as f:
                    registry = json.load(f)

                for wt in registry["worktrees"]:
                    if wt["name"] == worktree_name:
                        worktree_path = Path(wt["path"])
                        env_file = worktree_path / ".env.local"

                        if env_file.exists():
                            # Read .env.local and remove EXTERNAL_* lines
                            with open(env_file) as f:
                                lines = f.readlines()

                            # Filter out EXTERNAL_* lines
                            new_lines = [
                                line for line in lines
                                if not line.startswith("EXTERNAL_")
                            ]

                            # Write back
                            with open(env_file, 'w') as f:
                                f.writelines(new_lines)

                            logger.info(f"✅ Removed EXTERNAL_*_URL from {env_file}")
                        break

            logger.info(f"✅ Tunnel {worktree_name} completely destroyed")
            return True

        except Exception as e:
            logger.error(f"Error destroying tunnel: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    def get_all_tunnels(self) -> Dict[str, TunnelConfig]:
        """Get all configured tunnels"""
        return self.tunnels


# ============================================================================
# Integration with Service
# ============================================================================

def create_cloudflare_manager() -> Optional[CloudflareManager]:
    """
    Create Cloudflare manager from environment variables

    Required env vars:
    - CLOUDFLARE_API_TOKEN: API token with DNS edit permissions
    - CLOUDFLARE_ZONE_ID: Zone ID for domain

    Optional env vars:
    - CLOUDFLARE_DOMAIN: Domain to use (default: arch.ie)
    - CLOUDFLARE_TUNNEL_DIR: Directory for tunnel configs
    """
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    zone_id = os.getenv("CLOUDFLARE_ZONE_ID")

    if not api_token or not zone_id:
        logger.warning("Cloudflare credentials not set, tunnel management disabled")
        return None

    domain = os.getenv("CLOUDFLARE_DOMAIN", "arch.ie")
    tunnel_dir = os.getenv(
        "CLOUDFLARE_TUNNEL_DIR",
        "/home/archiedev/.claude/worktree-monitor/tunnels"
    )

    return CloudflareManager(
        api_token=api_token,
        zone_id=zone_id,
        domain=domain,
        tunnel_dir=tunnel_dir
    )
