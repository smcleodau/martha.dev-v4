#!/bin/bash
# Start a TypeScript worktree agent

WORKTREE_NAME="$1"
WORKTREE_PATH="$2"
SERVICE_URL="${3:-ws://localhost:20000}"

if [ -z "$WORKTREE_NAME" ] || [ -z "$WORKTREE_PATH" ]; then
    echo "Usage: $0 <worktree-name> <worktree-path> [service-url]"
    exit 1
fi

echo "Starting agent for $WORKTREE_NAME"
cd /mnt/data/martha.dev-v4
nohup npx tsx src/agents/index.ts "$WORKTREE_NAME" "$WORKTREE_PATH" "$SERVICE_URL" > "/tmp/agent-$WORKTREE_NAME.log" 2>&1 &
echo "Agent started (PID: $!)"
echo "Logs: /tmp/agent-$WORKTREE_NAME.log"
