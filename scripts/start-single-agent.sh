#!/bin/bash
# Start a single worktree agent with proper permissions

WORKTREE_NAME="$1"
WORKTREE_PATH="$2"
LOG_FILE="$3"

if [ -z "$WORKTREE_NAME" ] || [ -z "$WORKTREE_PATH" ]; then
    echo "Usage: $0 <worktree-name> <worktree-path> <log-file>"
    exit 1
fi

cd "$WORKTREE_PATH"

exec sg docker -c "
export WORKTREE_NAME='$WORKTREE_NAME'
export WORKTREE_PATH='$WORKTREE_PATH'
export MONITOR_SERVICE_URL='ws://localhost:20000'
exec python3 worktree_agent.py
" >> "$LOG_FILE" 2>&1
