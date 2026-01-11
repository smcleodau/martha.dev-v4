#!/usr/bin/env python3
"""
Worktree Configuration Validator
Validates that each worktree has proper isolated configuration
PREVENTS DANGEROUS CONFLICTS BETWEEN WORKTREES
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# ANSI colors
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


class ConfigValidator:
    """Validates worktree configurations for isolation"""

    def __init__(self, registry_path: str):
        with open(registry_path) as f:
            self.registry = json.load(f)
        self.worktrees = self.registry["worktrees"]
        self.errors = []
        self.warnings = []
        self.successes = []

    def validate_all(self):
        """Run all validation checks"""
        print(f"\n{BLUE}🔍 Worktree Configuration Validator{RESET}")
        print(f"{BLUE}{'=' * 60}{RESET}\n")

        for worktree in self.worktrees:
            if not worktree.get("enabled", True):
                continue

            print(f"\n{BLUE}Checking: {worktree['name']}{RESET}")
            print("-" * 60)

            self.validate_env_file(worktree)
            self.validate_docker_compose(worktree)
            self.validate_port_isolation(worktree)
            self.validate_container_names(worktree)
            self.validate_network_names(worktree)
            self.validate_volume_names(worktree)

        self.print_summary()
        return len(self.errors) == 0

    def validate_env_file(self, worktree: Dict):
        """Validate .env file exists and has correct values"""
        name = worktree["name"]
        path = Path(worktree["path"]) / ".env"

        if not path.exists():
            self.errors.append(f"{name}: Missing .env file at {path}")
            print(f"  {RED}❌ .env file NOT FOUND{RESET}")
            return

        with open(path) as f:
            content = f.read()

        # Check COMPOSE_PROJECT_NAME
        match = re.search(r'^COMPOSE_PROJECT_NAME=(.+)$', content, re.MULTILINE)
        if not match:
            self.errors.append(f"{name}: Missing COMPOSE_PROJECT_NAME in .env")
            print(f"  {RED}❌ COMPOSE_PROJECT_NAME not set{RESET}")
        else:
            project_name = match.group(1).strip()
            expected = f"archie-{name}"
            if project_name != expected:
                self.errors.append(
                    f"{name}: COMPOSE_PROJECT_NAME is '{project_name}', expected '{expected}'"
                )
                print(f"  {RED}❌ COMPOSE_PROJECT_NAME: {project_name} (expected: {expected}){RESET}")
            else:
                self.successes.append(f"{name}: COMPOSE_PROJECT_NAME correct")
                print(f"  {GREEN}✅ COMPOSE_PROJECT_NAME: {project_name}{RESET}")

        # Check ports match registry
        expected_ports = worktree["ports"]
        for service, expected_port in expected_ports.items():
            port_var = f"{service.upper()}_PORT"
            match = re.search(rf'^{port_var}=(\d+)$', content, re.MULTILINE)
            if not match:
                self.warnings.append(f"{name}: Missing {port_var} in .env")
                print(f"  {YELLOW}⚠️  {port_var} not set{RESET}")
            else:
                actual_port = int(match.group(1))
                if actual_port != expected_port:
                    self.errors.append(
                        f"{name}: {port_var}={actual_port}, expected {expected_port}"
                    )
                    print(f"  {RED}❌ {port_var}: {actual_port} (expected: {expected_port}){RESET}")
                else:
                    print(f"  {GREEN}✅ {port_var}: {actual_port}{RESET}")

    def validate_docker_compose(self, worktree: Dict):
        """Validate docker-compose.yml uses environment variables"""
        name = worktree["name"]
        path = Path(worktree["path"]) / "docker-compose.yml"

        if not path.exists():
            self.errors.append(f"{name}: Missing docker-compose.yml")
            print(f"  {RED}❌ docker-compose.yml NOT FOUND{RESET}")
            return

        with open(path) as f:
            content = f.read()

        # Check project name uses environment variable
        if re.search(r'^name:\s*archie-dev\s*$', content, re.MULTILINE):
            self.errors.append(
                f"{name}: docker-compose.yml has HARDCODED 'name: archie-dev' - "
                f"MUST use ${{COMPOSE_PROJECT_NAME:-archie-dev}}"
            )
            print(f"  {RED}❌ HARDCODED project name (DANGEROUS!){RESET}")
        elif re.search(r'^name:\s*\$\{COMPOSE_PROJECT_NAME', content, re.MULTILINE):
            self.successes.append(f"{name}: docker-compose.yml uses environment variables")
            print(f"  {GREEN}✅ Project name uses env var{RESET}")
        else:
            self.warnings.append(f"{name}: docker-compose.yml project name format unusual")
            print(f"  {YELLOW}⚠️  Unusual project name format{RESET}")

        # Check container names use environment variables
        if re.search(r'container_name:\s*archie-dev-', content):
            self.errors.append(
                f"{name}: docker-compose.yml has HARDCODED container names"
            )
            print(f"  {RED}❌ HARDCODED container names (DANGEROUS!){RESET}")
        elif re.search(r'container_name:\s*\$\{COMPOSE_PROJECT_NAME', content):
            print(f"  {GREEN}✅ Container names use env var{RESET}")
        else:
            self.warnings.append(f"{name}: Container naming needs review")

        # Check ports use environment variables
        expected_ports = worktree["ports"]
        for service, port in expected_ports.items():
            port_var = f"{service.upper()}_PORT"
            if f"${{{port_var}:-{port}}}" in content or f"${{{port_var}}}" in content:
                print(f"  {GREEN}✅ {service} port uses env var{RESET}")
            elif f'"{port}:' in content or f"'{port}:" in content:
                self.errors.append(
                    f"{name}: HARDCODED port {port} in docker-compose.yml"
                )
                print(f"  {RED}❌ HARDCODED port {port} for {service}{RESET}")

    def validate_port_isolation(self, worktree: Dict):
        """Validate ports don't conflict with other worktrees"""
        name = worktree["name"]
        ports = set(worktree["ports"].values())

        for other in self.worktrees:
            if other["name"] == name or not other.get("enabled", True):
                continue

            other_ports = set(other["ports"].values())
            conflicts = ports & other_ports

            if conflicts:
                self.errors.append(
                    f"{name}: Port conflict with {other['name']}: {conflicts}"
                )
                print(f"  {RED}❌ Port conflict with {other['name']}: {conflicts}{RESET}")

        if not conflicts:
            print(f"  {GREEN}✅ No port conflicts{RESET}")

    def validate_container_names(self, worktree: Dict):
        """Validate container names don't conflict"""
        name = worktree["name"]
        containers = set(worktree["containers"].values())

        for other in self.worktrees:
            if other["name"] == name or not other.get("enabled", True):
                continue

            other_containers = set(other["containers"].values())
            conflicts = containers & other_containers

            if conflicts:
                self.errors.append(
                    f"{name}: Container name conflict with {other['name']}: {conflicts}"
                )
                print(f"  {RED}❌ Container conflict with {other['name']}{RESET}")

        if not conflicts:
            print(f"  {GREEN}✅ Unique container names{RESET}")

    def validate_network_names(self, worktree: Dict):
        """Validate network names don't conflict"""
        name = worktree["name"]
        network = worktree["network"]

        for other in self.worktrees:
            if other["name"] == name or not other.get("enabled", True):
                continue

            if other["network"] == network:
                self.errors.append(
                    f"{name}: Network conflict with {other['name']}: {network}"
                )
                print(f"  {RED}❌ Network conflict with {other['name']}{RESET}")
                return

        print(f"  {GREEN}✅ Unique network name{RESET}")

    def validate_volume_names(self, worktree: Dict):
        """Validate volume names don't conflict"""
        name = worktree["name"]
        volumes = set(worktree["volumes"].values())

        for other in self.worktrees:
            if other["name"] == name or not other.get("enabled", True):
                continue

            other_volumes = set(other["volumes"].values())
            conflicts = volumes & other_volumes

            if conflicts:
                self.errors.append(
                    f"{name}: Volume conflict with {other['name']}: {conflicts}"
                )
                print(f"  {RED}❌ Volume conflict with {other['name']}{RESET}")
                return

        print(f"  {GREEN}✅ Unique volume names{RESET}")

    def print_summary(self):
        """Print validation summary"""
        print(f"\n{BLUE}{'=' * 60}{RESET}")
        print(f"{BLUE}Validation Summary{RESET}")
        print(f"{BLUE}{'=' * 60}{RESET}\n")

        print(f"{GREEN}✅ Successes: {len(self.successes)}{RESET}")
        print(f"{YELLOW}⚠️  Warnings: {len(self.warnings)}{RESET}")
        print(f"{RED}❌ Errors: {len(self.errors)}{RESET}\n")

        if self.errors:
            print(f"{RED}ERRORS (MUST FIX):{RESET}")
            for error in self.errors:
                print(f"  {RED}• {error}{RESET}")
            print()

        if self.warnings:
            print(f"{YELLOW}WARNINGS (SHOULD FIX):{RESET}")
            for warning in self.warnings:
                print(f"  {YELLOW}• {warning}{RESET}")
            print()

        if len(self.errors) == 0:
            print(f"{GREEN}✅ ALL WORKTREES PROPERLY CONFIGURED!{RESET}\n")
        else:
            print(f"{RED}❌ CONFIGURATION ERRORS FOUND - FIX BEFORE STARTING WORKTREES!{RESET}\n")


def main():
    registry_path = "/home/archiedev/.claude/worktree-monitor/registry.json"

    if not os.path.exists(registry_path):
        print(f"{RED}Error: Registry not found at {registry_path}{RESET}")
        sys.exit(1)

    validator = ConfigValidator(registry_path)
    success = validator.validate_all()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
