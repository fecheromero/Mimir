# Deployment Troubleshooting Guide

Comprehensive troubleshooting for Render + Vercel deployment.

## ⚠️ Render Free Tier Limitation

**Background Workers are NOT available on Render's free tier** (as of 2024+).

**Solution**: We run both FastAPI and Celery worker in the same Web Service using `backend/start.sh`.

If you see errors like:
- "service type is not available for this plan"
- "Background Worker requires paid plan"

This is expected. Follow the updated deployment guide that uses a single Web Service.

## Quick Diagnostics

### Health Check Commands

```bash
# API Health
curl https://your-api.onrender.com/health

# Check if worker is running (via API)
curl https://your-api.onrender.com/api/health/celery

# Frontend
curl -I https://your-app.vercel.app

# Check CORS
curl -H "Origin: https://your-app.vercel.app" \
     -I https://your-api.onrender.com/health
```

---

## Common Issues & Solutions

### 1. "Service Unavailable" on First Request

**Symptom**: First API request after inactivity takes 30-60 seconds or fails

**Cause**: Render free tier services sleep after 15 minutes

**Solutions**:
- ✅ **Expected behavior** - just wait 30-60s for wake-up
- Use external monitor to keep alive (not recommended, wastes free tier hours)
- Upgrade to paid tier ($7/month) for always-on

**Workaround**: Add loading state in frontend:
```javascript
// frontend/src/services/api.js
export const generateTestCases = async (data) => {
  try {
    const response = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      timeout: 90000  // 90 seconds for cold start
    });
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Service is waking up, please try again in 30 seconds');
    }
    throw error;
  }
};
```

---

### 2. Build Fails: "Py_C_RECURSION_LIMIT was not declared" Error

**Symptom**: Render build logs show:
```
error: 'Py_C_RECURSION_LIMIT' was not declared in this scope
```

**Cause**: Python version too old. Some dependencies (like `aiofiles==25.1.0`) require Python 3.11+

**Solution 1**: Create `.python-version` file in repo root:
```bash
# Create file
echo "3.11" > .python-version

# Commit and push
git add .python-version
git commit -m "Specify Python 3.11 for deployment"
git push
```

**Solution 2**: Specify in Render dashboard:
1. Go to Service → Settings
2. Under "Build & Deploy" → Environment
3. Set Python version to `3.11`

**Solution 3**: Downgrade problematic dependencies:
```bash
# In requirements.txt, change:
aiofiles==24.1.0  # Instead of 25.1.0
```

### 3. Build Fails: "playwright install chromium" Error

**Symptom**: Render build logs show:
```
ERROR: Failed to install browsers
```

**Cause**: Missing system dependencies for Playwright

**Solution**: Update build command to:
```bash
pip install -r requirements.txt && playwright install --with-deps chromium
```

**If that fails**, add to `backend/requirements.txt`:
```
playwright==1.40.0
```

And use build command:
```bash
apt-get update && apt-get install -y wget && pip install -r requirements.txt && playwright install chromium
```

---

### 4. Celery Worker Not Processing Jobs

**Symptom**: Jobs stuck in "pending" state forever

**Diagnosis Steps**:

1. **Check worker logs** in Render dashboard:
   ```
   Dashboard → mimir-worker → Logs
   ```

2. **Look for these errors**:
   - `redis.exceptions.ConnectionError` → Redis URL wrong
   - `kombu.exceptions.OperationalError` → Broker URL wrong
   - `ModuleNotFoundError` → Build failed

**Solutions by Error Type**:

#### Redis Connection Error
```bash
# Verify Redis is running
Render Dashboard → mimir-redis → should show "Running"

# Check Redis URL format in worker env vars
REDIS_URL=redis://red-xxxxx:6379  # Should start with redis://

# Ensure it's the INTERNAL URL, not external
```

#### Worker Can't Import Tasks
```bash
# Check worker logs for full traceback
# Usually means build didn't install dependencies

# Fix: Update build command
pip install -r requirements.txt && playwright install chromium
```

#### Worker Running But Not Picking Up Tasks
```bash
# Check if CELERY_BROKER_URL matches between API and Worker
# They MUST be identical

# In both mimir-api AND mimir-worker env vars:
CELERY_BROKER_URL=redis://red-xxxxx:6379/0
CELERY_RESULT_BACKEND=redis://red-xxxxx:6379/0
```

---

### 5. CORS Errors in Browser Console

**Symptom**: Frontend shows:
```
Access to fetch at 'https://api.onrender.com/api/generate' from origin
'https://app.vercel.app' has been blocked by CORS policy
```

**Solution**:

1. **Add frontend URL to backend**:
   ```bash
   # In Render mimir-api environment variables
   FRONTEND_URL=https://mimir-xxxxx.vercel.app
   ```

2. **Update CORS in backend** (`backend/app/main.py`):
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   import os

   origins = [
       "http://localhost:3000",
       "http://localhost:5173",
       os.getenv("FRONTEND_URL", ""),
   ]

   app.add_middleware(
       CORSMiddleware,
       allow_origins=origins,
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Commit and push** to trigger redeploy

4. **Wait for Render to redeploy** (~2-3 minutes)

5. **Hard refresh frontend** (Cmd+Shift+R / Ctrl+Shift+F5)

---

### 6. Out of Memory (OOM) Errors

**Symptom**:
- Service crashes and restarts
- Logs show "Killed" or nothing
- Render dashboard shows "Out of Memory"
- Service becomes unresponsive

**Cause**: Render free tier has only **512MB RAM**. Memory usage breakdown:
- FastAPI (uvicorn): ~100MB
- Celery worker (default 8 processes): ~50MB per process = 400MB
- LLM client initialization: ~50-100MB
- Browser automation (if local): ~200MB per browser
- **Total**: Can easily exceed 512MB

**Solutions**:

#### Solution 1: Optimize Celery Worker (Already implemented in start.sh)

The `backend/start.sh` file is already optimized with:
```bash
celery -A app.core.celery_app worker \
  --concurrency=1 \         # Only 1 worker instead of 8
  --pool=solo \             # Single process mode (no prefork)
  --max-tasks-per-child=10  # Restart after 10 tasks (free memory)
```

This reduces Celery from ~400MB to ~50MB.

**If still experiencing OOM**, further reduce:
```bash
# Edit backend/start.sh
celery -A app.core.celery_app worker \
  --concurrency=1 \
  --pool=solo \
  --max-tasks-per-child=5   # Restart more frequently
```

#### Solution 2: Use Cloud Browser Mode (Recommended)

Browser automation is the biggest memory consumer. Use cloud mode:

```bash
# In Render environment variables
BROWSER_EXECUTION_MODE=cloud
BROWSER_USE_API_KEY=bu_xxxxxxxxxxxxx
```

This offloads browser execution to browser-use cloud, saving ~200MB.

#### Solution 3: Monitor Memory Usage

Check Render dashboard → Service → Metrics:
- If memory consistently hits 512MB → You need optimizations above
- If memory spikes then crashes → Reduce `--max-tasks-per-child`

#### Solution 4: Upgrade Render Plan (If Needed)

Free tier limits:
- **Free**: 512MB RAM (current)
- **Starter**: $7/month, 512MB RAM (same but always-on)
- **Standard**: $25/month, 2GB RAM (4x memory)

**Recommendation for personal use**: Stay on free tier with optimizations above.

#### Solution 5: Alternative Platform

If memory is consistently an issue, consider:
- **Railway**: $5 credit/month, 1GB RAM per service
- **Fly.io**: Free tier, 3x 256MB VMs (can split services)

See `alternatives.md` for details.

---

### 7. Files Disappear After Redeploy

**Symptom**: Downloaded test results are gone after pushing new code

**Cause**: Render free tier uses **ephemeral storage**

**Solutions**:

1. **Accept temporary storage** (it's free tier)
   - Download files immediately after job completes
   - Files persist for job retention period (24h) unless redeployed

2. **Add persistent storage** (requires code changes):
   - Integrate AWS S3 / Cloudflare R2 / Backblaze B2
   - Modify `StorageService` to use cloud storage

Example S3 integration:
```python
# backend/app/services/storage_service.py
import boto3

class StorageService:
    def __init__(self):
        if os.getenv("USE_S3") == "true":
            self.s3 = boto3.client('s3')
            self.bucket = os.getenv("S3_BUCKET")
        else:
            self.s3 = None

    def save_test_cases(self, job_id: str, content: dict):
        if self.s3:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=f"{job_id}/test_cases.json",
                Body=json.dumps(content)
            )
        else:
            # Original file-based logic
            ...
```

---

### 8. Vercel Build Fails

**Symptom**: Vercel deployment failed

**Common Causes**:

#### Wrong Build Command
```bash
# Correct (Vite)
npm run build

# Incorrect
npm run start  # This is for development
```

#### Wrong Output Directory
```bash
# Correct (Vite default)
dist

# Incorrect
build  # This is for Create React App
```

#### Missing Environment Variable
```bash
# Must set in Vercel
VITE_API_URL=https://your-api.onrender.com
```

#### Import Errors
Check Vercel build logs for:
```
Module not found: Can't resolve './Component'
```

Fix: Ensure case-sensitive imports match file names exactly.

---

### 9. Jobs Complete But No Results

**Symptom**: Job status shows "completed" but results are empty

**Diagnosis**:

1. **Check Celery worker logs**:
   ```
   Render → mimir-worker → Logs
   Filter for job_id
   ```

2. **Look for task exceptions**:
   - API key errors
   - Browser automation failures
   - Timeout errors

**Common Fixes**:

#### API Key Invalid
```bash
# Verify in Render env vars
ANTHROPIC_API_KEY=sk-ant-api03-...  # Check for typos
BROWSER_USE_API_KEY=bu_...

# Test key manually
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

#### Browser Timeout
```python
# backend/app/services/qa_agent.py
# Increase timeout

agent = Agent(
    task=task,
    llm=llm,
    browser_config=BrowserConfig(
        headless=True,
        disable_security=True,
    ),
    max_steps=50,  # Increase from default
    max_time=300,  # 5 minutes timeout
)
```

---

### 10. Slow Performance

**Symptom**: Jobs take 5+ minutes to complete

**Causes & Fixes**:

#### Cold Start (Normal)
- First request after sleep: 30-60s
- Solution: Accept or upgrade to paid tier

#### Slow LLM Model
```bash
# Switch to faster model
TEST_CASE_AGENT_MODEL=claude-3-5-haiku-20241022  # Faster, cheaper
# or
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o-mini  # Much cheaper
```

#### Slow Browser Automation
- Use cloud mode instead of local
- Reduce max_steps in QaAgent

#### Redis Bottleneck
- Free tier Redis is 25MB
- Check if near limit: Render → mimir-redis → Metrics
- Solution: Reduce JOB_RETENTION_HOURS

---

### 11. "Too Many Requests" Error

**Symptom**: API returns 429 error

**Cause**: Hit rate limits on LLM provider

**Solutions**:

1. **Check usage**:
   - Anthropic: https://console.anthropic.com/settings/usage
   - OpenAI: https://platform.openai.com/usage

2. **Add rate limiting** to backend:
   ```python
   # backend/app/main.py
   from slowapi import Limiter
   from slowapi.util import get_remote_address

   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter

   @app.post("/api/generate")
   @limiter.limit("5/minute")  # Max 5 requests per minute
   async def generate(...):
       ...
   ```

3. **Add retry logic**:
   ```python
   # backend/app/services/test_case_agent.py
   from tenacity import retry, wait_exponential, stop_after_attempt

   @retry(wait=wait_exponential(min=1, max=60), stop=stop_after_attempt(3))
   def generate_test_cases(self, ticket_description: str):
       ...
   ```

---

## Advanced Debugging

### Enable Debug Logging

**Backend** (Render environment variables):
```bash
LOG_LEVEL=DEBUG
CELERY_LOG_LEVEL=DEBUG
```

**Frontend** (browser console):
```javascript
localStorage.setItem('debug', 'true');
```

### Access Render Shell

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# SSH into service
render shell mimir-api

# Check logs
tail -f /var/log/app.log
```

### Monitor Redis

```bash
# In Render shell
redis-cli -h <redis-host> -p 6379

# Check memory usage
INFO memory

# List all keys
KEYS *

# Check specific job
GET celery-task-meta-<job-id>
```

### Vercel Logs

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Tail logs
vercel logs mimir --follow
```

---

## Monitoring Setup

### Basic Health Monitoring

Use a free uptime monitor:

1. **UptimeRobot** (free): https://uptimerobot.com
   - Monitor: `https://your-api.onrender.com/health`
   - Interval: 5 minutes
   - Alert: Email on downtime

2. **Better Uptime** (free tier): https://betteruptime.com
   - More features, Slack integration

### Application Monitoring

For production usage, consider:

1. **Sentry** (free tier):
   ```bash
   pip install sentry-sdk[fastapi]
   ```

   ```python
   # backend/app/main.py
   import sentry_sdk
   sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
   ```

2. **LogTail** (free tier):
   - Centralized logging
   - Better than Render's built-in logs

---

## Performance Optimization

### Reduce Cold Start Time

Add a /wake endpoint:
```python
# backend/app/main.py
@app.get("/wake")
def wake():
    return {"status": "awake"}
```

Ping it every 10 minutes with a cron job (e.g., GitHub Actions).

### Cache LLM Responses

```python
# backend/app/services/test_case_agent.py
from functools import lru_cache
import hashlib

class TestCaseAgent:
    @lru_cache(maxsize=100)
    def generate_test_cases_cached(self, ticket_hash: str):
        # Actual generation logic
        ...

    def generate_test_cases(self, ticket_description: str):
        ticket_hash = hashlib.md5(ticket_description.encode()).hexdigest()
        return self.generate_test_cases_cached(ticket_hash)
```

### Optimize Frontend Bundle

```javascript
// frontend/vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
}
```

---

## Disaster Recovery

### Backup Procedure

1. **Export environment variables** from Render/Vercel
2. **Save to password manager** or encrypted file
3. **Document external dependencies** (API keys, etc.)

### Restore Procedure

If services go down:

1. **Create new Render services** (5 minutes)
2. **Import environment variables** (2 minutes)
3. **Verify deployment** (5 minutes)

Total recovery time: ~15 minutes

### Migration to Different Platform

To migrate from Render to Railway/Fly.io:

1. Export environment variables
2. Update `docker-compose.yml` if needed
3. Deploy to new platform
4. Update `VITE_API_URL` in Vercel
5. Test

---

## Getting Help

### Check These First

- [ ] Render service status: https://status.render.com
- [ ] Vercel status: https://www.vercel-status.com
- [ ] Anthropic API status: https://status.anthropic.com
- [ ] OpenAI API status: https://status.openai.com

### Support Channels

- **Render**: support@render.com (slow on free tier)
- **Vercel**: Community forum (vercel.com/support)
- **Mimir**: Check repository issues (if open source)

### When Filing Bug Reports

Include:
1. Full error message from logs
2. Environment variables (WITHOUT sensitive values)
3. Steps to reproduce
4. Expected vs actual behavior
5. Service tier (free/paid)
