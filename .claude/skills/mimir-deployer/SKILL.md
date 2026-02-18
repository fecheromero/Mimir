---
name: mimir-deployer
description: Deploy Mimir (FastAPI + Celery + React) to Render.com + Vercel with continuous delivery
---

# Mimir Deployment Guide

This skill contains all the knowledge needed to deploy Mimir to a free-tier production environment using Render.com (backend) and Vercel (frontend) with automatic CI/CD from GitHub.

## 📚 Guide Organization

This guide focuses on **production deployment**. For other topics:

- **Local Development**: See `local-development.md` for complete local setup
- **Alternative Platforms**: See `alternatives.md` for Railway, Fly.io, VPS options
- **Troubleshooting**: See `troubleshooting.md` for common issues
- **Environment Variables**: See `env-templates.md` for copy-paste ready configs

## Architecture Overview

### ⚠️ IMPORTANT: Render Free Tier Limitation

**Background Workers are NOT available on Render's free tier** (as of 2024+).

**Solution**: Run Celery worker in the same process as FastAPI using a process manager.

```
GitHub Repository
    ├─> Render.com (Backend Infrastructure)
    │   ├─> Web Service (FastAPI + Celery Worker combined)
    │   └─> Redis (Managed, 25MB free tier)
    └─> Vercel (Frontend)
        └─> Static Site (React + Vite)
```

## Prerequisites

1. GitHub account with Mimir repository pushed
2. Render.com account (free tier)
3. Vercel account (free tier)
4. API keys ready:
   - `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
   - `BROWSER_USE_API_KEY` (if using cloud mode)

## Part 1: Render.com Setup (Backend)

### Step 1: Create Redis Instance

1. Go to Render Dashboard → New → Redis
2. Configure:
   - **Name**: `mimir-redis`
   - **Plan**: Free (25MB)
   - **Region**: Choose closest to you
3. Click "Create Redis"
4. **Copy the Internal Redis URL** (looks like: `redis://red-xxxxx:6379`)

### Step 2: Specify Python Version

**Create `.python-version` file in repo root:**

Some dependencies (like `aiofiles`) require Python 3.11+. Create this file:

```bash
echo "3.11" > .python-version
```

Commit and push:
```bash
git add .python-version
git commit -m "Specify Python 3.11 for deployment"
git push
```

This ensures Render uses Python 3.11 and avoids build errors.

### Step 3: Create Startup Script for Combined Process

**Create a startup script in your repository:**

Create `backend/start.sh`:
```bash
#!/bin/bash
# Start both FastAPI and Celery worker in parallel

# Start Celery worker in background
celery -A app.core.celery_app worker --loglevel=info &

# Start FastAPI (foreground - keeps container running)
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Make it executable:
```bash
chmod +x backend/start.sh
```

Commit and push to GitHub:
```bash
git add backend/start.sh
git commit -m "Add startup script for Render deployment"
git push
```

### Step 4: Create Web Service (FastAPI + Celery Combined)

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mimir-api`
   - **Region**: Same as Redis
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && playwright install chromium
     ```
   - **Start Command**:
     ```bash
     ./start.sh
     ```
   - **Plan**: Free
   - **Environment Variables** (click "Add Environment Variable"):
     ```
     LLM_PROVIDER=anthropic
     ANTHROPIC_API_KEY=your_key_here
     REDIS_URL=<paste_internal_redis_url>
     CELERY_BROKER_URL=<paste_internal_redis_url>/0
     CELERY_RESULT_BACKEND=<paste_internal_redis_url>/0
     BROWSER_EXECUTION_MODE=cloud
     BROWSER_USE_API_KEY=your_browser_use_key
     JOB_RETENTION_HOURS=24
     TEST_CASE_AGENT_MODEL=claude-sonnet-4-5-20250929
     QA_AGENT_MODEL=claude-sonnet-4-5-20250929
     ```
4. Click "Create Web Service"
5. **Copy the Web Service URL** (e.g., `https://mimir-api.onrender.com`)

**Note**: This single service now handles both API requests AND background job processing.

### ⚠️ About Celery Beat (Cleanup Tasks)

Celery Beat is used for periodic cleanup tasks. Since we can't run it as a separate worker on free tier, you have two options:

**Option 1**: Skip it (manual cleanup)
- Jobs auto-expire from Redis after 24h
- Files in `backend/app/storage/` persist until redeploy (then deleted)

**Option 2**: Add Beat to the startup script (not recommended, uses more RAM)
```bash
# backend/start.sh - modified version
celery -A app.core.celery_app beat --loglevel=info &
celery -A app.core.celery_app worker --loglevel=info &
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Recommendation**: Skip Beat on free tier. Manual cleanup is fine for personal use.

## Part 2: Vercel Setup (Frontend)

### Step 1: Deploy Frontend

1. Go to Vercel Dashboard → Add New → Project
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
4. **Environment Variables**:
   ```
   VITE_API_URL=<paste_render_web_service_url>
   ```
   Example: `VITE_API_URL=https://mimir-api.onrender.com`
5. Click "Deploy"
6. **Copy the Vercel URL** (e.g., `https://mimir.vercel.app`)

### Step 2: Update CORS in Backend

1. Go back to Render → `mimir-api` → Environment
2. Add new environment variable:
   ```
   FRONTEND_URL=<paste_vercel_url>
   ```
3. Update `backend/app/main.py` if needed to allow CORS from Vercel:
   ```python
   origins = [
       "http://localhost:3000",
       os.getenv("FRONTEND_URL", ""),  # Vercel URL
   ]
   ```
4. Render will auto-redeploy on git push

## Part 3: Enable Continuous Delivery (CI/CD)

### Automatic Deployments (Already Enabled!)

Both Render and Vercel automatically watch your GitHub repository:

- **Any push to `main` branch** triggers:
  1. Render rebuilds: `mimir-api` + `mimir-worker` (+ `mimir-beat`)
  2. Vercel rebuilds: frontend

### Manual Deploy

- **Render**: Dashboard → Service → "Manual Deploy" button
- **Vercel**: Dashboard → Project → "Redeploy" button

### Deploy Specific Branches

- **Render**: Settings → Branch → Change to feature branch
- **Vercel**: Settings → Git → Add branch for preview deploys

## Part 4: Environment-Specific Configuration

### Using Cloud Browser Mode (Recommended for Free Tier)

Free tier has limited CPU/RAM. Running Playwright browsers locally will be **very slow** or crash.

**Solution**: Use browser-use cloud mode

```bash
# In Render environment variables
BROWSER_EXECUTION_MODE=cloud
BROWSER_USE_API_KEY=your_api_key
```

This offloads browser execution to browser-use cloud servers.

### Using Local Browser Mode (Not Recommended)

If you want to try local Playwright on Render:

```bash
BROWSER_EXECUTION_MODE=local
```

**Warning**: Free tier VMs have ~512MB RAM. Chromium needs ~200MB per instance. You'll likely hit memory limits.

### Switching LLM Providers

To switch from Anthropic to OpenAI:

```bash
# In Render environment variables
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini  # Cheaper model
```

## Part 5: Monitoring & Troubleshooting

### Viewing Logs

**Render**:
- Dashboard → Service → "Logs" tab
- Real-time logs for API, Worker, and Beat

**Vercel**:
- Dashboard → Project → Deployments → Click deployment → "Logs"

### Common Issues

#### 1. Service Goes to Sleep (Free Tier)

**Problem**: Render free tier services sleep after 15 minutes of inactivity.

**Symptoms**:
- First request after inactivity takes 30-60 seconds
- "Waking up service..." message

**Solutions**:
- Accept the delay (it's free!)
- Upgrade to paid tier ($7/month) for always-on
- Use external uptime monitor (e.g., UptimeRobot) to ping every 10 minutes

#### 2. Build Fails: "playwright install" Error

**Problem**: Playwright dependencies missing

**Solution**: Ensure build command includes:
```bash
pip install -r requirements.txt && playwright install chromium
```

#### 3. Celery Worker Not Processing Jobs

**Problem**: Worker can't connect to Redis

**Check**:
1. Render → `mimir-redis` → Verify it's running
2. Verify `REDIS_URL` matches in both Web Service and Worker
3. Check worker logs for connection errors

#### 4. CORS Error in Frontend

**Problem**: Vercel frontend can't call Render API

**Solution**:
1. Add `FRONTEND_URL` env var in Render
2. Update `backend/app/main.py` CORS origins
3. Redeploy backend

#### 5. Out of Memory Error

**Problem**: Browser automation crashes with OOM

**Solution**:
- Switch to `BROWSER_EXECUTION_MODE=cloud`
- Or upgrade Render plan

#### 6. Job Files Not Persisting

**Problem**: Files disappear between requests

**Cause**: Render free tier uses ephemeral storage

**Solution**:
- Files in `backend/app/storage/jobs/` are temporary
- Download results immediately
- For persistence, integrate external storage (S3, Cloudinary)

### Health Checks

Add this endpoint to `backend/app/main.py`:

```python
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "redis": check_redis_connection(),
        "celery": check_celery_worker()
    }
```

Use for uptime monitoring.

## Part 6: Free Tier Limitations

| Service | Limit | Impact |
|---------|-------|--------|
| Render Web Service | 750 hrs/month, sleeps after 15min | Slow cold starts |
| Render Background Worker | 750 hrs/month | Same as above |
| Render Redis | 25MB storage | ~1000 jobs max in Redis |
| Vercel | 100GB bandwidth/month | Sufficient for personal use |
| Render Storage | Ephemeral | Files deleted on redeploy |

### Optimization Tips

1. **Reduce Job Retention**: Set `JOB_RETENTION_HOURS=1` to clean up faster
2. **Use Cloud Browser Mode**: Saves memory/CPU
3. **Smaller LLM Models**: Use `gpt-4o-mini` instead of `claude-sonnet-4`
4. **Limit Concurrent Jobs**: Add max tasks per worker in Celery config

## Part 7: Upgrade Path

When you need more resources:

### Render Paid Tiers
- **Starter** ($7/month per service): Always-on, 512MB RAM
- **Standard** ($25/month per service): 2GB RAM, faster CPU

### Alternative Backends
- **Railway**: $5 free credit/month, then pay-as-you-go
- **Fly.io**: 3 free VMs, better for Docker
- **Heroku**: Similar to Render but more expensive

## Part 8: Backup & Disaster Recovery

### Backup Strategy

1. **Code**: Already in GitHub
2. **Environment Variables**: Export from Render/Vercel dashboard → save locally
3. **Redis Data**: Not critical (jobs are temporary)

### Restore Procedure

If Render/Vercel goes down:

1. Create new services on alternative platform
2. Import environment variables
3. Connect to GitHub repo
4. Deploy

Estimated downtime: 15-30 minutes

## Part 9: Security Best Practices

1. **Never commit API keys**: Use environment variables only
2. **Rotate keys regularly**: Especially if repo is public
3. **Enable 2FA**: On GitHub, Render, and Vercel accounts
4. **Review access logs**: Check Vercel analytics for unusual traffic
5. **Rate limiting**: Consider adding to FastAPI if making repo public

## Commands Reference

### Force Redeploy

```bash
# Trigger deployment via git (from local machine)
git commit --allow-empty -m "Trigger deploy"
git push origin main
```

### Check Service Status

```bash
# Via Render CLI (optional)
render services list
render logs -s mimir-api
render logs -s mimir-worker
```

### Test Deployment

```bash
# Test API health
curl https://mimir-api.onrender.com/health

# Test frontend
curl https://mimir.vercel.app

# Test full flow (from frontend)
# Navigate to https://mimir.vercel.app
# Submit test case generation
# Monitor in Render logs
```

## Summary Checklist

- [ ] Redis instance created on Render
- [ ] Web Service (FastAPI) deployed with correct env vars
- [ ] Background Worker (Celery) deployed with same env vars
- [ ] (Optional) Celery Beat deployed for cleanup
- [ ] Frontend deployed on Vercel with `VITE_API_URL`
- [ ] CORS configured in backend for Vercel URL
- [ ] Test end-to-end: Generate → Execute → Replay
- [ ] Verify auto-deploy on git push
- [ ] Export environment variables for backup
- [ ] Monitor logs for errors

## Additional Resources

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Browser-use Cloud: https://browser-use.com
- Playwright on Render: https://render.com/docs/playwright

---

**Last Updated**: 2026-02-18
**Maintained By**: Mimir deployment automation
