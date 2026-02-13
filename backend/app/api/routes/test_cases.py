import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import redis
import json

from app.core.config import get_settings
from app.workers.tasks import generate_test_cases_task, execute_test_cases_task, replay_actions_task

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)
router = APIRouter()


class GenerateTestCasesRequest(BaseModel):
    ticket_description: str
    ticket_id: Optional[str] = None


class ExecuteTestCasesRequest(BaseModel):
    test_case_text: str
    url: str
    user_email: Optional[str] = None
    user_password: Optional[str] = None
    browser_mode: Optional[str] = "new"  # "new" or "existing" (CDP)
    headless: Optional[bool] = False
    cdp_url: Optional[str] = None  # CDP URL when browser_mode is "existing"


class ReplayActionsRequest(BaseModel):
    actions: list
    url: str
    user_email: Optional[str] = None
    user_password: Optional[str] = None
    test_case_text: Optional[str] = None  # Original test instructions
    test_expectations: Optional[dict] = None  # Expected success criteria
    expected_outcome: Optional[str] = None  # What the test should achieve
    browser_mode: Optional[str] = "new"  # "new" or "existing" (CDP)
    headless: Optional[bool] = False
    cdp_url: Optional[str] = None  # CDP URL when browser_mode is "existing"


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

    # Generate ticket_id if not provided
    ticket_id = request.ticket_id or f"TICKET-{str(uuid.uuid4())[:8]}"

    # Store initial job status in Redis
    redis_client.hset(f"jobs:{job_id}", "status", "queued")
    redis_client.hset(f"jobs:{job_id}", "progress", 0)
    redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
    redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

    # Queue Celery task
    generate_test_cases_task.delay(
        job_id,
        ticket_id,
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
        request.user_password,
        request.browser_mode,
        request.headless,
        request.cdp_url
    )

    return JobResponse(job_id=job_id, status="queued")


@router.post("/upload-and-execute", response_model=JobResponse)
async def upload_and_execute(
    file: UploadFile = File(...),
    url: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None),
    user_password: Optional[str] = Form(None),
    browser_mode: Optional[str] = Form("new"),
    headless: Optional[bool] = Form(False),
    cdp_url: Optional[str] = Form(None)
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
            user_password,
            browser_mode,
            headless,
            cdp_url
        )

        return JobResponse(job_id=job_id, status="queued")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/upload-and-replay", response_model=JobResponse)
async def upload_and_replay(
    file: UploadFile = File(...),
    user_email: Optional[str] = Form(None),
    user_password: Optional[str] = Form(None),
    browser_mode: Optional[str] = Form("new"),
    headless: Optional[bool] = Form(False),
    cdp_url: Optional[str] = Form(None)
):
    """
    Upload a replay actions file and execute it.

    Args:
        file: JSON file containing replay actions and metadata
        user_email: Optional user email (overrides file)
        user_password: Optional user password (overrides file)
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be a JSON file")

    try:
        # Read and parse the uploaded file
        content = await file.read()
        replay_data = json.loads(content)

        # Extract required fields
        actions = replay_data.get("actions")
        url = replay_data.get("url")

        if not actions or not url:
            raise HTTPException(
                status_code=400,
                detail="Invalid replay file format. Missing 'actions' or 'url'"
            )

        # Extract optional metadata
        test_case_text = replay_data.get("test_case_text")
        test_expectations = replay_data.get("test_expectations")
        expected_outcome = replay_data.get("expected_outcome")

        # Create job
        job_id = str(uuid.uuid4())

        redis_client.hset(f"jobs:{job_id}", "status", "queued")
        redis_client.hset(f"jobs:{job_id}", "progress", 0)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
        redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        # Queue replay task
        replay_actions_task.delay(
            job_id,
            actions,
            url,
            user_email,
            user_password,
            test_case_text,
            test_expectations,
            expected_outcome,
            browser_mode,
            headless,
            cdp_url
        )

        return JobResponse(job_id=job_id, status="queued")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/replay-actions", response_model=JobResponse)
async def replay_actions(request: ReplayActionsRequest):
    """
    Replay actions from a previous test execution without LLM.

    Args:
        request: Actions to replay along with URL and credentials

    Returns:
        job_id to track replay progress
    """
    job_id = str(uuid.uuid4())

    # Store initial job status in Redis
    redis_client.hset(f"jobs:{job_id}", "status", "queued")
    redis_client.hset(f"jobs:{job_id}", "progress", 0)
    redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
    redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

    # Queue replay task
    replay_actions_task.delay(
        job_id,
        request.actions,
        request.url,
        request.user_email,
        request.user_password,
        request.test_case_text,
        request.test_expectations,
        request.expected_outcome,
        request.browser_mode,
        request.headless,
        request.cdp_url
    )

    return JobResponse(job_id=job_id, status="queued")
