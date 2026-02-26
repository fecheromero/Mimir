import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import redis
import json

from app.core.config import get_settings
from app.workers.tasks import generate_test_cases_task, execute_test_cases_task, replay_actions_task
from app.services.status_evaluator import StatusEvaluator
from app.models.job_status import JobStatus as JobStatusEnum

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)
router = APIRouter()


class GenerateTestCasesRequest(BaseModel):
    ticket_description: str
    ticket_id: Optional[str] = None
    sync: bool = True  # Execute synchronously (no Celery queue)


class ExecuteTestCasesRequest(BaseModel):
    test_case_text: str
    url: str
    user_email: Optional[str] = None
    user_password: Optional[str] = None
    browser_mode: Optional[str] = "new"  # "new" or "existing" (CDP)
    headless: Optional[bool] = False
    cdp_url: Optional[str] = None  # CDP URL when browser_mode is "existing"
    sync: bool = True  # Execute synchronously (no Celery queue)


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
    sync: bool = True  # Execute synchronously (no Celery queue)


class JobResponse(BaseModel):
    job_id: str
    status: str


# Synchronous execution functions (no Celery)
async def execute_sync_generation(job_id: str, ticket_id: str, description: str):
    """
    Execute test case generation synchronously without Celery.
    Returns results immediately.
    """
    from app.services.test_case_agent import TestCaseAgent
    from app.services.storage_service import StorageService

    try:
        # Update status in Redis
        redis_client.hset(f"jobs:{job_id}", "status", "processing")
        redis_client.hset(f"jobs:{job_id}", "progress", 30)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Generating test cases with AI")

        # Generate test cases
        agent = TestCaseAgent()
        test_case_text = agent.generate_test_case(ticket_id, description)

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

        # Update final status
        redis_client.hset(f"jobs:{job_id}", "status", "completed")
        redis_client.hset(f"jobs:{job_id}", "progress", 100)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Test cases generated successfully")
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        return {
            "job_id": job_id,
            "status": "completed",
            "progress": 100,
            "test_cases": test_cases
        }

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        redis_client.hset(f"jobs:{job_id}", "status", "failed")
        redis_client.hset(f"jobs:{job_id}", "progress", 0)
        redis_client.hset(f"jobs:{job_id}", "current_step", error_msg)
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        return {
            "job_id": job_id,
            "status": "failed",
            "progress": 0,
            "error": error_msg
        }


async def execute_sync_test(
    job_id: str,
    test_case_text: str,
    url: str,
    user_email: str = None,
    user_password: str = None,
    browser_mode: str = "new",
    headless: bool = False,
    cdp_url: str = None
):
    """
    Execute test case synchronously without Celery.
    Returns results immediately.
    """
    from app.services.qa_agent import QaAgent
    from app.services.storage_service import StorageService
    import asyncio

    try:
        # Update status in Redis
        redis_client.hset(f"jobs:{job_id}", "status", JobStatusEnum.EXECUTING.value)
        redis_client.hset(f"jobs:{job_id}", "progress", 30)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Starting test execution")

        # Create QA agent with CDP URL if provided
        agent = QaAgent(
            base_url=url,
            email=user_email,
            password=user_password,
            browser_mode=browser_mode,
            cdp_url=cdp_url
        )

        # Execute test (connects to user's browser if CDP)
        result = await agent.run_agent(
            test_case=test_case_text,
            headless=headless
        )

        # Update progress
        redis_client.hset(f"jobs:{job_id}", "progress", 80)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Generating test report")

        # Extract results
        final_result = result.final_result() if hasattr(result, 'final_result') else "Test completed"
        raw_actions = result.model_actions() if hasattr(result, 'model_actions') else []
        raw_errors = result.errors() if hasattr(result, 'errors') else []

        # Serialize actions (same logic as tasks.py)
        def make_json_serializable(obj):
            if obj is None:
                return None
            elif hasattr(obj, 'model_dump'):
                return make_json_serializable(obj.model_dump())
            elif hasattr(obj, 'dict'):
                return make_json_serializable(obj.dict())
            elif isinstance(obj, dict):
                return {k: make_json_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [make_json_serializable(item) for item in obj]
            elif isinstance(obj, (str, int, float, bool)):
                return obj
            else:
                return str(obj)

        actions = [make_json_serializable(a) for a in raw_actions]
        errors = [make_json_serializable(e) for e in raw_errors]

        # Use StatusEvaluator to determine status
        status, _ = StatusEvaluator.evaluate_execution(
            actions=actions,
            errors=errors,
            final_report=final_result
        )

        # Save results
        execution_result = {
            "version": "1.0",
            "executed_at": datetime.utcnow().isoformat(),
            "url": url,
            "test_case_text": test_case_text,
            "final_result": final_result,
            "actions": actions,
            "errors": errors,
            "status": status
        }

        storage = StorageService()
        storage.save_results(job_id, execution_result)
        storage.save_report(job_id, final_result)

        # Update final status
        redis_client.hset(f"jobs:{job_id}", "status", status)
        redis_client.hset(f"jobs:{job_id}", "progress", 100)
        current_step = f"Test execution {status}"
        redis_client.hset(f"jobs:{job_id}", "current_step", current_step)
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        return {
            "job_id": job_id,
            "status": status,
            "progress": 100,
            "execution_result": execution_result
        }

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        redis_client.hset(f"jobs:{job_id}", "status", "failed")
        redis_client.hset(f"jobs:{job_id}", "progress", 0)
        redis_client.hset(f"jobs:{job_id}", "current_step", error_msg)
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        return {
            "job_id": job_id,
            "status": "failed",
            "progress": 0,
            "error": error_msg
        }


async def execute_sync_replay(
    job_id: str,
    actions: list,
    url: str,
    user_email: str = None,
    user_password: str = None,
    test_case_text: str = None,
    test_expectations: dict = None,
    expected_outcome: str = None,
    browser_mode: str = "new",
    headless: bool = False,
    cdp_url: str = None
):
    """
    Execute replay synchronously without Celery.
    Returns results immediately.
    """
    from app.services.replay_service import ReplayService
    from app.services.storage_service import StorageService

    try:
        # Update status in Redis
        redis_client.hset(f"jobs:{job_id}", "status", "processing")
        redis_client.hset(f"jobs:{job_id}", "progress", 30)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Replaying actions")

        # Create replay service
        replay_service = ReplayService(
            base_url=url,
            email=user_email,
            password=user_password,
            browser_mode=browser_mode,
            cdp_url=cdp_url
        )

        # Run replay
        result = await replay_service.replay_actions(
            actions,
            test_case_text=test_case_text,
            test_expectations=test_expectations,
            expected_outcome=expected_outcome,
            headless=headless
        )

        # Update progress
        redis_client.hset(f"jobs:{job_id}", "progress", 80)
        redis_client.hset(f"jobs:{job_id}", "current_step", "Generating replay report")

        # Generate report
        report_text = f"""# Test Replay Report

Test replayed at: {datetime.utcnow().isoformat()}

URL: {url}

**Status: {result['status'].upper()}**

## Summary

{result['summary']}

## Actions Executed

Total actions: {len(actions)}

## Evaluation

{result['evaluation']}
"""

        # Structure the results
        results = {
            "version": "1.0",
            "executed_at": datetime.utcnow().isoformat(),
            "url": url,
            "final_result": report_text,
            "actions": actions,
            "errors": result.get('errors', []),
            "status": result['status']
        }

        # Save to storage
        storage = StorageService()
        storage.save_results(job_id, results)
        storage.save_report(job_id, report_text)

        # Update final status
        redis_client.hset(f"jobs:{job_id}", "status", result['status'])
        redis_client.hset(f"jobs:{job_id}", "progress", 100)
        redis_client.hset(f"jobs:{job_id}", "current_step", f"Replay {result['status']}")
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        return {
            "job_id": job_id,
            "status": result['status'],
            "progress": 100,
            "execution_result": results
        }

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        redis_client.hset(f"jobs:{job_id}", "status", "failed")
        redis_client.hset(f"jobs:{job_id}", "progress", 0)
        redis_client.hset(f"jobs:{job_id}", "current_step", error_msg)
        redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

        return {
            "job_id": job_id,
            "status": "failed",
            "progress": 0,
            "error": error_msg
        }


@router.post("/generate")
async def generate_test_cases(request: GenerateTestCasesRequest):
    """
    Generate test cases from a ticket description.

    Returns a job_id to track progress, or immediate results if sync=True.
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

    # Execute synchronously or queue task based on sync parameter
    if request.sync:
        # Execute immediately and return results
        return await execute_sync_generation(job_id, ticket_id, request.ticket_description)
    else:
        # Queue Celery task (async execution)
        generate_test_cases_task.delay(
            job_id,
            ticket_id,
            request.ticket_description
        )
        return {"job_id": job_id, "status": "queued"}


@router.post("/execute")
async def execute_test_cases(request: ExecuteTestCasesRequest):
    """
    Execute test cases using browser automation.

    Returns a job_id to track progress, or immediate results if sync=True.
    """
    job_id = str(uuid.uuid4())

    # Store initial job status in Redis
    redis_client.hset(f"jobs:{job_id}", "status", "queued")
    redis_client.hset(f"jobs:{job_id}", "progress", 0)
    redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
    redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

    # Execute synchronously or queue task based on sync parameter
    if request.sync:
        # Execute immediately and return results
        return await execute_sync_test(
            job_id,
            request.test_case_text,
            request.url,
            request.user_email,
            request.user_password,
            request.browser_mode,
            request.headless,
            request.cdp_url
        )
    else:
        # Queue Celery task (async execution)
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
        return {"job_id": job_id, "status": "queued"}


@router.post("/upload-and-execute")
async def upload_and_execute(
    file: UploadFile = File(...),
    url: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None),
    user_password: Optional[str] = Form(None),
    browser_mode: Optional[str] = Form("new"),
    headless: Optional[bool] = Form(False),
    cdp_url: Optional[str] = Form(None),
    sync: bool = Form(True)
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

        # Execute synchronously or queue task based on sync parameter
        if sync:
            # Execute immediately and return results
            return await execute_sync_test(
                job_id,
                test_case_text,
                url,
                user_email,
                user_password,
                browser_mode,
                headless,
                cdp_url
            )
        else:
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
            return {"job_id": job_id, "status": "queued"}

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/upload-and-replay")
async def upload_and_replay(
    file: UploadFile = File(...),
    user_email: Optional[str] = Form(None),
    user_password: Optional[str] = Form(None),
    browser_mode: Optional[str] = Form("new"),
    headless: Optional[bool] = Form(False),
    cdp_url: Optional[str] = Form(None),
    sync: bool = Form(True)
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

        # Execute synchronously or queue task based on sync parameter
        if sync:
            # Execute immediately and return results
            return await execute_sync_replay(
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
        else:
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
            return {"job_id": job_id, "status": "queued"}

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/replay-actions")
async def replay_actions(request: ReplayActionsRequest):
    """
    Replay actions from a previous test execution without LLM.

    Args:
        request: Actions to replay along with URL and credentials

    Returns:
        job_id to track replay progress, or immediate results if sync=True
    """
    job_id = str(uuid.uuid4())

    # Store initial job status in Redis
    redis_client.hset(f"jobs:{job_id}", "status", "queued")
    redis_client.hset(f"jobs:{job_id}", "progress", 0)
    redis_client.hset(f"jobs:{job_id}", "current_step", "Job queued")
    redis_client.hset(f"jobs:{job_id}", "created_at", datetime.utcnow().isoformat())
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)

    # Execute synchronously or queue task based on sync parameter
    if request.sync:
        # Execute immediately and return results
        return await execute_sync_replay(
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
    else:
        # Queue replay task (async execution)
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
        return {"job_id": job_id, "status": "queued"}
