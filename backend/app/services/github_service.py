"""
GitHub Service for fetching PR information and diffs.
"""
import re
import requests
from typing import Optional, Tuple
from ..core.config import get_settings


class GitHubService:
    """Service for interacting with GitHub API."""

    def __init__(self, github_token: Optional[str] = None):
        """
        Initialize GitHub service.

        Args:
            github_token: Optional GitHub Personal Access Token for authenticated requests.
                         If not provided, will use unauthenticated requests (rate limited).
        """
        settings = get_settings()
        self.github_token = github_token or settings.github_token
        self.base_url = "https://api.github.com"

    def _get_headers(self) -> dict:
        """Get headers for GitHub API requests."""
        headers = {
            "Accept": "application/vnd.github.v3+json"
        }
        if self.github_token:
            headers["Authorization"] = f"token {self.github_token}"
        return headers

    def parse_pr_url(self, pr_url: str) -> Tuple[str, str, int]:
        """
        Parse GitHub PR URL to extract owner, repo, and PR number.

        Args:
            pr_url: GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)

        Returns:
            Tuple of (owner, repo, pr_number)

        Raises:
            ValueError: If URL format is invalid
        """
        pattern = r"https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)"
        match = re.match(pattern, pr_url)

        if not match:
            raise ValueError(
                "Invalid GitHub PR URL. Expected format: "
                "https://github.com/owner/repo/pull/123"
            )

        owner, repo, pr_number = match.groups()
        return owner, repo, int(pr_number)

    def get_pr_info(self, owner: str, repo: str, pr_number: int) -> dict:
        """
        Fetch PR information from GitHub API.

        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: PR number

        Returns:
            Dictionary with PR information

        Raises:
            requests.HTTPError: If API request fails
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}"
        response = requests.get(url, headers=self._get_headers(), timeout=30)
        response.raise_for_status()

        data = response.json()

        return {
            "id": f"{owner}/{repo}/{pr_number}",
            "url": data["html_url"],
            "repo": f"{owner}/{repo}",
            "owner": owner,
            "repo_name": repo,
            "number": pr_number,
            "title": data["title"],
            "body": data.get("body", ""),
            "author": data["user"]["login"],
            "state": data["state"],
            "created_at": data["created_at"],
            "updated_at": data["updated_at"],
            "mergeable": data.get("mergeable"),
            "additions": data.get("additions", 0),
            "deletions": data.get("deletions", 0),
            "changed_files": data.get("changed_files", 0),
            "base_branch": data["base"]["ref"],
            "head_branch": data["head"]["ref"],
            "head_sha": data["head"]["sha"],  # Track HEAD commit SHA
        }

    def get_pr_diff(self, owner: str, repo: str, pr_number: int) -> str:
        """
        Fetch PR diff from GitHub API.

        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: PR number

        Returns:
            Diff as string

        Raises:
            requests.HTTPError: If API request fails
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}"
        headers = self._get_headers()
        headers["Accept"] = "application/vnd.github.v3.diff"

        response = requests.get(url, headers=headers, timeout=60)
        response.raise_for_status()

        return response.text

    def get_pr_files(self, owner: str, repo: str, pr_number: int) -> list:
        """
        Fetch list of files changed in PR.

        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: PR number

        Returns:
            List of file change information

        Raises:
            requests.HTTPError: If API request fails
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}/files"
        response = requests.get(url, headers=self._get_headers(), timeout=30)
        response.raise_for_status()

        files = response.json()

        return [
            {
                "filename": f["filename"],
                "status": f["status"],  # added, removed, modified, renamed
                "additions": f["additions"],
                "deletions": f["deletions"],
                "changes": f["changes"],
                "patch": f.get("patch", ""),  # Diff patch for this file
            }
            for f in files
        ]
