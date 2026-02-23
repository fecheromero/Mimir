import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.config import get_settings

settings = get_settings()


class StorageService:
    """Handle file storage for test cases and results."""

    def __init__(self):
        self.base_path = Path(settings.storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def get_job_dir(self, job_id: str) -> Path:
        """Get the directory path for a job."""
        job_dir = self.base_path / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    def save_test_cases(self, job_id: str, test_cases: Dict[str, Any]) -> str:
        """
        Save test cases to JSON file.

        Args:
            job_id: Unique job identifier
            test_cases: Test cases data

        Returns:
            File path
        """
        job_dir = self.get_job_dir(job_id)
        file_path = job_dir / "test_cases.json"

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(test_cases, f, indent=2, ensure_ascii=False)

        return str(file_path)

    def save_results(self, job_id: str, results: Dict[str, Any]) -> str:
        """
        Save test results to JSON file.

        Args:
            job_id: Unique job identifier
            results: Test results data

        Returns:
            File path
        """
        job_dir = self.get_job_dir(job_id)
        file_path = job_dir / "results.json"

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        return str(file_path)

    def save_report(self, job_id: str, report: str) -> str:
        """
        Save test report to Markdown file.

        Args:
            job_id: Unique job identifier
            report: Report content in Markdown

        Returns:
            File path
        """
        job_dir = self.get_job_dir(job_id)
        file_path = job_dir / "report.md"

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report)

        return str(file_path)

    def load_test_cases(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Load test cases from JSON file."""
        job_dir = self.get_job_dir(job_id)
        file_path = job_dir / "test_cases.json"

        if not file_path.exists():
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_results(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Load test results from JSON file."""
        job_dir = self.get_job_dir(job_id)
        file_path = job_dir / "results.json"

        if not file_path.exists():
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_report(self, job_id: str) -> Optional[str]:
        """Load test report from Markdown file."""
        job_dir = self.get_job_dir(job_id)
        file_path = job_dir / "report.md"

        if not file_path.exists():
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

    def get_file_path(self, job_id: str, file_type: str) -> Optional[Path]:
        """Get the path to a specific file type for a job."""
        job_dir = self.get_job_dir(job_id)
        file_map = {
            "test_cases": "test_cases.json",
            "results": "results.json",
            "report": "report.md"
        }

        if file_type not in file_map:
            return None

        file_path = job_dir / file_map[file_type]
        return file_path if file_path.exists() else None

    def get_pr_review_dir(self, pr_id: str, review_id: str) -> Path:
        """Get the directory path for a PR review."""
        pr_review_dir = self.base_path / "pr_reviews" / pr_id / review_id
        pr_review_dir.mkdir(parents=True, exist_ok=True)
        return pr_review_dir

    def save_pr_review(self, pr_id: str, review_id: str, review_data: Dict[str, Any]) -> str:
        """
        Save PR review to JSON file.

        Args:
            pr_id: PR identifier (owner/repo/number)
            review_id: Review identifier
            review_data: Review data including review_text

        Returns:
            File path
        """
        review_dir = self.get_pr_review_dir(pr_id, review_id)
        file_path = review_dir / "review.json"

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(review_data, f, indent=2, ensure_ascii=False)

        return str(file_path)

    def load_pr_review(self, pr_id: str, review_id: str) -> Optional[Dict[str, Any]]:
        """Load PR review from JSON file."""
        review_dir = self.base_path / "pr_reviews" / pr_id / review_id
        file_path = review_dir / "review.json"

        if not file_path.exists():
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def cleanup_old_jobs(self) -> int:
        """
        Delete job directories older than retention period.

        Returns:
            Number of jobs deleted
        """
        deleted_count = 0
        retention_seconds = settings.job_retention_hours * 3600
        cutoff_time = time.time() - retention_seconds

        for job_dir in self.base_path.iterdir():
            if not job_dir.is_dir():
                continue

            # Skip pr_reviews directory (has its own cleanup)
            if job_dir.name == "pr_reviews":
                continue

            # Check directory modification time
            dir_mtime = job_dir.stat().st_mtime
            if dir_mtime < cutoff_time:
                # Delete directory and contents
                for file in job_dir.iterdir():
                    file.unlink()
                job_dir.rmdir()
                deleted_count += 1

        return deleted_count
