from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import redis

from app.core.config import get_settings
from app.services.storage_service import StorageService
from app.models.job_status import JobStatus as JobStatusEnum

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)
storage = StorageService()
router = APIRouter()


class JobStatus(BaseModel):
    status: str
    progress: int
    current_step: str
    created_at: Optional[str] = None


class TestCasesResponse(BaseModel):
    test_cases: Dict[str, Any]
    download_url: str


class ResultsResponse(BaseModel):
    results: Dict[str, Any]
    download_url: str


@router.get("/{job_id}/status", response_model=JobStatus)
async def get_job_status(job_id: str):
    """
    Get the current status of a job.

    Args:
        job_id: The job identifier

    Returns:
        Job status information
    """
    job_key = f"jobs:{job_id}"

    if not redis_client.exists(job_key):
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = redis_client.hgetall(job_key)

    # Convert bytes to strings
    job_data = {k.decode('utf-8'): v.decode('utf-8') for k, v in job_data.items()}

    return JobStatus(
        status=job_data.get("status", "unknown"),
        progress=int(job_data.get("progress", 0)),
        current_step=job_data.get("current_step", ""),
        created_at=job_data.get("created_at")
    )


@router.get("/{job_id}/test-cases", response_model=TestCasesResponse)
async def get_test_cases(job_id: str):
    """
    Get generated test cases for a job.

    Args:
        job_id: The job identifier

    Returns:
        Test cases and download URL
    """
    # Check job status
    job_key = f"jobs:{job_id}"
    if not redis_client.exists(job_key):
        raise HTTPException(status_code=404, detail="Job not found")

    status = redis_client.hget(job_key, "status").decode('utf-8')
    if status not in [JobStatusEnum.COMPLETED.value, JobStatusEnum.GENERATED.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed yet. Current status: {status}"
        )

    # Load test cases from storage
    test_cases = storage.load_test_cases(job_id)
    if not test_cases:
        raise HTTPException(status_code=404, detail="Test cases not found")

    return TestCasesResponse(
        test_cases=test_cases,
        download_url=f"/api/jobs/{job_id}/download/test-cases"
    )


@router.get("/{job_id}/results", response_model=ResultsResponse)
async def get_results(job_id: str):
    """
    Get test execution results for a job.

    Args:
        job_id: The job identifier

    Returns:
        Test results and download URL
    """
    # Check job status
    job_key = f"jobs:{job_id}"
    if not redis_client.exists(job_key):
        raise HTTPException(status_code=404, detail="Job not found")

    status = redis_client.hget(job_key, "status").decode('utf-8')
    # Allow retrieving results for any finished job (passed, unsuccessful, failed, or legacy completed)
    if status not in JobStatusEnum.terminal_statuses():
        raise HTTPException(
            status_code=400,
            detail=f"Job has not finished yet. Current status: {status}"
        )

    # Load results from storage
    results = storage.load_results(job_id)
    if not results:
        raise HTTPException(status_code=404, detail="Results not found")

    return ResultsResponse(
        results=results,
        download_url=f"/api/jobs/{job_id}/download/results"
    )


@router.get("/{job_id}/download/{file_type}")
async def download_file(job_id: str, file_type: str):
    """
    Download a file for a job.

    Args:
        job_id: The job identifier
        file_type: Type of file (test-cases, results, report)

    Returns:
        File download
    """
    # Map file type to internal name
    file_type_map = {
        "test-cases": "test_cases",
        "results": "results",
        "report": "report"
    }

    internal_type = file_type_map.get(file_type)
    if not internal_type:
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Get file path
    file_path = storage.get_file_path(job_id, internal_type)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")

    # Determine media type and filename
    media_type_map = {
        "test_cases": "application/json",
        "results": "application/json",
        "report": "text/markdown"
    }
    filename_map = {
        "test_cases": f"test_cases_{job_id}.json",
        "results": f"results_{job_id}.json",
        "report": f"report_{job_id}.md"
    }

    return FileResponse(
        path=file_path,
        media_type=media_type_map[internal_type],
        filename=filename_map[internal_type]
    )
