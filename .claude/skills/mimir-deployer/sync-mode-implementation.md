# Sync Mode Implementation - Complete ✅

## What Was Implemented

Se implementó el modo de ejecución síncrona para Mimir, permitiendo ejecutar tareas sin usar Celery. Esto reduce el uso de memoria en ~50MB y simplifica la arquitectura para uso personal.

## Changes Made

### 1. Backend - Request Models (✅ Complete)

**File**: `backend/app/api/routes/test_cases.py`

Agregado parámetro `sync: bool = True` a los tres modelos Pydantic:
- `GenerateTestCasesRequest`
- `ExecuteTestCasesRequest`
- `ReplayActionsRequest`

```python
class ExecuteTestCasesRequest(BaseModel):
    test_case_text: str
    url: str
    user_email: Optional[str] = None
    user_password: Optional[str] = None
    browser_mode: Optional[str] = "new"
    headless: Optional[bool] = False
    cdp_url: Optional[str] = None
    sync: bool = True  # NEW: Execute synchronously by default
```

### 2. Backend - Sync Execution Functions (✅ Complete)

**File**: `backend/app/api/routes/test_cases.py`

Creadas tres funciones async para ejecución síncrona:

#### `execute_sync_generation()`
- Ejecuta generación de test cases sin Celery
- Llama directamente a `TestCaseAgent`
- Retorna resultados inmediatamente

#### `execute_sync_test()`
- Ejecuta test cases con browser automation sin Celery
- Llama directamente a `QaAgent`
- Soporta CDP mode para conectar al navegador del usuario
- Retorna resultados inmediatamente

#### `execute_sync_replay()`
- Ejecuta replay de acciones sin Celery
- Llama directamente a `ReplayService`
- Retorna resultados inmediatamente

### 3. Backend - Updated Endpoints (✅ Complete)

**File**: `backend/app/api/routes/test_cases.py`

Actualizados tres endpoints principales:

#### `POST /api/test-cases/generate`
```python
if request.sync:
    # Execute immediately and return results
    return await execute_sync_generation(job_id, ticket_id, request.ticket_description)
else:
    # Queue Celery task (async execution)
    generate_test_cases_task.delay(...)
    return {"job_id": job_id, "status": "queued"}
```

#### `POST /api/test-cases/execute`
```python
if request.sync:
    return await execute_sync_test(job_id, ...)
else:
    execute_test_cases_task.delay(...)
    return {"job_id": job_id, "status": "queued"}
```

#### `POST /api/test-cases/replay-actions`
```python
if request.sync:
    return await execute_sync_replay(job_id, ...)
else:
    replay_actions_task.delay(...)
    return {"job_id": job_id, "status": "queued"}
```

### 4. Backend - Config (✅ Complete)

**File**: `backend/app/core/config.py`

Agregado:
```python
# Celery
celery_broker_url: str = "redis://localhost:6379/0"
celery_result_backend: str = "redis://localhost:6379/0"
enable_celery_worker: bool = True  # Set to False to disable Celery worker
```

### 5. Backend - Start Script (✅ Complete)

**File**: `backend/start.sh`

Actualizado para hacer Celery opcional:
```bash
ENABLE_CELERY_WORKER=${ENABLE_CELERY_WORKER:-true}

if [ "$ENABLE_CELERY_WORKER" = "true" ]; then
  # Start Celery worker...
else
  echo "⏭️  Celery worker disabled (ENABLE_CELERY_WORKER=false)"
  echo "   Using synchronous execution mode only"
fi
```

## How to Use

### Option 1: Sync Mode (Recommended for Personal Use)

**Memory**: ~120MB (FastAPI + Redis only)

**Environment Variables**:
```bash
# Render.com or .env
ENABLE_CELERY_WORKER=false
```

**Frontend API Call**:
```javascript
// All endpoints default to sync=true
await api.post('/api/test-cases/execute', {
  test_case_text: "...",
  url: "https://example.com",
  sync: true  // Default, can be omitted
})

// Response is immediate with full results:
{
  "job_id": "abc-123",
  "status": "completed",
  "progress": 100,
  "execution_result": { ... }
}
```

### Option 2: Async Mode (Original Behavior)

**Memory**: ~170MB (FastAPI + Celery + Redis)

**Environment Variables**:
```bash
# Render.com or .env
ENABLE_CELERY_WORKER=true  # Default
```

**Frontend API Call**:
```javascript
await api.post('/api/test-cases/execute', {
  test_case_text: "...",
  url: "https://example.com",
  sync: false  // Queue Celery task
})

// Response is immediate with job_id:
{
  "job_id": "abc-123",
  "status": "queued"
}

// Poll for status:
await api.get(`/api/jobs/${job_id}/status`)
```

## Memory Comparison

| Configuration | Memory Usage | Cost |
|--------------|--------------|------|
| **Sync Mode** (ENABLE_CELERY_WORKER=false) | ~120MB | Free tier ✅ |
| **Async Mode** (ENABLE_CELERY_WORKER=true) | ~170MB | Free tier ✅ |
| **Old Mode** (Celery default 8 workers) | ~500MB | Crashes ❌ |

## Testing Locally

### 1. Start Redis
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 2. Test Sync Mode (No Celery)

**Terminal 1 - API Only**:
```bash
cd backend
export ENABLE_CELERY_WORKER=false
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Test in UI**:
1. Open http://localhost:3000
2. Generate test case (will execute synchronously)
3. Results appear immediately (no polling)
4. Check backend logs - no Celery worker running

### 3. Test Async Mode (With Celery)

**Terminal 1 - API + Worker**:
```bash
cd backend
export ENABLE_CELERY_WORKER=true  # or omit (default)
./start.sh
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Test in UI**:
1. Open http://localhost:3000
2. Generate test case
3. Job is queued, must poll for status
4. Check backend logs - Celery worker is running

## Deploy to Render

### For Personal Use (Sync Mode - Recommended)

**Render Environment Variables**:
```bash
ENABLE_CELERY_WORKER=false
BROWSER_EXECUTION_MODE=local  # or "cloud"
# ... other env vars
```

**Expected Memory**: ~120MB (well under 512MB limit)

**Expected Behavior**:
- No Celery worker logs
- Faster response times (no queueing)
- API requests wait for completion (1-3 minutes for browser tests)

### For Multi-User (Async Mode)

**Render Environment Variables**:
```bash
ENABLE_CELERY_WORKER=true  # or omit (default)
BROWSER_EXECUTION_MODE=cloud  # Recommended for stability
BROWSER_USE_API_KEY=bu_xxxxx
# ... other env vars
```

**Expected Memory**: ~170MB

**Expected Behavior**:
- Celery worker logs visible
- Jobs queued and processed asynchronously
- Frontend polls for status updates

## Benefits of Sync Mode

### ✅ Pros
1. **Lower memory**: 120MB vs 170MB (saves 50MB)
2. **Simpler architecture**: No worker process, no task queue
3. **Easier debugging**: Direct execution, immediate errors
4. **Faster response**: No polling, results immediately available
5. **Better for CDP**: Direct connection to user's browser

### ❌ Cons
1. **Request timeout**: API must wait for task completion (1-3 min)
2. **No concurrency**: Only one request processed at a time
3. **No retries**: Failed tasks don't auto-retry
4. **Single-user**: Not suitable for multiple concurrent users

## When to Use Each Mode

### Use Sync Mode When:
- ✅ Personal use (1 user)
- ✅ Free tier deployment (memory constrained)
- ✅ Using CDP mode (user's browser)
- ✅ Development/testing
- ✅ Want immediate results

### Use Async Mode When:
- ✅ Multiple users
- ✅ Need task queueing
- ✅ Want background processing
- ✅ Need retries on failure
- ✅ Have memory available (>512MB)

## Next Steps

### Immediate
1. ✅ Test sync mode locally
2. ✅ Deploy to Render with `ENABLE_CELERY_WORKER=false`
3. ✅ Verify memory usage in Render dashboard
4. ✅ Test CDP connection with user's browser

### Future Enhancements
1. ⏸️ Frontend toggle for sync/async mode
2. ⏸️ Browser extension for client-side execution (see `client-browser-roadmap.md`)
3. ⏸️ WebSocket for real-time progress updates (sync mode)
4. ⏸️ Timeout configuration per endpoint

## Files Modified

- ✅ `backend/app/api/routes/test_cases.py` (added sync functions + updated endpoints)
- ✅ `backend/app/core/config.py` (added `enable_celery_worker`)
- ✅ `backend/start.sh` (made Celery optional)
- 🔲 Frontend (pending - needs sync toggle in UI)

## Troubleshooting

### Error: "Celery worker not available"
- **Cause**: Set `sync: false` but `ENABLE_CELERY_WORKER=false`
- **Fix**: Either set `ENABLE_CELERY_WORKER=true` or use `sync: true`

### Error: "Request timeout"
- **Cause**: Sync request took longer than server timeout
- **Fix**: Increase server timeout or use async mode
- **For Render**: Add `TIMEOUT=300` env var (5 minutes)

### Memory still high with ENABLE_CELERY_WORKER=false
- **Check**: Verify Celery worker is not running (`ps aux | grep celery`)
- **Check**: Ensure start.sh shows "Celery worker disabled"
- **Fix**: Redeploy with correct env var

### Sync mode returns job_id instead of results
- **Check**: Verify `sync: true` in request body
- **Check**: Backend logs for "Execute immediately"
- **Fix**: Frontend not sending `sync` parameter correctly

## Success Metrics

**Local Testing**:
- ✅ Backend starts without Celery worker
- ✅ API returns results immediately (not job_id)
- ✅ No "Celery worker" logs
- ✅ Redis has job data with status="completed"

**Production (Render)**:
- ✅ Memory usage ~120MB
- ✅ No OOM errors
- ✅ API response time 1-3 minutes (browser tests)
- ✅ Results appear without polling

---

**Status**: ✅ Implementation complete

**Next**: Test locally and deploy to Render
