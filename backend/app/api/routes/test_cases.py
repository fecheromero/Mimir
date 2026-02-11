import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import redis
import json

from app.core.config import get_settings
from app.workers.tasks import generate_test_cases_task, execute_test_cases_task

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)
router = APIRouter()


class GenerateTestCasesRequest(BaseModel):
    ticket_id: str
    ticket_description: str


class ExecuteTestCasesRequest(BaseModel):
    test_case_text: str
    url: str
    user_email: Optional[str] = None
    user_password: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    status: str


@router.post("/generate", response_model=JobResponse)
async def generate_test_cases(request: GenerateTestCasesRequest):
    """
    Generate test cases from a ticket description.

    Returns a job_id to track progress.
    """
    job_id = str(uuid.uuid4())

    # Store initial job status in Redis
    redis_client.hset(f"jobs:{job_id}", "status", "queued")
    redis_client.hset(f"jobs:{job_id}", "progress", 0)
    redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
    redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

    # Queue Celery task
    generate_test_cases_task.delay(
        job_id,
        request.ticket_id,
        request.ticket_description
    )

    return JobResponse(job_id=job_id, status="queued")


@router.post("/execute", response_model=JobResponse)
async def execute_test_cases(request: ExecuteTestCasesRequest):
    """
    Execute test cases using browser automation.

    Returns a job_id to track progress.
    """
    job_id = str(uuid.uuid4())

    # Store initial job status in Redis
    redis_client.hset(f"jobs:{job_id}", "status", "queued")
    redis_client.hset(f"jobs:{job_id}", "progress", 0)
    redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
    redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

    # Queue Celery task
    execute_test_cases_task.delay(
        job_id,
        request.test_case_text,
        request.url,
        request.user_email,
        request.user_password
    )

    return JobResponse(job_id=job_id, status="queued")


@router.post("/upload-and-execute", response_model=JobResponse)
async def upload_and_execute(
    file: UploadFile = File(...),
    url: str = None,
    user_email: Optional[str] = None,
    user_password: Optional[str] = None
):
    """
    Upload a previously generated test case file and execute it.

    Args:
        file: JSON file containing test cases
        url: Base URL to test
        user_email: Optional user email
        user_password: Optional user password
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be a JSON file")

    try:
        # Read and parse the uploaded file
        content = await file.read()
        test_cases = json.loads(content)

        # Extract test case text
        test_case_text = test_cases.get("test_case_text")
        if not test_case_text:
            raise HTTPException(
                status_code=400,
                detail="Invalid test case file format. Missing 'test_case_text'"
            )

        # Use URL from file if not provided
        if not url and "url" in test_cases:
            url = test_cases["url"]

        if not url:
            raise HTTPException(
                status_code=400,
                detail="URL is required either in the file or as a parameter"
            )

        # Create job
        job_id = str(uuid.uuid4())

        redis_client.hset(f"jobs:{job_id}", "status", "queued")
        redis_client.hset(f"jobs:{job_id}", "progress", 0)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
        redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        # Queue execution
        execute_test_cases_task.delay(
            job_id,
            test_case_text,
            url,
            user_email,
            user_password
        )

        return JobResponse(job_id=job_id, status="queued")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
