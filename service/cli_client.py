#!/usr/bin/env python3
"""
Worktree Monitor CLI Client
Monitor worktrees from anywhere via command line
"""

import asyncio
import json
import sys
from datetime import datetime
from typing import Optional

import websockets
import click
from rich.console import Console
from rich.table import Table
from rich.live import Live
from rich.panel import Panel
from rich.layout import Layout
from rich import box

# Configuration
SERVICE_URL = "ws://localhost:9000"
SERVICE_HTTP = "http://localhost:9000"

console = Console()

# ============================================================================
# WebSocket Client
# ============================================================================

class MonitorClient:
    """CLI client for monitoring service"""

    def __init__(self, service_url: str):
        self.service_url = service_url
        self.websocket = None
        self.client_id = f"cli_{datetime.now().timestamp()}"

    async def connect(self):
        """Connect to monitoring service"""
        ws_url = f"{self.service_url}/ws/client/{self.client_id}"
        console.print(f"[cyan]Connecting to {ws_url}...[/cyan]")

        try:
            self.websocket = await websockets.connect(ws_url)
            console.print("[green]✅ Connected to monitoring service[/green]")
            return True
        except Exception as e:
            console.print(f"[red]❌ Connection failed: {e}[/red]")
            return False

    async def subscribe(self, worktrees: list):
        """Subscribe to specific worktrees"""
        if not self.websocket:
            return

        await self.websocket.send(json.dumps({
            "command": "subscribe",
            "worktrees": worktrees
        }))

    async def send_command(self, command: str, **params):
        """Send command to service"""
        if not self.websocket:
            return

        await self.websocket.send(json.dumps({
            "command": command,
            **params
        }))

    async def receive_events(self):
        """Receive events from service"""
        try:
            async for message in self.websocket:
                yield json.loads(message)
        except websockets.exceptions.ConnectionClosed:
            console.print("[yellow]⚠️  Connection closed[/yellow]")

# ============================================================================
# CLI Commands
# ============================================================================

@click.group()
@click.option('--service', default=SERVICE_URL, help='Monitoring service URL')
@click.pass_context
def cli(ctx, service):
    """Worktree Monitoring CLI - Monitor your worktrees from anywhere"""
    ctx.ensure_object(dict)
    ctx.obj['SERVICE_URL'] = service

@cli.command()
@click.pass_context
def status(ctx):
    """Show current status of all worktrees"""
    import requests

    service_http = ctx.obj['SERVICE_URL'].replace('ws://', 'http://').replace('wss://', 'https://')

    try:
        response = requests.get(f"{service_http}/api/v1/worktrees")
        data = response.json()

        # Create status table
        table = Table(title="🔍 Worktree Status", box=box.ROUNDED)
        table.add_column("Worktree", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Last Seen", style="yellow")
        table.add_column("Version", style="magenta")
        table.add_column("Ports", style="blue")

        for wt in data['worktrees']:
            status_icon = "🟢" if wt['status'] == 'online' else "🔴"
            status_text = f"{status_icon} {wt['status']}"

            last_seen = datetime.fromisoformat(wt['last_seen'])
            time_ago = (datetime.now() - last_seen).seconds
            last_seen_str = f"{time_ago}s ago"

            ports_str = ", ".join([f"{k}:{v}" for k, v in wt['ports'].items()])

            table.add_row(
                wt['name'],
                status_text,
                last_seen_str,
                wt['agent_version'],
                ports_str
            )

        console.print(table)

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")

@cli.command()
@click.argument('worktree')
@click.pass_context
def watch(ctx, worktree):
    """Watch events from a specific worktree in real-time"""
    async def watch_worktree():
        client = MonitorClient(ctx.obj['SERVICE_URL'])

        if not await client.connect():
            return

        # Subscribe to worktree
        await client.subscribe([worktree])
        console.print(f"[cyan]👀 Watching {worktree}...[/cyan]")
        console.print("[dim]Press Ctrl+C to stop[/dim]\n")

        # Display events as they come
        async for event in client.receive_events():
            event_type = event.get('event_type', event.get('type', 'unknown'))
            timestamp = event.get('timestamp', datetime.now().isoformat())

            # Parse timestamp
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                time_str = dt.strftime('%H:%M:%S')
            except:
                time_str = timestamp

            # Color based on event type
            if 'error' in event_type or 'failed' in event_type:
                color = 'red'
                icon = '❌'
            elif 'warning' in event_type:
                color = 'yellow'
                icon = '⚠️'
            elif 'git' in event_type:
                color = 'blue'
                icon = '📝'
            elif 'container' in event_type:
                color = 'magenta'
                icon = '🐳'
            elif 'health' in event_type:
                color = 'green'
                icon = '❤️'
            else:
                color = 'white'
                icon = '📡'

            console.print(f"[{color}]{time_str} {icon} {event_type}[/{color}]")

            # Show event data
            if 'data' in event:
                console.print(f"  [dim]{json.dumps(event['data'], indent=2)}[/dim]\n")

    try:
        asyncio.run(watch_worktree())
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopped watching[/yellow]")

@cli.command()
@click.pass_context
def monitor(ctx):
    """Interactive dashboard showing all worktrees"""
    async def run_dashboard():
        client = MonitorClient(ctx.obj['SERVICE_URL'])

        if not await client.connect():
            return

        # Subscribe to all worktrees
        await client.subscribe([])  # Empty list = all worktrees

        # State for dashboard
        worktrees_state = {}
        recent_events = []

        def create_dashboard():
            """Create dashboard layout"""
            layout = Layout()
            layout.split_column(
                Layout(name="header", size=3),
                Layout(name="main"),
                Layout(name="events", size=10)
            )

            # Header
            header = Panel(
                "[bold cyan]🔍 Worktree Monitor Dashboard[/bold cyan]\n"
                f"Connected to: {ctx.obj['SERVICE_URL']}\n"
                f"[dim]Press Ctrl+C to exit[/dim]",
                box=box.ROUNDED
            )
            layout["header"].update(header)

            # Worktrees table
            table = Table(box=box.SIMPLE)
            table.add_column("Worktree", style="cyan")
            table.add_column("Status", justify="center")
            table.add_column("API", justify="center")
            table.add_column("DB", justify="center")
            table.add_column("Redis", justify="center")
            table.add_column("Events", justify="right")

            for name, state in worktrees_state.items():
                status_icon = "🟢" if state.get('status') == 'online' else "🔴"

                health = state.get('health', {})
                api = "✅" if health.get('api') == 'healthy' else "❌"
                db = "✅" if health.get('postgres') == 'healthy' else "❌"
                redis = "✅" if health.get('redis') == 'healthy' else "❌"

                event_count = state.get('event_count', 0)

                table.add_row(name, status_icon, api, db, redis, str(event_count))

            layout["main"].update(Panel(table, title="Worktrees", box=box.ROUNDED))

            # Recent events
            events_text = ""
            for event in recent_events[-8:]:
                events_text += f"{event['time']} {event['icon']} {event['worktree']}: {event['type']}\n"

            layout["events"].update(Panel(events_text or "[dim]No events yet[/dim]", title="Recent Events", box=box.ROUNDED))

            return layout

        with Live(create_dashboard(), refresh_per_second=2) as live:
            async for event in client.receive_events():
                event_type = event.get('event_type', event.get('type', 'unknown'))
                worktree = event.get('worktree', 'system')

                # Update state
                if worktree not in worktrees_state:
                    worktrees_state[worktree] = {'event_count': 0}

                worktrees_state[worktree]['event_count'] = worktrees_state[worktree].get('event_count', 0) + 1

                # Update health if health check event
                if event_type == 'health.check':
                    data = event.get('data', {})
                    if 'health' not in worktrees_state[worktree]:
                        worktrees_state[worktree]['health'] = {}
                    worktrees_state[worktree]['health'][data.get('service')] = data.get('status')

                # Add to recent events
                try:
                    dt = datetime.fromisoformat(event.get('timestamp', '').replace('Z', '+00:00'))
                    time_str = dt.strftime('%H:%M:%S')
                except:
                    time_str = datetime.now().strftime('%H:%M:%S')

                # Icon based on event type
                if 'git' in event_type:
                    icon = '📝'
                elif 'container' in event_type:
                    icon = '🐳'
                elif 'health' in event_type:
                    icon = '❤️'
                else:
                    icon = '📡'

                recent_events.append({
                    'time': time_str,
                    'icon': icon,
                    'worktree': worktree,
                    'type': event_type
                })

                # Update dashboard
                live.update(create_dashboard())

    try:
        asyncio.run(run_dashboard())
    except KeyboardInterrupt:
        console.print("\n[yellow]Dashboard stopped[/yellow]")

@cli.command()
@click.argument('worktree')
@click.argument('container')
@click.pass_context
def restart(ctx, worktree, container):
    """Restart a container in a worktree"""
    async def restart_container():
        client = MonitorClient(ctx.obj['SERVICE_URL'])

        if not await client.connect():
            return

        console.print(f"[cyan]🔄 Restarting {container} in {worktree}...[/cyan]")

        await client.send_command(
            "restart_container",
            worktree=worktree,
            container=container
        )

        console.print("[green]✅ Command sent[/green]")
        console.print("[dim]Waiting for response...[/dim]")

        # Wait for confirmation
        async for event in client.receive_events():
            if event.get('type') == 'command.sent':
                console.print("[green]✅ Container restart initiated[/green]")
                break
            elif event.get('type') == 'error':
                console.print(f"[red]❌ Error: {event.get('message')}[/red]")
                break

    try:
        asyncio.run(restart_container())
    except KeyboardInterrupt:
        console.print("\n[yellow]Cancelled[/yellow]")

@cli.command()
@click.argument('worktree')
@click.option('--limit', default=50, help='Number of events to show')
@click.pass_context
def history(ctx, worktree, limit):
    """Show event history for a worktree"""
    import requests

    service_http = ctx.obj['SERVICE_URL'].replace('ws://', 'http://').replace('wss://', 'https://')

    try:
        response = requests.get(f"{service_http}/api/v1/worktrees/{worktree}/events?limit={limit}")
        data = response.json()

        console.print(f"\n[bold cyan]📜 Event History: {worktree}[/bold cyan]\n")

        for event_data in data['events']:
            event = json.loads(event_data) if isinstance(event_data, str) else event_data

            timestamp = event.get('timestamp', '')
            event_type = event.get('type', 'unknown')

            # Parse timestamp
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                time_str = dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                time_str = timestamp

            console.print(f"[yellow]{time_str}[/yellow] [cyan]{event_type}[/cyan]")

            if 'data' in event:
                console.print(f"  [dim]{json.dumps(event['data'], indent=2)}[/dim]\n")

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")

@cli.command()
@click.pass_context
def health(ctx):
    """Check monitoring service health"""
    import requests

    service_http = ctx.obj['SERVICE_URL'].replace('ws://', 'http://').replace('wss://', 'https://')

    try:
        response = requests.get(f"{service_http}/health")
        data = response.json()

        console.print("\n[bold green]✅ Service Health[/bold green]\n")
        console.print(f"Status: {data['status']}")
        console.print(f"Version: {data['version']}")
        console.print(f"Worktrees Online: {data['worktrees_online']}")
        console.print(f"Clients Connected: {data['clients_connected']}")
        console.print(f"Timestamp: {data['timestamp']}\n")

    except Exception as e:
        console.print(f"[red]❌ Service Unhealthy: {e}[/red]")

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == '__main__':
    cli(obj={})
