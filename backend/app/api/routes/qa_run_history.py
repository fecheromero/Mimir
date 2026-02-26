from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.services.qa_run_history_service import QARunHistoryService

router = APIRouter()
history_service = QARunHistoryService()


class QARunResponse(BaseModel):
    run_id: str
    job_id: str
    name: str
    status: str
    job_type: str
    timestamp: str
    parent_run_id: str
    replay_count: int
    replays: List[Dict[str, Any]] = []


class QARunListResponse(BaseModel):
    runs: List[Dict[str, Any]]


@router.get("/", response_model=QARunListResponse)
async def get_all_runs():
    """
    Get all QA runs in history, sorted by timestamp (newest first).
    Runs are organized with replays nested under their parent runs.
    """
    runs = history_service.get_all_runs()
    return {"runs": runs}


@router.get("/{run_id}", response_model=QARunResponse)
async def get_run(run_id: str):
    """
    Get a single QA run by ID.
    """
    run = history_service.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Get replays
     replays = run.pop("replays", [])

    return {
        **run,
        "replays": replays
    }


@router.delete("/{run_id}")
async def delete_run(run_id: str):
    """
    Delete a QA run and all its replays.
    """
    success = history_service.delete_run(run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Run not found")

    return {"message": "Run deleted successfully"}
