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
from app.workers.tasks import review_pr_task

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)
router = APIRouter()


class WatchPRRequest(BaseModel):
    """Request to add a PR to watch list."""
    pr_url: str
    github_token: Optional[str] = None


class ReviewPRRequest(BaseModel):
    """Request to trigger a new PR review."""
    pr_id: str
    github_token: Optional[str] = None
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


async def execute_sync_review(pr_id: str, github_token: Optional[str] = None) -> dict:
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
        github_service = GitHubService(github_token=github_token)
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

        # Generate review using LLM
        review_agent = PRReviewAgent()
        review_text = review_agent.generate_review(
            pr_info=pr_info,
            diff=diff,
            files=files
        )

        # Update progress
        redis_client.hset(f"pr_review:{review_id}", "progress", 80)

        # Save review to storage
        storage = StorageService()
        review_data = {
            "review_id": review_id,
            "pr_id": pr_id,
            "pr_url": pr_info["url"],
            "created_at": datetime.utcnow().isoformat(),
            "review_text": review_text,
            "status": "completed"
        }

        # Save to file storage
        storage.save_pr_review(pr_id, review_id, review_data)

        # Add review to PR's review list in Redis
        redis_client.rpush(f"pr:{pr_id}:reviews", review_id)

        # Update review status
        redis_client.hset(
            f"pr_review:{review_id}",
            mapping={
                "status": "completed",
                "progress": 100,
                "review_text_preview": review_text[:500]  # Store preview in Redis
            }
        )
        redis_client.expire(f"pr_review:{review_id}", settings.job_retention_hours * 3600)

        return {
            "review_id": review_id,
            "pr_id": pr_id,
            "status": "completed",
            "created_at": review_data["created_at"],
            "review_text": review_text
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
        github_service = GitHubService(github_token=request.github_token)
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

        redis_client.hset(f"pr:{pr_id}", mapping=pr_data)
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

    Returns:
        List of PR information
    """
    try:
        # Get all watched PR IDs
        pr_ids = redis_client.smembers("watched_prs")

        prs = []
        for pr_id_bytes in pr_ids:
            pr_id = pr_id_bytes.decode()

            # Get PR data
            pr_data = redis_client.hgetall(f"pr:{pr_id}")
            if not pr_data:
                # Clean up orphaned PR from watched list
                redis_client.srem("watched_prs", pr_id)
                continue

            # Convert to dict
            pr_info = {k.decode(): v.decode() for k, v in pr_data.items()}

            # Get review count
            review_count = redis_client.llen(f"pr:{pr_id}:reviews")
            pr_info["review_count"] = review_count

            prs.append(pr_info)

        # Sort by watching_since (most recent first)
        prs.sort(key=lambda x: x.get("watching_since", ""), reverse=True)

        return {"prs": prs}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching watched PRs: {str(e)}")


@router.get("/{pr_id}")
async def get_pr_details(pr_id: str):
    """
    Get detailed information about a specific PR including review history.

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


@router.post("/{pr_id}/review")
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
            return await execute_sync_review(pr_id, request.github_token)
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
            review_pr_task.delay(review_id, pr_id, request.github_token)

            return {
                "review_id": review_id,
                "pr_id": pr_id,
                "status": "queued"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering review: {str(e)}")


@router.get("/{pr_id}/reviews/{review_id}")
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
        # Verify PR exists
        if not redis_client.exists(f"pr:{pr_id}"):
            raise HTTPException(status_code=404, detail="PR not found")

        # Get review from storage
        from app.services.storage_service import StorageService
        storage = StorageService()

        review_data = storage.load_pr_review(pr_id, review_id)

        if not review_data:
            raise HTTPException(status_code=404, detail="Review not found")

        return review_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching review: {str(e)}")


@router.delete("/{pr_id}")
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
