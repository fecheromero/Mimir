"""
API routes for PR reviews.
"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import redis
import json

from app.core.config import get_settings
from app.services.github_service import GitHubService
from app.services.github_commit_service import (
    GitHubCommitService,
    Improvement as GitHubImprovement,
    CommitResult
)
from app.workers.tasks import review_pr_task

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)
router = APIRouter()


class WatchPRRequest(BaseModel):
    """Request to add a PR to watch list."""
    pr_url: str


class ReviewPRRequest(BaseModel):
    """Request to trigger a new PR review."""
    pr_id: str
    sync: bool = True  # Execute synchronously by default


class PRInfoResponse(BaseModel):
    """PR information response."""
    id: str
    url: str
    repo: str
    number: int
    title: str
    author: str
    state: str
    created_at: str
    updated_at: str
    watching_since: str
    review_count: int


class ReviewResponse(BaseModel):
    """Review result response."""
    review_id: str
    pr_id: str
    status: str
    created_at: str
    review_text: Optional[str] = None


class ImprovementToApply(BaseModel):
    """Improvement to apply to PR."""
    id: str
    file_path: str
    diff: str
    title: str
    confidence: float


class ApplyImprovementsRequest(BaseModel):
    """Request to apply improvements to PR."""
    improvement_ids: list[str]
    improvements: list[ImprovementToApply]
    commit_message: Optional[str] = None
    review_id: Optional[str] = None  # For checking if review is outdated


async def execute_sync_review(pr_id: str) -> dict:
    """
    Execute PR review synchronously without Celery.
    Returns review results immediately.
    """
    from app.services.github_service import GitHubService
    from app.services.pr_review_agent import PRReviewAgent
    from app.services.storage_service import StorageService

    try:
        # Generate review ID
        review_id = str(uuid.uuid4())

        # Get PR info from Redis
        pr_data = redis_client.hgetall(f"pr:{pr_id}")
        if not pr_data:
            raise HTTPException(status_code=404, detail="PR not found")

        pr_info = {k.decode(): v.decode() for k, v in pr_data.items()}

        # Parse PR URL to get owner, repo, number
        github_service = GitHubService()
        owner, repo, pr_number = github_service.parse_pr_url(pr_info["url"])

        # Update review status
        redis_client.hset(
            f"pr_review:{review_id}",
            mapping={
                "pr_id": pr_id,
                "status": "processing",
                "created_at": datetime.utcnow().isoformat(),
                "progress": 20,
            }
        )
        redis_client.expire(f"pr_review:{review_id}", settings.job_retention_hours * 3600)

        # Fetch PR diff and files
        diff = github_service.get_pr_diff(owner, repo, pr_number)
        files = github_service.get_pr_files(owner, repo, pr_number)

        # Update progress
        redis_client.hset(f"pr_review:{review_id}", "progress", 40)

        # Generate structured review using LLM
        review_agent = PRReviewAgent()
        structured_review = review_agent.generate_structured_review(
            pr_info=pr_info,
            diff=diff,
            files=files
        )

        # Update progress
        redis_client.hset(f"pr_review:{review_id}", "progress", 50)

        # Also generate markdown review for backward compatibility
        review_text = review_agent.generate_review(
            pr_info=pr_info,
            diff=diff,
            files=files
        )

        # Update progress
        redis_client.hset(f"pr_review:{review_id}", "progress", 70)

        # Ask LLM for rule improvement suggestions
        rule_suggestion = review_agent.suggest_rule_improvements(
            pr_info=pr_info,
            review_text=review_text,
            diff=diff
        )

        # Update progress
        redis_client.hset(f"pr_review:{review_id}", "progress", 80)

        # Save review to storage
        storage = StorageService()
        review_data = {
            "review_id": review_id,
            "pr_id": pr_id,
            "pr_url": pr_info["url"],
            "pr_head_sha": pr_info.get("head_sha", ""),  # Track commit SHA for outdated detection
            "created_at": datetime.utcnow().isoformat(),
            "review_text": review_text,  # Markdown (backward compat)
            "review_data": structured_review,  # Structured JSON
            "status": "completed",
            "rule_suggestion": rule_suggestion
        }

        # Save to file storage
        storage.save_pr_review(pr_id, review_id, review_data)

        # Add review to PR's review list in Redis
        redis_client.rpush(f"pr:{pr_id}:reviews", review_id)

        # Update review status
        review_status_data = {
            "status": "completed",
            "progress": 100,
            "review_text_preview": review_text[:500]  # Store preview in Redis
        }

        # Add suggestion flag if present
        if rule_suggestion:
            review_status_data["has_rule_suggestion"] = "true"

        redis_client.hset(f"pr_review:{review_id}", mapping=review_status_data)
        redis_client.expire(f"pr_review:{review_id}", settings.job_retention_hours * 3600)

        return {
            "review_id": review_id,
            "pr_id": pr_id,
            "status": "completed",
            "created_at": review_data["created_at"],
            "review_text": review_text,
            "review_data": structured_review,
            "rule_suggestion": rule_suggestion
        }

    except Exception as e:
        error_msg = f"Error generating review: {str(e)}"
        if 'review_id' in locals():
            redis_client.hset(
                f"pr_review:{review_id}",
                mapping={
                    "status": "failed",
                    "error": error_msg,
                    "progress": 0
                }
            )
        raise HTTPException(status_code=500, detail=error_msg)


# ============================================================================
# Reviewer Rules Management Endpoints (MUST be before dynamic /{pr_id} routes)
# ============================================================================

class ApproveSuggestionRequest(BaseModel):
    """Request to approve a rule suggestion."""
    pr_id: str
    review_id: str
    edited_suggestion: Optional[str] = None  # User can edit before approving


class RejectSuggestionRequest(BaseModel):
    """Request to reject a rule suggestion."""
    pr_id: str
    review_id: str
    reason: Optional[str] = None


class UpdateRulesRequest(BaseModel):
    """Request to manually update reviewer rules."""
    rules_content: str


@router.get("/reviewer-rules")
async def get_reviewer_rules():
    """
    Get current reviewer rules.

    Returns:
        Current rules content
    """
    try:
        from app.services.pr_review_agent import PRReviewAgent

        with open(PRReviewAgent.RULES_FILE_PATH, 'r', encoding='utf-8') as f:
            rules_content = f.read()

        return {
            "rules": rules_content,
            "file_path": PRReviewAgent.RULES_FILE_PATH
        }

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Reviewer rules file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading rules: {str(e)}")


@router.post("/reviewer-rules/approve-suggestion")
async def approve_rule_suggestion(request: ApproveSuggestionRequest):
    """
    Approve and apply a rule suggestion to the reviewer rules file.

    Args:
        request: Approval request with optional edits

    Returns:
        Success message with updated rules
    """
    try:
        from app.services.pr_review_agent import PRReviewAgent
        from app.services.storage_service import StorageService

        # Load the review to get the suggestion
        storage = StorageService()
        review_data = storage.load_pr_review(request.pr_id, request.review_id)

        if not review_data:
            raise HTTPException(status_code=404, detail="Review not found")

        rule_suggestion = review_data.get("rule_suggestion")
        if not rule_suggestion:
            raise HTTPException(status_code=400, detail="No rule suggestion found in this review")

        # Use edited version if provided, otherwise use original suggestion
        suggestion_to_add = request.edited_suggestion or rule_suggestion.get("suggestion", "")

        if not suggestion_to_add:
            raise HTTPException(status_code=400, detail="No suggestion content to add")

        # Read current rules
        with open(PRReviewAgent.RULES_FILE_PATH, 'r', encoding='utf-8') as f:
            current_rules = f.read()

        # Append new suggestion (before the final note)
        if "---\n\n**Note**:" in current_rules:
            parts = current_rules.split("---\n\n**Note**:")
            updated_rules = f"{parts[0]}\n## Additional Guidelines\n\n{suggestion_to_add}\n\n---\n\n**Note**:{parts[1]}"
        else:
            updated_rules = f"{current_rules}\n\n## Additional Guidelines\n\n{suggestion_to_add}\n"

        # Write updated rules
        with open(PRReviewAgent.RULES_FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(updated_rules)

        # Mark suggestion as applied in Redis
        redis_client.hset(f"pr_review:{request.review_id}", "rule_suggestion_status", "approved")

        return {
            "message": "Rule suggestion approved and applied",
            "updated_rules": updated_rules
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error approving suggestion: {str(e)}")


@router.post("/reviewer-rules/reject-suggestion")
async def reject_rule_suggestion(request: RejectSuggestionRequest):
    """
    Reject a rule suggestion.

    Args:
        request: Rejection request with optional reason

    Returns:
        Success message
    """
    try:
        # Mark suggestion as rejected in Redis
        redis_client.hset(
            f"pr_review:{request.review_id}",
            mapping={
                "rule_suggestion_status": "rejected",
                "rejection_reason": request.reason or ""
            }
        )

        return {
            "message": "Rule suggestion rejected",
            "review_id": request.review_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rejecting suggestion: {str(e)}")


@router.put("/reviewer-rules")
async def update_reviewer_rules(request: UpdateRulesRequest):
    """
    Manually update reviewer rules (for direct editing by user).

    Args:
        request: New rules content

    Returns:
        Success message
    """
    try:
        from app.services.pr_review_agent import PRReviewAgent

        # Validate content is not empty
        if not request.rules_content.strip():
            raise HTTPException(status_code=400, detail="Rules content cannot be empty")

        # Write new rules
        with open(PRReviewAgent.RULES_FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(request.rules_content)

        return {
            "message": "Reviewer rules updated successfully",
            "rules": request.rules_content
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating rules: {str(e)}")


# ============================================================================
# PR Management Endpoints
# ============================================================================

@router.post("/watch")
async def watch_pr(request: WatchPRRequest):
    """
    Add a PR to the watch list.

    Args:
        request: PR URL to watch

    Returns:
        PR information
    """
    try:
        # Parse and validate PR URL
        github_service = GitHubService()
        owner, repo, pr_number = github_service.parse_pr_url(request.pr_url)

        # Fetch PR info from GitHub
        pr_info = github_service.get_pr_info(owner, repo, pr_number)

        pr_id = pr_info["id"]

        # Check if already watching
        if redis_client.exists(f"pr:{pr_id}"):
            raise HTTPException(status_code=400, detail="PR is already being watched")

        # Store PR info in Redis
        pr_data = {
            **pr_info,
            "watching_since": datetime.utcnow().isoformat()
        }

        # Convert all values to strings (Redis doesn't accept None)
        pr_data_for_redis = {
            k: str(v) if v is not None else ""
            for k, v in pr_data.items()
        }

        redis_client.hset(f"pr:{pr_id}", mapping=pr_data_for_redis)
        redis_client.expire(f"pr:{pr_id}", settings.job_retention_hours * 3600 * 30)  # 30 days

        # Add to watched list
        redis_client.sadd("watched_prs", pr_id)

        return {
            "message": "PR added to watch list",
            "pr_id": pr_id,
            "pr_info": pr_data
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching PR: {str(e)}")


@router.get("/watched")
async def get_watched_prs():
    """
    Get list of all watched PRs.

    Fetches fresh PR data from GitHub to ensure merged status is current.

    Returns:
        List of PR information
    """
    try:
        # Get all watched PR IDs
        pr_ids = redis_client.smembers("watched_prs")

        prs = []
        github_service = GitHubService()

        for pr_id_bytes in pr_ids:
            pr_id = pr_id_bytes.decode()

            # Get cached PR data
            pr_data = redis_client.hgetall(f"pr:{pr_id}")
            if not pr_data:
                # Clean up orphaned PR from watched list
                redis_client.srem("watched_prs", pr_id)
                continue

            # Convert to dict
            pr_info = {k.decode(): v.decode() for k, v in pr_data.items()}

            # Fetch fresh PR info from GitHub to get ALL current data
            try:
                parts = pr_id.split('/')
                if len(parts) == 3:
                    owner, repo, pr_number = parts[0], parts[1], int(parts[2])
                    fresh_pr_info = github_service.get_pr_info(owner, repo, pr_number)

                    # Keep watching_since from cached data
                    watching_since = pr_info.get("watching_since", "")

                    # Replace with ALL fresh data, preserving watching_since
                    pr_info = fresh_pr_info
                    pr_info["watching_since"] = watching_since

                    # Convert values to strings for Redis
                    pr_data_for_redis = {
                        k: str(v) if v is not None else ""
                        for k, v in pr_info.items()
                    }

                    # Update Redis cache with ALL fresh data
                    redis_client.hset(f"pr:{pr_id}", mapping=pr_data_for_redis)
            except Exception as e:
                # If GitHub fetch fails, use cached data
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to fetch fresh PR info for {pr_id}: {str(e)}")

            # Get review count
            review_count = redis_client.llen(f"pr:{pr_id}:reviews")
            pr_info["review_count"] = review_count

            prs.append(pr_info)

        # Sort by watching_since (most recent first)
        prs.sort(key=lambda x: x.get("watching_since", ""), reverse=True)

        return {"prs": prs}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching watched PRs: {str(e)}")


# ============================================================================
# Specific PR routes (MUST be before generic /{pr_id:path} route)
# ============================================================================

@router.get("/{pr_id:path}/reviews/{review_id}")
async def get_review(pr_id: str, review_id: str):
    """
    Get a specific review result.

    Args:
        pr_id: PR identifier
        review_id: Review identifier

    Returns:
        Full review data including review text
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"=== GET REVIEW DEBUG ===")
        logger.info(f"Raw pr_id received: {repr(pr_id)}")
        logger.info(f"Raw review_id received: {repr(review_id)}")
        logger.info(f"pr_id type: {type(pr_id)}")
        logger.info(f"pr_id length: {len(pr_id)}")

        # Get review from storage (don't verify PR in Redis - it might have been unwatched)
        from app.services.storage_service import StorageService
        storage = StorageService()

        # Build expected path
        review_dir = storage.base_path / "pr_reviews" / pr_id / review_id
        file_path = review_dir / "review.json"
        logger.info(f"Looking for file at: {file_path}")
        logger.info(f"File exists: {file_path.exists()}")

        review_data = storage.load_pr_review(pr_id, review_id)

        if not review_data:
            # Debug: try to find the review file
            logger.error(f"Review not found. Searched in: {review_dir}")
            logger.error(f"Directory exists: {review_dir.exists()}")

            # List actual directory structure
            pr_reviews_dir = storage.base_path / "pr_reviews"
            logger.error(f"PR reviews base dir: {pr_reviews_dir}")
            if pr_reviews_dir.exists():
                subdirs = list(pr_reviews_dir.iterdir())
                logger.error(f"Available PR directories: {[str(d) for d in subdirs]}")

            if review_dir.exists():
                files = list(review_dir.iterdir())
                logger.error(f"Files in directory: {files}")
            raise HTTPException(status_code=404, detail=f"Review not found at: {file_path}")

        logger.info(f"Successfully loaded review {review_id}")
        return review_data

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching review: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching review: {str(e)}")


@router.get("/{pr_id:path}/reviews/{review_id}/status")
async def get_review_status(pr_id: str, review_id: str):
    """
    Get status of a review including whether it's outdated and which improvements are merged.

    Args:
        pr_id: PR identifier
        review_id: Review identifier

    Returns:
        Review status information
    """
    try:
        # Check if PR exists
        if not redis_client.exists(f"pr:{pr_id}"):
            raise HTTPException(status_code=404, detail="PR not found")

        # Load review data
        from app.services.storage_service import StorageService
        storage = StorageService()

        review_data = storage.load_pr_review(pr_id, review_id)
        if not review_data:
            raise HTTPException(status_code=404, detail="Review not found")

        # Get current PR info
        from app.services.github_service import GitHubService
        github_service = GitHubService(settings.github_token)

        parts = pr_id.split('/')
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid PR ID format")

        owner, repo, pr_number = parts[0], parts[1], int(parts[2])
        current_pr_info = github_service.get_pr_info(owner, repo, pr_number)

        # Check if review is outdated
        review_head_sha = review_data.get("pr_head_sha", "")
        current_head_sha = current_pr_info.get("head_sha", "")
        is_outdated = review_head_sha != current_head_sha and review_head_sha != ""

        # Check merged status of improvements (only for dummy improvements)
        improvements_status = []
        structured_review = review_data.get("review_data")

        if structured_review and settings.github_token:
            from app.services.github_commit_service import (
                GitHubCommitService,
                Improvement as GitHubImprovement
            )
            commit_service = GitHubCommitService(settings.github_token)

            dummy_improvements = structured_review.get("dummy_improvements", [])

            for imp in dummy_improvements:
                # Convert to GitHubImprovement for checking
                gh_improvement = GitHubImprovement(
                    id=imp["id"],
                    file_path=imp.get("file_path", ""),
                    diff=imp.get("diff", ""),
                    title=imp["title"],
                    confidence=imp.get("confidence", 0.0)
                )

                is_merged = commit_service.check_improvement_merged(pr_id, gh_improvement)

                improvements_status.append({
                    "id": imp["id"],
                    "merged": is_merged
                })

        return {
            "review_id": review_id,
            "pr_id": pr_id,
            "is_outdated": is_outdated,
            "review_head_sha": review_head_sha,
            "current_head_sha": current_head_sha,
            "improvements_status": improvements_status
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking review status: {str(e)}")


@router.post("/{pr_id:path}/review")
async def trigger_review(pr_id: str, request: ReviewPRRequest):
    """
    Trigger a new review for a PR.

    Args:
        pr_id: PR identifier
        request: Review configuration

    Returns:
        Review job information
    """
    try:
        # Verify PR exists
        if not redis_client.exists(f"pr:{pr_id}"):
            raise HTTPException(status_code=404, detail="PR not found")

        # Validate pr_id matches request
        if request.pr_id != pr_id:
            raise HTTPException(status_code=400, detail="PR ID mismatch")

        if request.sync:
            # Execute immediately and return results
            return await execute_sync_review(pr_id)
        else:
            # Queue Celery task (async execution)
            review_id = str(uuid.uuid4())

            # Store initial review status
            redis_client.hset(
                f"pr_review:{review_id}",
                mapping={
                    "pr_id": pr_id,
                    "status": "queued",
                    "created_at": datetime.utcnow().isoformat(),
                    "progress": 0
                }
            )
            redis_client.expire(f"pr_review:{review_id}", settings.job_retention_hours * 3600)

            # Queue task
            review_pr_task.delay(review_id, pr_id)

            return {
                "review_id": review_id,
                "pr_id": pr_id,
                "status": "queued"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering review: {str(e)}")


@router.delete("/{pr_id:path}/reviews/{review_id}")
async def delete_review(pr_id: str, review_id: str):
    """
    Delete a specific review.

    Args:
        pr_id: PR identifier
        review_id: Review identifier

    Returns:
        Success message
    """
    try:
        import logging
        import shutil
        logger = logging.getLogger(__name__)

        # Delete from Redis
        redis_client.delete(f"pr_review:{review_id}")

        # Remove from PR's review list
        redis_client.lrem(f"pr:{pr_id}:reviews", 0, review_id)

        # Delete review files from storage
        from app.services.storage_service import StorageService
        storage = StorageService()
        review_dir = storage.base_path / "pr_reviews" / pr_id / review_id

        if review_dir.exists():
            shutil.rmtree(review_dir)
            logger.info(f"Deleted review directory: {review_dir}")

        return {
            "message": "Review deleted successfully",
            "review_id": review_id
        }

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error deleting review: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting review: {str(e)}")


# ============================================================================
# Generic PR routes (MUST be after specific routes)
# ============================================================================

@router.get("/{pr_id:path}")
async def get_pr_details(pr_id: str):
    """
    Get detailed information about a specific PR including review history.

    Fetches fresh PR data from GitHub to ensure merged status is current.

    Args:
        pr_id: PR identifier (owner/repo/number)

    Returns:
        PR details with reviews
    """
    try:
        # Get PR data
        pr_data = redis_client.hgetall(f"pr:{pr_id}")
        if not pr_data:
            raise HTTPException(status_code=404, detail="PR not found")

        pr_info = {k.decode(): v.decode() for k, v in pr_data.items()}

        # Fetch fresh PR info from GitHub to get current state and all latest data
        try:
            github_service = GitHubService()
            parts = pr_id.split('/')
            if len(parts) == 3:
                owner, repo, pr_number = parts[0], parts[1], int(parts[2])
                fresh_pr_info = github_service.get_pr_info(owner, repo, pr_number)

                # Update ALL fields from fresh GitHub data (keep watching_since from cache)
                watching_since = pr_info.get("watching_since", "")

                # Replace pr_info with fresh data, preserving watching_since
                pr_info = fresh_pr_info
                pr_info["watching_since"] = watching_since

                # Convert values to strings for Redis (Redis doesn't accept None)
                pr_data_for_redis = {
                    k: str(v) if v is not None else ""
                    for k, v in pr_info.items()
                }

                # Update Redis cache with ALL fresh data
                redis_client.hset(f"pr:{pr_id}", mapping=pr_data_for_redis)
        except Exception as e:
            # If GitHub fetch fails, use cached data
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to fetch fresh PR info for {pr_id}: {str(e)}")

        # Get review history
        review_ids = redis_client.lrange(f"pr:{pr_id}:reviews", 0, -1)

        reviews = []
        for review_id_bytes in review_ids:
            review_id = review_id_bytes.decode()
            review_data = redis_client.hgetall(f"pr_review:{review_id}")

            if review_data:
                review_info = {k.decode(): v.decode() for k, v in review_data.items()}
                review_info["review_id"] = review_id
                reviews.append(review_info)

        # Sort reviews by created_at (most recent first)
        reviews.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return {
            "pr_info": pr_info,
            "reviews": reviews
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching PR details: {str(e)}")


@router.post("/{pr_id:path}/improvements/apply")
async def apply_improvements(pr_id: str, request: ApplyImprovementsRequest):
    """
    Apply dummy improvements to a PR and create a commit.

    Args:
        pr_id: PR identifier (owner/repo/number)
        request: Improvements to apply and optional commit message

    Returns:
        CommitResult with success status and commit details
    """
    try:
        # Check if PR exists
        if not redis_client.exists(f"pr:{pr_id}"):
            raise HTTPException(status_code=404, detail="PR not found")

        # Get current PR info to check if it's merged
        from app.services.github_service import GitHubService
        github_service = GitHubService(settings.github_token)
        parts = pr_id.split('/')

        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid PR ID format")

        owner, repo, pr_number = parts[0], parts[1], int(parts[2])
        current_pr_info = github_service.get_pr_info(owner, repo, pr_number)

        # Block if PR is merged
        if current_pr_info.get("state") == "merged" or current_pr_info.get("merged"):
            raise HTTPException(
                status_code=403,
                detail="Cannot apply improvements - PR is already merged. This PR is read-only."
            )

        # Check if review is outdated (if review_id provided)
        if request.review_id:
            from app.services.storage_service import StorageService

            storage = StorageService()
            review_data = storage.load_pr_review(pr_id, request.review_id)

            if review_data:
                # Check if review is outdated (only if review has pr_head_sha tracked)
                review_head_sha = review_data.get("pr_head_sha", "")
                current_head_sha = current_pr_info.get("head_sha", "")

                # Only check if review_head_sha exists (old reviews might not have it)
                if review_head_sha and current_head_sha and review_head_sha != current_head_sha:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot apply improvements - review is outdated. Review was generated at commit {review_head_sha[:7]}, but PR is now at {current_head_sha[:7]}. Please generate a new review."
                    )

        # Validate GitHub token
        if not settings.github_token:
            raise HTTPException(
                status_code=500,
                detail="GitHub token not configured"
            )

        # Convert Pydantic models to GitHubImprovement models
        improvements = [
            GitHubImprovement(
                id=imp.id,
                file_path=imp.file_path,
                diff=imp.diff,
                title=imp.title,
                confidence=imp.confidence
            )
            for imp in request.improvements
        ]

        # Initialize GitHub commit service
        commit_service = GitHubCommitService(settings.github_token)

        # Apply improvements and create commit
        result = commit_service.apply_improvements(
            pr_id=pr_id,
            improvements=improvements,
            commit_message=request.commit_message
        )

        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=result.error or "Failed to apply improvements"
            )

        return {
            "success": True,
            "commit_sha": result.commit_sha,
            "commit_url": result.commit_url,
            "files_changed": result.files_changed,
            "improvements_applied": len(result.improvements_applied),
            "message": f"Successfully applied {len(improvements)} improvements"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error applying improvements: {str(e)}"
        )


@router.delete("/{pr_id:path}")
async def unwatch_pr(pr_id: str):
    """
    Remove a PR from the watch list.

    Args:
        pr_id: PR identifier

    Returns:
        Success message
    """
    try:
        # Check if PR exists
        if not redis_client.exists(f"pr:{pr_id}"):
            raise HTTPException(status_code=404, detail="PR not found")

        # Remove from watched list
        redis_client.srem("watched_prs", pr_id)

        # Delete PR data
        redis_client.delete(f"pr:{pr_id}")

        # Delete reviews list
        redis_client.delete(f"pr:{pr_id}:reviews")

        # Note: We keep review files in storage for historical purposes
        # They will be cleaned up by the periodic cleanup task

        return {"message": f"PR {pr_id} removed from watch list"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unwatching PR: {str(e)}")
