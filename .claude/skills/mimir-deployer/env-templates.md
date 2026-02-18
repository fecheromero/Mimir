# Environment Variables Templates

Copy-paste these into Render and Vercel dashboards.

## ⚠️ Free Tier Note

Background Workers are NOT available on Render free tier. We run both FastAPI and Celery worker in a single Web Service.

## Render - Web Service (mimir-api)
**This service runs both API and Celery worker via `start.sh`**

```bash
# LLM Configuration
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Alternative: OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_MODEL=gpt-4o-mini

# Redis Configuration (get from Render Redis internal URL)
REDIS_URL=redis://red-xxxxxxxxxxxxxxxxxxxxx:6379
CELERY_BROKER_URL=redis://red-xxxxxxxxxxxxxxxxxxxxx:6379/0
CELERY_RESULT_BACKEND=redis://red-xxxxxxxxxxxxxxxxxxxxx:6379/0

# Browser Automation
BROWSER_EXECUTION_MODE=cloud
BROWSER_USE_API_KEY=bu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Local browser mode (not recommended on free tier)
# BROWSER_EXECUTION_MODE=local

# Model Configuration
TEST_CASE_AGENT_MODEL=claude-sonnet-4-5-20250929
QA_AGENT_MODEL=claude-sonnet-4-5-20250929

# Job Management
JOB_RETENTION_HOURS=24

# CORS (add after Vercel deployment)
FRONTEND_URL=https://mimir-xxxxx.vercel.app
```

**Note**: This single service handles both API requests AND background job processing.

## Vercel - Frontend

```bash
# API URL (get from Render Web Service)
VITE_API_URL=https://mimir-api-xxxxx.onrender.com
```

---

## Variable Reference

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `LLM_PROVIDER` | LLM backend (`anthropic` or `openai`) | Choose based on preference |
| `ANTHROPIC_API_KEY` | Claude API key | https://console.anthropic.com |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | https://platform.openai.com |
| `REDIS_URL` | Redis connection string | Render Redis dashboard |
| `CELERY_BROKER_URL` | Celery message broker | Same as REDIS_URL + `/0` |
| `CELERY_RESULT_BACKEND` | Celery result storage | Same as REDIS_URL + `/0` |
| `BROWSER_EXECUTION_MODE` | Browser execution (`local` or `cloud`) | Choose `cloud` for free tier |
| `BROWSER_USE_API_KEY` | Browser-use cloud key (if cloud mode) | https://browser-use.com |
| `VITE_API_URL` | Backend API URL (frontend only) | Render Web Service URL |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_CASE_AGENT_MODEL` | Model for test generation | `claude-sonnet-4-5-20250929` |
| `QA_AGENT_MODEL` | Model for browser automation | `claude-sonnet-4-5-20250929` |
| `OPENAI_MODEL` | OpenAI model name | `gpt-4o-mini` |
| `JOB_RETENTION_HOURS` | How long to keep jobs in Redis | `24` |
| `FRONTEND_URL` | Frontend URL for CORS | Auto-detected |

---

## How to Get API Keys

### Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up / Log in
3. Navigate to "API Keys"
4. Create new key
5. Copy key (starts with `sk-ant-api03-`)

### OpenAI API Key
1. Go to https://platform.openai.com
2. Sign up / Log in
3. Navigate to "API Keys"
4. Create new secret key
5. Copy key (starts with `sk-proj-`)

### Browser-use API Key
1. Go to https://browser-use.com
2. Sign up for cloud account
3. Navigate to dashboard
4. Copy API key (starts with `bu_`)

### Render Redis Internal URL
1. Render Dashboard → mimir-redis
2. Look for "Internal Redis URL" or "Internal Connection String"
3. Format: `redis://red-xxxxx:6379`
4. **Important**: Use internal URL (not external) for better performance

---

## Quick Copy Commands

After deployment, save your configuration:

```bash
# Export Render environment variables to file
# (Do this manually from Render dashboard → Service → Environment → Export)

# Export Vercel environment variables
# (Do this from Vercel dashboard → Project → Settings → Environment Variables → Export)
```

Store these exports in a secure location (password manager, encrypted file).

---

## Testing Your Configuration

After setting all environment variables:

```bash
# 1. Check API is running
curl https://your-render-url.onrender.com/health

# 2. Check frontend can reach API
# Visit: https://your-vercel-app.vercel.app
# Open browser console (F12) and check for CORS errors

# 3. Run full verification
./verify-deployment.sh https://your-render-url.onrender.com https://your-vercel-app.vercel.app
```

---

## Environment-Specific Tips

### Development (.env file)
Use `.env` file in backend/ directory for local development:

```bash
cp .env.example .env
# Edit .env with your local values
```

### Staging (optional)
Create separate Render services with different environment variables:
- `mimir-api-staging`
- `mimir-worker-staging`
- Branch: `staging`

### Production
Use the main deployment with production API keys.

---

## Secrets Management Best Practices

1. **Never commit API keys to git**
   - Add `.env` to `.gitignore` (already done)
   - Use Render/Vercel environment variable UI

2. **Rotate keys regularly**
   - Every 3-6 months
   - Immediately if compromised

3. **Use different keys for dev/prod**
   - Development: Use separate API keys with lower rate limits
   - Production: Use production keys

4. **Monitor API usage**
   - Anthropic Console: Check usage dashboard
   - OpenAI Platform: Check usage & billing
   - Browser-use: Check cloud usage

5. **Set spending limits**
   - OpenAI: Set hard limit in billing settings
   - Anthropic: Monitor usage alerts

---

## Troubleshooting Environment Variables

### Variable Not Taking Effect

1. **Render**: After changing env vars, you must manually trigger redeploy
   - Dashboard → Service → "Manual Deploy"

2. **Vercel**: Redeploy automatically triggers on env var change
   - Or manually: Dashboard → Deployments → "Redeploy"

### Invalid Redis URL

**Symptom**: Celery can't connect to Redis

**Fix**: Ensure Redis URL format is correct:
```bash
# Correct
REDIS_URL=redis://red-xxxxx:6379

# Incorrect (missing protocol)
REDIS_URL=red-xxxxx:6379

# Incorrect (using external URL instead of internal)
REDIS_URL=redis-xxxxx.render.com
```

### CORS Errors

**Symptom**: Frontend shows "CORS policy blocked" in browser console

**Fix**: Add frontend URL to backend env vars:
```bash
FRONTEND_URL=https://mimir.vercel.app
```

Then update `backend/app/main.py` if needed.

### API Key Not Working

**Symptom**: "Authentication failed" or "Invalid API key"

**Fix**:
1. Verify key is correct (no extra spaces)
2. Check key hasn't been revoked
3. For Anthropic: Ensure billing is set up
4. For OpenAI: Check you have credits
