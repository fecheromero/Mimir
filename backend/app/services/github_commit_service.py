"""
GitHub Commit Service - Apply improvements and create commits on PR branches
"""
import base64
import re
from typing import Dict, List, Optional
from github import Github, GithubException
from github.Repository import Repository
from github.PullRequest import PullRequest
from pydantic import BaseModel


class AppliedImprovement(BaseModel):
    """Model for an applied improvement result"""
    improvement_id: str
    file_path: str
    success: bool
    error: Optional[str] = None


class CommitResult(BaseModel):
    """Model for commit creation result"""
    success: bool
    commit_sha: Optional[str] = None
    commit_url: Optional[str] = None
    files_changed: int = 0
    improvements_applied: List[AppliedImprovement] = []
    error: Optional[str] = None


class Improvement(BaseModel):
    """Improvement to apply"""
    id: str
    file_path: str
    diff: str
    title: str
    confidence: float


class GitHubCommitService:
    """Service to apply improvements and create commits via GitHub API"""

    def __init__(self, github_token: str):
        self.client = Github(github_token)

    def apply_improvements(
        self,
        pr_id: str,  # Format: "owner/repo/number"
        improvements: List[Improvement],
        commit_message: Optional[str] = None
    ) -> CommitResult:
        """
        Apply improvements and create a commit on the PR branch

        Args:
            pr_id: PR identifier (owner/repo/number)
            improvements: List of improvements to apply
            commit_message: Optional custom commit message

        Returns:
            CommitResult with success status and details
        """
        try:
            # Parse PR ID
            parts = pr_id.split('/')
            if len(parts) != 3:
                return CommitResult(
                    success=False,
                    error=f"Invalid PR ID format: {pr_id}. Expected: owner/repo/number"
                )

            owner_repo = f"{parts[0]}/{parts[1]}"
            pr_number = int(parts[2])

            # Get repository and PR
            repo = self.client.get_repo(owner_repo)
            pr = repo.get_pull(pr_number)

            # Validate improvements
            validation_error = self._validate_improvements(improvements)
            if validation_error:
                return CommitResult(success=False, error=validation_error)

            # Apply improvements to files
            file_changes = {}  # file_path -> new_content (or None for deletion)
            applied = []

            for improvement in improvements:
                try:
                    new_content = self._apply_improvement(repo, pr, improvement)
                    # None means file should be deleted
                    file_changes[improvement.file_path] = new_content
                    applied.append(AppliedImprovement(
                        improvement_id=improvement.id,
                        file_path=improvement.file_path,
                        success=True
                    ))
                except Exception as e:
                    applied.append(AppliedImprovement(
                        improvement_id=improvement.id,
                        file_path=improvement.file_path,
                        success=False,
                        error=str(e)
                    ))
                    # If any improvement fails, abort
                    return CommitResult(
                        success=False,
                        error=f"Failed to apply improvement '{improvement.title}': {str(e)}",
                        improvements_applied=applied
                    )

            # Create commit message
            if not commit_message:
                commit_message = self._generate_commit_message(improvements, pr)

            # Create commit via GitHub API
            commit_sha = self._create_commit(repo, pr, file_changes, commit_message)

            commit_url = f"{pr.html_url.rsplit('/', 1)[0]}/commits/{commit_sha}"

            return CommitResult(
                success=True,
                commit_sha=commit_sha,
                commit_url=commit_url,
                files_changed=len(file_changes),
                improvements_applied=applied
            )

        except GithubException as e:
            return CommitResult(
                success=False,
                error=f"GitHub API error: {e.data.get('message', str(e))}"
            )
        except Exception as e:
            return CommitResult(
                success=False,
                error=f"Unexpected error: {str(e)}"
            )

    def _validate_improvements(self, improvements: List[Improvement]) -> Optional[str]:
        """Validate improvements before applying"""
        if not improvements:
            return "No improvements provided"

        # Check confidence threshold (only apply high confidence)
        for imp in improvements:
            if imp.confidence < 0.85:
                return f"Improvement '{imp.title}' has low confidence ({imp.confidence}). Only apply improvements with confidence >= 0.85"

        # Check for duplicate files (multiple changes to same file)
        file_paths = [imp.file_path for imp in improvements]
        duplicates = [fp for fp in file_paths if file_paths.count(fp) > 1]
        if duplicates:
            return f"Multiple improvements target the same file: {duplicates[0]}. Apply them one at a time."

        return None

    def _apply_improvement(
        self,
        repo: Repository,
        pr: PullRequest,
        improvement: Improvement
    ) -> Optional[str]:
        """
        Apply a single improvement to a file

        Returns:
            New file content, or None if file should be deleted
        """
        # Get current file content from PR branch
        try:
            file_content = repo.get_contents(
                improvement.file_path,
                ref=pr.head.ref
            )

            if isinstance(file_content, list):
                raise ValueError(f"{improvement.file_path} is a directory, not a file")

            current_content = base64.b64decode(file_content.content).decode('utf-8')
        except GithubException as e:
            if e.status == 404:
                raise ValueError(f"File not found: {improvement.file_path}")
            raise

        # Apply diff
        new_content = self._apply_diff(current_content, improvement.diff)

        # Check if result is empty (file deletion)
        if not new_content or not new_content.strip():
            return None  # Signal file deletion

        return new_content

    def _apply_diff(self, original_content: str, diff: str) -> str:
        """
        Apply a diff to original content

        Supports simple unified diff format:
        - Lines starting with '-' are removed
        - Lines starting with '+' are added
        - Lines starting with ' ' or other are context (ignored)
        """
        original_lines = original_content.splitlines(keepends=True)
        diff_lines = diff.splitlines()

        # Parse diff to find what to remove and what to add
        removes = []
        adds = []

        for line in diff_lines:
            if line.startswith('-') and not line.startswith('---'):
                # Line to remove (strip the '-' prefix)
                removes.append(line[1:].rstrip('\n'))
            elif line.startswith('+') and not line.startswith('+++'):
                # Line to add (strip the '+' prefix)
                adds.append(line[1:].rstrip('\n'))

        # Apply changes
        result_lines = []
        i = 0
        removed_count = 0

        while i < len(original_lines):
            current_line = original_lines[i].rstrip('\n')

            # Check if this line should be removed
            should_remove = False
            for remove_line in removes:
                if current_line.strip() == remove_line.strip():
                    should_remove = True
                    removed_count += 1
                    # If we're removing, insert the additions here
                    if removed_count == 1 and adds:
                        for add_line in adds:
                            result_lines.append(add_line + '\n')
                    break

            if not should_remove:
                result_lines.append(original_lines[i])

            i += 1

        # If no removals happened but we have additions, append them
        if removed_count == 0 and adds:
            for add_line in adds:
                result_lines.append(add_line + '\n')

        return ''.join(result_lines)

    def _create_commit(
        self,
        repo: Repository,
        pr: PullRequest,
        file_changes: Dict[str, Optional[str]],
        commit_message: str
    ) -> str:
        """
        Create a commit with file changes using GitHub API

        Args:
            file_changes: Dict mapping file_path to new_content (or None for deletion)
        """
        from github import InputGitTreeElement

        # Get the current commit SHA of the PR branch
        branch = repo.get_branch(pr.head.ref)
        base_tree = repo.get_git_commit(branch.commit.sha).tree

        # Create blobs and tree elements for changed/deleted files
        tree_elements = []
        for file_path, new_content in file_changes.items():
            if new_content is None:
                # File deletion: use sha=None to remove from tree
                tree_elements.append(
                    InputGitTreeElement(
                        path=file_path,
                        mode="100644",
                        type="blob",
                        sha=None  # This removes the file
                    )
                )
            else:
                # File modification: create blob and add to tree
                blob = repo.create_git_blob(new_content, "utf-8")
                tree_elements.append(
                    InputGitTreeElement(
                        path=file_path,
                        mode="100644",  # Regular file
                        type="blob",
                        sha=blob.sha
                    )
                )

        # Create new tree
        tree = repo.create_git_tree(tree_elements, base_tree)

        # Create commit
        commit = repo.create_git_commit(
            message=commit_message,
            tree=tree,
            parents=[branch.commit.commit]
        )

        # Update branch reference
        ref = repo.get_git_ref(f"heads/{pr.head.ref}")
        ref.edit(commit.sha)

        return commit.sha

    def _generate_commit_message(
        self,
        improvements: List[Improvement],
        pr: PullRequest
    ) -> str:
        """Generate a commit message for applied improvements"""
        if len(improvements) == 1:
            return f"Apply improvement: {improvements[0].title}\n\n🤖 Generated with Mimir PR Reviewer"

        message = f"Apply {len(improvements)} dummy improvements\n\n"
        for i, imp in enumerate(improvements, 1):
            message += f"{i}. {imp.title}\n"

        message += f"\n🤖 Generated with Mimir PR Reviewer\nPR: {pr.html_url}"

        return message

    def check_improvement_merged(
        self,
        pr_id: str,
        improvement: Improvement
    ) -> bool:
        """
        Check if an improvement is already applied (merged) to the PR branch

        Args:
            pr_id: PR identifier (owner/repo/number)
            improvement: Improvement to check

        Returns:
            True if improvement is already applied, False otherwise
        """
        try:
            # Parse PR ID
            parts = pr_id.split('/')
            if len(parts) != 3:
                return False

            owner_repo = f"{parts[0]}/{parts[1]}"
            pr_number = int(parts[2])

            # Get repository and PR
            repo = self.client.get_repo(owner_repo)
            pr = repo.get_pull(pr_number)

            # Get current file content from PR branch
            try:
                file_content = repo.get_contents(
                    improvement.file_path,
                    ref=pr.head.ref
                )

                if isinstance(file_content, list):
                    return False

                current_content = base64.b64decode(file_content.content).decode('utf-8')
            except GithubException as e:
                if e.status == 404:
                    # File doesn't exist
                    # Check if improvement is a deletion (diff removes everything)
                    # In that case, it's already "merged"
                    return self._is_deletion_diff(improvement.diff)
                return False

            # Apply the improvement's diff to see what the result would be
            would_be_content = self._apply_diff(current_content, improvement.diff)

            # If applying the diff results in the same content, it's already applied
            if would_be_content is None and current_content.strip() == "":
                # Both are empty (file deletion already happened)
                return True

            if would_be_content is not None and would_be_content.strip() == current_content.strip():
                # Content matches - improvement already applied
                return True

            return False

        except Exception:
            # On any error, assume not merged
            return False

    def _is_deletion_diff(self, diff: str) -> bool:
        """Check if a diff is a complete file deletion"""
        lines = diff.splitlines()
        has_removals = any(line.startswith('-') and not line.startswith('---') for line in lines)
        has_additions = any(line.startswith('+') and not line.startswith('+++') for line in lines)
        return has_removals and not has_additions
