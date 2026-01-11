#!/bin/bash
# Start worktree monitoring agents for all active worktrees

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$HOME/.claude/worktree-monitor/logs"
PID_DIR="$HOME/.claude/worktree-monitor/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

# Worktrees to monitor (excluding communications-service per user request)
declare -A WORKTREES=(
    ["teams-integration"]="/mnt/data/archie-platform-v2-worktrees/teams-integration"
    ["excel-sidebar-epics"]="/mnt/data/archie-platform-v2-worktrees/excel-sidebar-epics"
    ["copilot-integration"]="/mnt/data/archie-platform-v2-worktrees/copilot-integration"
    ["python-310-work"]="/mnt/data/archie-platform-v2-worktrees/python-310-work"
)

echo "🚀 Starting Worktree Monitoring Agents"
echo "======================================"
echo ""

for wt_name in "${!WORKTREES[@]}"; do
    wt_path="${WORKTREES[$wt_name]}"
    agent_script="$wt_path/worktree_agent.py"
    log_file="$LOG_DIR/${wt_name}-agent.log"
    pid_file="$PID_DIR/${wt_name}-agent.pid"

    # Check if agent exists
    if [ ! -f "$agent_script" ]; then
        echo "❌ $wt_name - Agent script not found at $agent_script"
        continue
    fi

    # Check if already running
    if [ -f "$pid_file" ]; then
        old_pid=$(cat "$pid_file")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            echo "⚠️  $wt_name - Already running (PID: $old_pid)"
            continue
        fi
    fi

    # Start agent
    echo "▶️  Starting $wt_name..."

    nohup "$SCRIPT_DIR/start-single-agent.sh" "$wt_name" "$wt_path" "$log_file" &
    agent_pid=$!
    echo $agent_pid > "$pid_file"

    # Wait a moment and check if it's still running
    sleep 1
    if ps -p "$agent_pid" > /dev/null 2>&1; then
        echo "   ✅ Started (PID: $agent_pid)"
        echo "   📋 Logs: $log_file"
    else
        echo "   ❌ Failed to start - check logs at $log_file"
        rm -f "$pid_file"
    fi
    echo ""
done

echo "======================================"
echo "✨ Agent startup complete"
echo ""
echo "Check status:"
echo "  curl http://localhost:20000/api/v1/worktrees | jq"
echo ""
echo "View logs:"
echo "  tail -f $LOG_DIR/*-agent.log"
