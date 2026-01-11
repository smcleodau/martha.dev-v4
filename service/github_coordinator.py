#!/usr/bin/env python3
"""
GitHub Project Board Coordinator
Automatically updates GitHub issues and project boards based on agent events
"""

import os
import logging
from typing import Optional, Dict, List
from datetime import datetime

from github import Github, GithubException
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class GitHubConfig(BaseModel):
    """GitHub configuration"""
    token: str
    repo: str  # Format: "owner/repo"
    project_number: Optional[int] = None
    enable_auto_updates: bool = True


class GitHubCoordinator:
    """
    Coordinates GitHub project board updates from Claude Code sessions

    Features:
    - Automatic issue status updates
    - Evidence posting on issues
    - PR status tracking
    - Cross-session coordination
    - Project board automation
    """

    def __init__(self, config: GitHubConfig):
        self.config = config
        self.gh = Github(config.token)
        self.repo = self.gh.get_repo(config.repo)
        logger.info(f"✅ GitHub integration initialized: {config.repo}")

    async def handle_event(self, event: Dict):
        """
        Process event and update GitHub accordingly

        Args:
            event: Event dictionary with type, worktree, data
        """
        if not self.config.enable_auto_updates:
            logger.debug("GitHub auto-updates disabled")
            return

        event_type = event.get("type", "unknown")
        data = event.get("data", {})
        worktree = event.get("worktree", "unknown")

        try:
            if event_type == "code.committed":
                await self._handle_commit(worktree, data)
            elif event_type == "task.completed":
                await self._handle_task_completed(worktree, data)
            elif event_type == "pr.updated":
                await self._handle_pr_updated(worktree, data)
            elif event_type == "tests.passed":
                await self._handle_tests_passed(worktree, data)
            elif event_type == "claude.active":
                await self._handle_claude_active(worktree, data)

        except GithubException as e:
            logger.error(f"GitHub API error: {e}")
        except Exception as e:
            logger.error(f"Error handling event {event_type}: {e}")

    async def _handle_commit(self, worktree: str, data: Dict):
        """Handle code commit event"""
        commit_hash = data.get("commit_hash", "")
        message = data.get("message", "")
        issue_numbers = data.get("issue_numbers", [])
        files_changed = data.get("files_changed", [])

        logger.info(f"📝 Processing commit {commit_hash} from {worktree}")

        for issue_num in issue_numbers:
            try:
                issue = self.repo.get_issue(issue_num)

                # Post evidence comment
                evidence = (
                    f"🤖 **Claude Code Evidence - Commit**\n\n"
                    f"**Worktree:** `{worktree}`\n"
                    f"**Commit:** `{commit_hash}`\n"
                    f"**Message:** {message}\n"
                    f"**Files Changed:** {len(files_changed)}\n"
                    f"```\n{chr(10).join(files_changed[:10])}\n```\n"
                    f"**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                    f"_Automatically posted by Worktree Monitoring Service_"
                )

                issue.create_comment(evidence)
                logger.info(f"✅ Posted evidence to issue #{issue_num}")

                # Update labels if needed
                self._update_issue_labels(issue, worktree, "code-committed")

            except GithubException as e:
                logger.error(f"Failed to update issue #{issue_num}: {e}")

    async def _handle_task_completed(self, worktree: str, data: Dict):
        """Handle task completion event"""
        task = data.get("task", "")
        issue_number = data.get("issue_number")
        evidence = data.get("evidence", "")
        pr_number = data.get("pr_number")

        if not issue_number:
            return

        logger.info(f"✅ Processing task completion for issue #{issue_number}")

        try:
            issue = self.repo.get_issue(issue_number)

            # Post completion evidence
            completion_comment = (
                f"🎉 **Task Completed by Claude Code**\n\n"
                f"**Worktree:** `{worktree}`\n"
                f"**Task:** {task}\n"
                f"**Evidence:**\n{evidence}\n\n"
                f"**PR:** #{pr_number if pr_number else 'N/A'}\n"
                f"**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                f"_Ready for human review_\n\n"
                f"_Automatically posted by Worktree Monitoring Service_"
            )

            issue.create_comment(completion_comment)

            # Update labels
            self._update_issue_labels(issue, worktree, "completed")

            logger.info(f"✅ Posted completion evidence to issue #{issue_number}")

        except GithubException as e:
            logger.error(f"Failed to update issue #{issue_number}: {e}")

    async def _handle_pr_updated(self, worktree: str, data: Dict):
        """Handle PR update event"""
        pr_number = data.get("pr_number")
        status = data.get("status", "")
        changes = data.get("changes", [])

        if not pr_number:
            return

        logger.info(f"🔄 Processing PR #{pr_number} update from {worktree}")

        try:
            pr = self.repo.get_pull(pr_number)
            issue = self.repo.get_issue(pr_number)  # PRs are also issues

            # Post update comment
            update_comment = (
                f"🔄 **PR Updated by Claude Code**\n\n"
                f"**Worktree:** `{worktree}`\n"
                f"**Status:** {status}\n"
                f"**Changes:**\n"
                + "\n".join([f"- {change}" for change in changes])
                + f"\n\n**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                f"_Automatically posted by Worktree Monitoring Service_"
            )

            issue.create_comment(update_comment)

            # Update labels based on status
            if status == "ready_for_review":
                self._update_issue_labels(issue, worktree, "ready-for-review")

            logger.info(f"✅ Posted PR update to #{pr_number}")

        except GithubException as e:
            logger.error(f"Failed to update PR #{pr_number}: {e}")

    async def _handle_tests_passed(self, worktree: str, data: Dict):
        """Handle test success event"""
        issue_numbers = data.get("issue_numbers", [])
        coverage = data.get("coverage", "")
        test_count = data.get("test_count", 0)

        for issue_num in issue_numbers:
            try:
                issue = self.repo.get_issue(issue_num)

                evidence = (
                    f"✅ **Tests Passed**\n\n"
                    f"**Worktree:** `{worktree}`\n"
                    f"**Tests:** {test_count} passing\n"
                    f"**Coverage:** {coverage}\n"
                    f"**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                    f"_Automatically posted by Worktree Monitoring Service_"
                )

                issue.create_comment(evidence)
                logger.info(f"✅ Posted test results to issue #{issue_num}")

            except GithubException as e:
                logger.error(f"Failed to update issue #{issue_num}: {e}")

    async def _handle_claude_active(self, worktree: str, data: Dict):
        """Handle Claude session activity detection"""
        # Just log for now, could post periodic updates
        logger.info(f"🤖 Claude Code active in {worktree}")

    def _update_issue_labels(self, issue, worktree: str, status: str):
        """Update issue labels based on event"""
        try:
            # Add worktree label
            worktree_label = f"worktree:{worktree}"
            current_labels = [label.name for label in issue.labels]

            if worktree_label not in current_labels:
                issue.add_to_labels(worktree_label)

            # Add status label
            status_labels = {
                "code-committed": "status:in-progress",
                "completed": "status:done",
                "ready-for-review": "status:review"
            }

            if status in status_labels:
                status_label = status_labels[status]
                if status_label not in current_labels:
                    issue.add_to_labels(status_label)

            logger.debug(f"Updated labels for issue #{issue.number}")

        except GithubException as e:
            logger.warning(f"Could not update labels: {e}")

    def get_worktree_issues(self, worktree: str) -> List[Dict]:
        """Get all issues for a specific worktree"""
        try:
            label = f"worktree:{worktree}"
            issues = self.repo.get_issues(state="open", labels=[label])

            return [
                {
                    "number": issue.number,
                    "title": issue.title,
                    "state": issue.state,
                    "labels": [l.name for l in issue.labels],
                    "url": issue.html_url
                }
                for issue in issues
            ]

        except GithubException as e:
            logger.error(f"Failed to get issues for {worktree}: {e}")
            return []

    def get_repo_stats(self) -> Dict:
        """Get repository statistics"""
        try:
            open_issues = self.repo.open_issues_count
            open_prs = len(list(self.repo.get_pulls(state="open")))

            return {
                "repo": self.config.repo,
                "open_issues": open_issues,
                "open_prs": open_prs,
                "stars": self.repo.stargazers_count,
                "last_updated": datetime.now().isoformat()
            }

        except GithubException as e:
            logger.error(f"Failed to get repo stats: {e}")
            return {}


# ============================================================================
# Integration with Service
# ============================================================================

def create_github_coordinator() -> Optional[GitHubCoordinator]:
    """
    Create GitHub coordinator from environment variables

    Required env vars:
    - GITHUB_TOKEN: Personal access token
    - GITHUB_REPO: Repository (format: owner/repo)

    Optional env vars:
    - GITHUB_PROJECT_NUMBER: Project board number
    - ENABLE_AUTO_UPDATES: Enable automatic updates (default: true)
    """
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO", "heyarchie-ai/archie-platform-v2")

    if not token:
        logger.warning("GITHUB_TOKEN not set, GitHub integration disabled")
        return None

    config = GitHubConfig(
        token=token,
        repo=repo,
        project_number=int(os.getenv("GITHUB_PROJECT_NUMBER", "0")) or None,
        enable_auto_updates=os.getenv("ENABLE_AUTO_UPDATES", "true").lower() == "true"
    )

    return GitHubCoordinator(config)
