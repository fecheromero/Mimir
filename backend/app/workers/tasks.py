import uuid
from datetime import datetime
import asyncio
import redis
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.services.test_case_agent import TestCaseAgent
from app.services.qa_agent import QaAgent
from app.services.storage_service import StorageService

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)


def update_job_status(job_id: str, status: str, progress: int = None, current_step: str = None):
    """Update job status in Redis."""
    redis_client.hset(f"jobs:{job_id}", "status", status)
    if progress is not None:
        redis_client.hset(f"jobs:{job_id}", "progress", progress)
    if current_step:
        redis_client.hset(f"jobs:{job_id}", "current_step", current_step)
    # Set TTL of 24 hours
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)


@celery_app.task(bind=True)
def generate_test_cases_task(self, job_id: str, ticket_id: str, description: str):
    """
    Celery task to generate test cases from ticket description.

    Args:
        job_id: Unique job identifier
        ticket_id: Ticket identifier
        description: Ticket description
    """
    try:
        update_job_status(job_id, "processing", 10, "Initializing test case generation")

        # Create agent and generate test cases
        agent = TestCaseAgent()
        update_job_status(job_id, "processing", 30, "Generating test cases with AI")

        test_case_text = agent.generate_test_case(ticket_id, description)

        update_job_status(job_id, "processing", 70, "Formatting test cases")

        # Structure the test cases
        test_cases = {
            "version": "1.0",
            "created_at": datetime.utcnow().isoformat(),
            "ticket_id": ticket_id,
            "test_case_text": test_case_text,
        }

        # Save to storage
        storage = StorageService()
        storage.save_test_cases(job_id, test_cases)

        update_job_status(job_id, "completed", 100, "Test cases generated successfully")

        return {
            "job_id": job_id,
            "status": "completed",
            "test_cases": test_cases
        }

    except Exception as e:
        update_job_status(job_id, "failed", 0, f"Error: {str(e)}")
        raise


@celery_app.task(bind=True)
def execute_test_cases_task(
    self,
    job_id: str,
    test_case_text: str,
    url: str,
    user_email: str = None,
    user_password: str = None
):
    """
    Celery task to execute test cases using browser automation.

    Args:
        job_id: Unique job identifier
        test_case_text: Test case steps to execute
        url: Base URL to test
        user_email: Optional user email for login
        user_password: Optional user password for login
    """
    try:
        update_job_status(job_id, "processing", 10, "Initializing browser automation")

        # Create QA agent
        agent = QaAgent(
            base_url=url,
            email=user_email,
            password=user_password
        )

        update_job_status(job_id, "processing", 30, "Starting test execution")

        # Run tests (headless in production)
        result = asyncio.run(agent.run_agent(test_case_text, headless=True))

        update_job_status(job_id, "processing", 80, "Generating test report")

        # Extract results
        final_result = result.final_result()
        actions = result.model_actions()

        # Structure the results
        results = {
            "version": "1.0",
            "executed_at": datetime.utcnow().isoformat(),
            "url": url,
            "final_result": final_result,
            "actions": actions,
            "status": "completed"
        }

        # Save to storage
        storage = StorageService()
        storage.save_results(job_id, results)
        storage.save_report(job_id, final_result)

        update_job_status(job_id, "completed", 100, "Test execution completed")

        return {
            "job_id": job_id,
            "status": "completed",
            "results": results
        }

    except Exception as e:
        update_job_status(job_id, "failed", 0, f"Error: {str(e)}")
        raise


@celery_app.task
def cleanup_old_jobs():
    """Periodic task to cleanup old job files."""
    storage = StorageService()
    deleted_count = storage.cleanup_old_jobs()

    # Also cleanup old Redis keys
    pattern = "jobs:*"
    cursor = 0
    deleted_keys = 0

    while True:
        cursor, keys = redis_client.scan(cursor, match=pattern, count=100)
        for key in keys:
            # Check if TTL exists, if not set it
            ttl = redis_client.ttl(key)
            if ttl == -1:  # No expiration set
                redis_client.expire(key, settings.job_retention_hours * 3600)
            deleted_keys += 1

        if cursor == 0:
            break

    return {
        "deleted_files": deleted_count,
        "processed_keys": deleted_keys
    }
