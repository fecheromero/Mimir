# Local Development Guide

Complete guide for running Mimir locally on your development machine.

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ and npm installed
- Docker (for Redis)
- Git

## Initial Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd Mimir
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### 4. Environment Configuration

#### Backend `.env`

Create `backend/.env`:

```bash
# LLM Provider (choose one)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Or use OpenAI:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_MODEL=gpt-4o-mini

# Redis (local)
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Application URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Browser Execution
BROWSER_EXECUTION_MODE=local

# Optional: Use cloud mode for browser automation
# BROWSER_EXECUTION_MODE=cloud
# BROWSER_USE_API_KEY=bu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Models
TEST_CASE_AGENT_MODEL=claude-sonnet-4-5-20250929
QA_AGENT_MODEL=claude-sonnet-4-5-20250929

# Storage
JOB_RETENTION_HOURS=24
```

#### Frontend `.env`

Already created at `frontend/.env`:

```bash
# Backend API URL for local development
VITE_API_URL=http://localhost:8000
```

## Running Locally

### Option 1: Full Stack with Async Jobs (Recommended)

Run these commands in **separate terminal windows**:

#### Terminal 1: Redis

```bash
# Start Redis via Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or if you have Redis installed locally:
# redis-server
```

#### Terminal 2: FastAPI Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
🔧 CORS enabled for origins: ['http://localhost:3000', 'http://localhost:5173', ...]
```

#### Terminal 3: Celery Worker

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
celery -A app.core.celery_app worker --loglevel=info
```

You should see:
```
[2024-xx-xx 12:00:00,000: INFO/MainProcess] celery@your-machine ready.
```

#### Terminal 4: Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
VITE vX.X.X  ready in XXX ms

➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser.

### Option 2: API Only (No Background Jobs)

If you only want to test the API without async jobs:

#### Terminal 1: Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### Terminal 2: FastAPI Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Note**: Without Celery worker, jobs will be queued but won't execute until you start the worker.

### Option 3: Docker Compose (Full Stack)

```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

This starts:
- Backend (FastAPI) on http://localhost:8000
- Celery worker
- Redis
- Frontend on http://localhost:3000

## Verification

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy"}

curl http://localhost:8000/debug/cors
# Expected: {"configured_origins":[...], "frontend_url_env":"http://localhost:5173", ...}
```

### 2. Check API Documentation

Open in browser: http://localhost:8000/docs

You should see FastAPI's interactive Swagger UI.

### 3. Check Redis Connection

```bash
# In backend terminal with venv activated
python -c "import redis; r = redis.from_url('redis://localhost:6379'); print(r.ping())"
# Expected: True
```

### 4. Check Celery Worker

```bash
# In backend terminal with venv activated
celery -A app.core.celery_app inspect ping
# Expected: pong response from worker
```

### 5. Check Frontend

Open http://localhost:5173

- You should see the Mimir dashboard
- No CORS errors in browser console (F12)
- Try generating test cases

## Common Local Development Issues

### Issue 1: Redis Connection Error

**Symptom:**
```
redis.exceptions.ConnectionError: Error 61 connecting to localhost:6379. Connection refused.
```

**Solution:**
```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
docker run -d -p 6379:6379 redis:7-alpine
```

### Issue 2: Module Not Found Errors

**Symptom:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Activate venv first!
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Issue 3: Port Already in Use

**Symptom:**
```
ERROR: [Errno 48] Address already in use
```

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

### Issue 4: Frontend Can't Reach Backend (CORS)

**Symptom:**
Browser console shows:
```
Access to fetch at 'http://localhost:8000/api/test-cases/generate' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**
```bash
# Check CORS configuration
curl http://localhost:8000/debug/cors

# Verify FRONTEND_URL in backend/.env
# Should be: FRONTEND_URL=http://localhost:5173

# Restart backend after changing .env
```

### Issue 5: Celery Worker Not Processing Jobs

**Symptom:**
Jobs stuck in "pending" state forever.

**Solution:**
```bash
# Check if Celery worker is running
celery -A app.core.celery_app inspect active

# If not running, start it
cd backend
source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info

# Check Redis connection
python -c "import redis; r = redis.from_url('redis://localhost:6379'); print(r.ping())"
```

### Issue 6: Playwright Browser Crashes

**Symptom:**
```
playwright._impl._errors.Error: Browser closed unexpectedly
```

**Solution:**
```bash
# Reinstall Playwright browsers with system dependencies
playwright install --with-deps chromium

# Or use cloud mode instead
# In backend/.env:
BROWSER_EXECUTION_MODE=cloud
BROWSER_USE_API_KEY=bu_xxxxxxxxxxxxx
```

## Development Workflow

### Making Code Changes

#### Backend Changes

1. Edit Python files in `backend/app/`
2. Save (FastAPI auto-reloads with `--reload` flag)
3. Check terminal for any errors
4. Test via http://localhost:8000/docs or frontend

#### Frontend Changes

1. Edit files in `frontend/src/`
2. Save (Vite hot-reloads automatically)
3. Browser updates immediately
4. Check console (F12) for errors

#### Adding New Dependencies

**Backend:**
```bash
cd backend
source venv/bin/activate
pip install <package-name>
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Add <package-name> dependency"
```

**Frontend:**
```bash
cd frontend
npm install <package-name>
git add package.json package-lock.json
git commit -m "Add <package-name> dependency"
```

### Testing Locally Before Deploy

```bash
# 1. Run full stack locally
# Follow "Option 1: Full Stack with Async Jobs" above

# 2. Test all features:
# - Generate test cases
# - Execute test cases
# - Upload and execute
# - Replay actions

# 3. Check for errors in all terminals

# 4. If everything works, commit and push
git add .
git commit -m "Feature: <description>"
git push

# 5. Render and Vercel will auto-deploy
```

## Database/Storage

### Redis Data

In local development, Redis stores:
- Celery task queue
- Job metadata
- Temporary results

**View Redis data:**
```bash
# Connect to Redis CLI
docker exec -it <redis-container-id> redis-cli

# List all keys
KEYS *

# Get job status
GET celery-task-meta-<job-id>

# Clear all data (caution!)
FLUSHALL
```

### File Storage

Files are stored in `backend/app/storage/jobs/`:

```bash
# View stored files
ls -la backend/app/storage/jobs/

# Clean up old files
rm -rf backend/app/storage/jobs/*
# (Preserves .gitkeep)
```

## VS Code Setup (Optional)

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload", "--port", "8000"],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/backend"
      }
    },
    {
      "name": "Celery Worker",
      "type": "python",
      "request": "launch",
      "module": "celery",
      "args": ["-A", "app.core.celery_app", "worker", "--loglevel=info"],
      "cwd": "${workspaceFolder}/backend"
    }
  ]
}
```

## Environment Variables Reference

### Backend

| Variable | Local Default | Description |
|----------|---------------|-------------|
| `LLM_PROVIDER` | `anthropic` | LLM backend (`anthropic` or `openai`) |
| `ANTHROPIC_API_KEY` | - | Claude API key (required if LLM_PROVIDER=anthropic) |
| `OPENAI_API_KEY` | - | OpenAI API key (required if LLM_PROVIDER=openai) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Celery message broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Celery result storage |
| `BACKEND_URL` | `http://localhost:8000` | Backend API URL |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS |
| `BROWSER_EXECUTION_MODE` | `local` | Browser mode (`local` or `cloud`) |
| `BROWSER_USE_API_KEY` | - | Browser-use cloud key (if cloud mode) |
| `JOB_RETENTION_HOURS` | `24` | How long to keep jobs |

### Frontend

| Variable | Local Default | Description |
|----------|---------------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

## Useful Commands

### Backend

```bash
# Run tests (if you have them)
pytest

# Format code
black .

# Lint code
pylint app/

# Check types
mypy app/

# Generate requirements
pip freeze > requirements.txt

# Clean Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete
```

### Frontend

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

### Docker

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend

# Restart services
docker-compose restart backend

# Rebuild after dependency changes
docker-compose up -d --build

# Clean everything
docker-compose down -v
```

## Hot Reload Behavior

### Backend (FastAPI)

- ✅ Python files: Auto-reloads on save
- ✅ `.env` changes: Requires manual restart
- ❌ `requirements.txt`: Requires `pip install` + restart

### Frontend (Vite)

- ✅ JS/JSX files: Hot reload (keeps state)
- ✅ CSS files: Hot reload
- ✅ `.env` changes: Requires manual restart (Ctrl+C, `npm run dev`)

### Celery Worker

- ❌ No auto-reload: Always restart manually after code changes
- Use `watchdog` for auto-reload (optional):
  ```bash
  pip install watchdog
  celery -A app.core.celery_app worker --loglevel=info --autoreload
  ```

## Next Steps

After local development works:

1. **Commit changes**: `git commit -am "Your message"`
2. **Push to GitHub**: `git push`
3. **Auto-deploy**:
   - Render rebuilds backend (2-3 min)
   - Vercel rebuilds frontend (1-2 min)
4. **Test production**: Visit your Vercel URL

---

**Need help?** Check:
- Backend logs: Terminal running uvicorn
- Worker logs: Terminal running celery
- Frontend logs: Browser console (F12)
- Redis: `docker logs <container-id>`
