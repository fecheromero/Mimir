# Proposal: Optional Synchronous Execution Mode

## Problem Statement

Current architecture uses Celery workers for all tasks, which:
- Consumes ~50MB RAM (precious on 512MB free tier)
- Adds complexity (Redis, worker process, job polling)
- Overkill for single-user personal use

## Proposed Solution

Add **optional synchronous mode** that executes tasks directly without Celery.

## Architecture Comparison

### Current (Async-only)
```
Frontend → POST /api/test-cases/generate
              → Celery task queued
              → Returns job_id
              → Poll GET /api/jobs/{id}/status
              → Eventually get results

Memory: FastAPI (100MB) + Celery Worker (50MB) + Redis (20MB) = 170MB
```

### Proposed (User choice)
```
# Async mode (default, backward compatible)
Frontend → POST /api/test-cases/generate
           → Same as current

# Sync mode (new)
Frontend → POST /api/test-cases/generate?sync=true
           → Execute immediately
           → Return results directly (or stream progress)

Memory: FastAPI (100MB) + Redis (20MB) = 120MB
Savings: 50MB (worker not needed if only using sync)
```

## Implementation Plan

### Phase 1: Backend Support

#### 1. Add sync parameter to endpoints

```python
# backend/app/api/routes/test_cases.py

class GenerateTestCasesRequest(BaseModel):
    ticket_description: str
    ticket_id: Optional[str] = None
    sync: bool = False  # NEW: Enable sync execution

@router.post("/generate")
async def generate_test_cases(request: GenerateTestCasesRequest):
    if request.sync:
        # Execute directly
        return await execute_sync_generation(request)
    else:
        # Queue Celery task (current behavior)
        return queue_async_generation(request)
```

#### 2. Create sync execution functions

```python
# backend/app/api/routes/test_cases.py

async def execute_sync_generation(request: GenerateTestCasesRequest):
    """Execute test case generation synchronously."""
    job_id = str(uuid.uuid4())
    ticket_id = request.ticket_id or f"TICKET-{str(uuid.uuid4())[:8]}"

    try:
        # Import the actual task logic
        from app.services.test_case_agent import TestCaseAgent
        from app.services.storage_service import StorageService

        # Execute directly
        agent = TestCaseAgent()
        test_case_text = agent.generate_test_case(ticket_id, request.ticket_description)

        # Save results
        test_cases = {
            "version": "1.0",
            "created_at": datetime.utcnow().isoformat(),
            "ticket_id": ticket_id,
            "test_case_text": test_case_text,
        }

        storage = StorageService()
        storage.save_test_cases(job_id, test_cases)

        # Return immediately with results
        return {
            "job_id": job_id,
            "status": "completed",
            "progress": 100,
            "test_cases": test_cases
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### 3. Apply to all endpoints

Same pattern for:
- `/api/test-cases/execute?sync=true`
- `/api/test-cases/upload-and-execute?sync=true`
- `/api/test-cases/replay-actions?sync=true`

### Phase 2: Frontend Support

#### 1. Add sync option to UI

```javascript
// frontend/src/components/TestCaseGenerator.jsx

const [useSyncMode, setUseSyncMode] = useState(true); // Default to sync for personal use

<div className="mb-4">
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={useSyncMode}
      onChange={(e) => setUseSyncMode(e.target.checked)}
      className="mr-2"
    />
    <span>Execute synchronously (faster, uses less server memory)</span>
  </label>
  <p className="text-sm text-gray-600 mt-1">
    Sync mode: Get results immediately (recommended for personal use)
  </p>
</div>
```

#### 2. Update API calls

```javascript
// frontend/src/services/api.js

export const testCasesApi = {
  generate: async (ticketDescription, sync = true) => {
    const url = sync
      ? '/api/test-cases/generate?sync=true'
      : '/api/test-cases/generate';

    const response = await api.post(url, {
      ticket_description: ticketDescription,
    });

    if (sync) {
      // Results are in response immediately
      return response.data;
    } else {
      // Old behavior: returns job_id, need to poll
      return response.data;
    }
  },
}
```

#### 3. Increase request timeout for sync

```javascript
// frontend/src/services/api.js

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for sync requests
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Phase 3: Optional - Remove Celery Worker

If using 100% sync mode:

#### Update start.sh

```bash
#!/bin/bash
# backend/start.sh

# Check if ENABLE_CELERY_WORKER env var is set
if [ "$ENABLE_CELERY_WORKER" = "true" ]; then
  echo "📦 Starting Celery worker..."
  celery -A app.core.celery_app worker \
    --loglevel=info \
    --concurrency=1 \
    --pool=solo \
    --max-tasks-per-child=10 \
    &
else
  echo "⚠️  Celery worker disabled (using sync mode)"
fi

# Start FastAPI
echo "🌐 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
```

#### In Render environment:

```bash
# Don't set ENABLE_CELERY_WORKER (or set to false)
# Worker won't start → saves 50MB RAM
```

## Progressive Enhancement Strategy

### Step 1: Add sync support (backward compatible)
- Users can choose sync or async
- No breaking changes
- Default stays async for safety

### Step 2: Make sync default for new users
- After testing proves stable
- Update documentation
- Old deployments keep working

### Step 3: Make worker optional
- Add env var to disable worker
- Document memory savings
- Keep worker enabled by default for safety

## Pros & Cons

### Pros
✅ Saves 50MB RAM (10% of free tier)
✅ Faster for simple tasks (no queue overhead)
✅ Easier debugging (errors immediate)
✅ Simpler architecture for personal use
✅ Backward compatible (async still works)
✅ User choice (can enable async for long tasks)

### Cons
❌ HTTP request can timeout (solution: increase timeout)
❌ Can't close browser tab while processing
❌ One request at a time (fine for personal use)
❌ No task retry on failure (need to handle in endpoint)

## When to Use Each Mode

### Use Sync Mode When:
- Personal use (1 user)
- Memory constrained (512MB)
- Tasks complete in < 60 seconds
- Want immediate results

### Use Async Mode When:
- Multiple concurrent users
- Long-running tasks (> 2 minutes)
- Want to close browser while processing
- Need task retries and queuing

## Memory Impact

| Configuration | Memory Usage |
|---------------|--------------|
| Current (Async only) | 170MB |
| Sync + Async (both available) | 170MB |
| Sync only (worker disabled) | 120MB |

**Savings: 50MB** by disabling worker when not needed.

## Implementation Checklist

### Backend
- [ ] Add `sync` parameter to request models
- [ ] Create `execute_sync_*` functions for each endpoint
- [ ] Extract task logic to reusable service functions
- [ ] Add error handling for sync mode
- [ ] Add timeout protection (max 2 minutes)
- [ ] Add env var `ENABLE_CELERY_WORKER`
- [ ] Update `start.sh` to conditionally start worker

### Frontend
- [ ] Add "Sync mode" checkbox to all forms
- [ ] Update API client to support sync parameter
- [ ] Increase axios timeout to 120s
- [ ] Add loading state for sync requests
- [ ] Handle sync vs async responses differently
- [ ] Update UI to show immediate results in sync mode

### Documentation
- [ ] Update SKILL.md with sync mode instructions
- [ ] Update local-development.md
- [ ] Add troubleshooting for timeouts
- [ ] Document memory savings
- [ ] Update env-templates.md with ENABLE_CELERY_WORKER

### Testing
- [ ] Test sync mode with small jobs
- [ ] Test sync mode with large jobs (timeout?)
- [ ] Test async mode still works
- [ ] Test memory usage with worker disabled
- [ ] Test error handling in sync mode

## Migration Path

### For Existing Deployments

1. **Deploy sync support** (no changes needed)
2. **Users opt-in** via checkbox
3. **Monitor memory usage**
4. **If stable, disable worker**: Set `ENABLE_CELERY_WORKER=false` in Render

### For New Deployments

1. **Default to sync mode** (better for personal use)
2. **Don't start worker** unless needed
3. **Document how to enable async** if needed later

## Alternative: Hybrid Approach

Smart auto-detection:

```python
def should_use_sync(task_type: str, estimated_time: int) -> bool:
    """Decide sync vs async based on task."""
    if estimated_time < 30:  # < 30 seconds
        return True
    if os.getenv("FORCE_ASYNC") == "true":
        return False
    if os.getenv("FORCE_SYNC") == "true":
        return True
    return False  # Default to async for safety
```

This way the system automatically chooses based on estimated task duration.

## Recommendation

**Implement in this order:**

1. ✅ **Phase 1**: Add sync support (1-2 hours)
   - Backward compatible
   - Immediate value
   - No risk

2. ✅ **Phase 2**: Add UI toggle (30 mins)
   - Let users experiment
   - Gather feedback

3. ⏸️ **Phase 3**: Make worker optional (later)
   - After proving sync works well
   - Document memory savings
   - Keep as opt-in safety

## Questions to Answer

1. **Timeout handling**: What happens if sync request takes > 2 minutes?
   - Option A: Return 504 Gateway Timeout, let user retry
   - Option B: Stream progress via SSE (Server-Sent Events)
   - Option C: Auto-fallback to async mode

2. **Error handling**: How to show errors in sync mode?
   - Return 500 with error message immediately
   - No need to poll job status

3. **Progress updates**: How to show progress in sync mode?
   - Option A: No progress (just loading spinner)
   - Option B: SSE for real-time progress
   - Option C: WebSocket (overkill)

4. **Default mode**: Sync or async?
   - For personal use: Sync
   - For multi-user: Async
   - Make configurable via env var

## Next Steps

1. Review this proposal
2. Decide on implementation scope
3. Create feature branch: `feature/sync-mode`
4. Implement Phase 1 (backend)
5. Test locally
6. Implement Phase 2 (frontend)
7. Deploy and test
8. Document
9. Consider Phase 3 (optional worker)

---

**Estimated effort**: 2-3 hours for full implementation
**Impact**: High (saves 50MB RAM, simplifies personal use)
**Risk**: Low (backward compatible)
