#!/bin/bash
# Verify no worktrees have docker env files tracked by git

echo "🔍 Checking Git Safety Across All Worktrees"
echo "==========================================="
echo ""

WORKTREES=(
  "excel-sidebar-epics"
  "teams-integration"
  "copilot-integration"
  "communications-service"
)

ISSUES_FOUND=0

for wt in "${WORKTREES[@]}"; do
  WORKTREE_PATH="/mnt/data/archie-platform-v2-worktrees/$wt"
  
  if [ ! -d "$WORKTREE_PATH" ]; then
    echo "⚠️  $wt - Directory not found"
    continue
  fi
  
  cd "$WORKTREE_PATH"
  
  echo "📁 $wt"
  echo "   Path: $WORKTREE_PATH"
  
  # Check for tracked .env files
  TRACKED_ENV=$(git ls-files | grep -E "^\.env$" || true)
  if [ -n "$TRACKED_ENV" ]; then
    echo "   ❌ ISSUE: .env is tracked by git"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  else
    echo "   ✅ .env not tracked"
  fi
  
  # Check for tracked docker-compose.override.yml
  TRACKED_OVERRIDE=$(git ls-files | grep "docker-compose.override.yml" || true)
  if [ -n "$TRACKED_OVERRIDE" ]; then
    echo "   ❌ ISSUE: docker-compose.override.yml is tracked"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  else
    echo "   ✅ docker-compose.override.yml not tracked"
  fi
  
  # Check for .env.local exists and is ignored
  if [ -f ".env.local" ]; then
    if git check-ignore -q .env.local; then
      echo "   ✅ .env.local exists and is gitignored"
    else
      echo "   ❌ ISSUE: .env.local exists but NOT gitignored"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  else
    echo "   ⚠️  .env.local does not exist (may need to be created)"
  fi
  
  # Check for staged .env files
  STAGED_ENV=$(git status --short | grep -E "^[AM].*\.env" || true)
  if [ -n "$STAGED_ENV" ]; then
    echo "   ❌ ISSUE: .env files staged for commit:"
    echo "$STAGED_ENV" | sed 's/^/      /'
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
  
  # Check for modified docker-compose.yml
  MODIFIED_COMPOSE=$(git status --short | grep "docker-compose.yml" || true)
  if [ -n "$MODIFIED_COMPOSE" ]; then
    echo "   ℹ️  docker-compose.yml modified (check if changes should be committed)"
  fi
  
  echo ""
done

echo "==========================================="
if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ SUCCESS: All worktrees are git-safe!"
  echo "   No .env or docker override files tracked by git"
  exit 0
else
  echo "❌ ISSUES FOUND: $ISSUES_FOUND problems detected"
  echo "   Please review and fix the issues above"
  exit 1
fi
