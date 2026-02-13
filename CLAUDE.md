# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mimir is an AI-powered QA testing platform that generates and executes browser-based test cases from ticket descriptions. It uses browser-use (Playwright-based) for browser automation and Claude/GPT models for test generation.

## Core Architecture

### Request Flow
```
Frontend (React) → FastAPI → Redis (job storage) → Celery → Worker Processes
                                                           ├─> TestCaseAgent (LLM)
                                                           ├─> QaAgent (browser-use)
                                                           └─> ReplayService (Playwright)
```

### Key Concepts

**Three Execution Modes:**
1. **Generate**: LLM creates test cases from ticket description → returns JSON with test steps
2. **Execute**: QaAgent takes test case text → runs browser-use agent → returns actions + report
3. **Replay**: ReplayService takes saved actions → replays via Playwright → validates against expectations

**Browser Modes:**
- `new`: Spawn fresh browser instance (default)
- `existing`: Connect to Chrome via CDP (Chrome DevTools Protocol) - see BROWSER_CDP_SETUP.md

**Execution Modes:**
- `local`: Run browser-use locally with Playwright
- `cloud`: Use browser-use cloud API (requires BROWSER_USE_API_KEY)

**Job Lifecycle:**
- Jobs stored in Redis with 24h TTL (configurable via JOB_RETENTION_HOURS)
- Files stored in `backend/app/storage/jobs/{job_id}/`
- Celery beat runs hourly cleanup task to remove old files

### Key Components

**Backend Services** (`backend/app/services/`):
- `TestCaseAgent`: Generates test case text from ticket descriptions using LLM
- `QaAgent`: Executes test cases using browser-use agent (either local or cloud)
- `ReplayService`: Replays saved actions using raw Playwright
- `StorageService`: Manages job file storage (test cases, results, reports, actions)

**LLM Abstraction** (`backend/app/core/llm_factory.py`):
- Switch between Anthropic (Claude) and OpenAI (GPT) via LLM_PROVIDER env var
- `get_llm_for_test_generation()`: Returns client for TestCaseAgent
- `get_llm_for_browser_use()`: Returns langchain-compatible model for browser-use
- OpenAIWrapper provides Anthropic-compatible interface for OpenAI

**Workers** (`backend/app/workers/tasks.py`):
- `generate_test_cases_task`: Calls TestCaseAgent
- `execute_test_cases_task`: Calls QaAgent
- `replay_actions_task`: Calls ReplayService
- All tasks update Redis with progress/status

**Frontend State**:
- Uses React Router (Dashboard page + JobResults page)
- Three main forms: TestCaseGenerator, TestCaseUploader, ReplayUploader
- All share BrowserSettings component for CDP/headless configuration
- Real-time job status polling via `/api/jobs/{job_id}/status`

## Development Commands

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

### Backend Development
```bash
# Terminal 1: API Server
cd backend
uvicorn app.main:app --reload

# Terminal 2: Celery Worker
cd backend
celery -A app.core.celery_app worker --loglevel=info

# Terminal 3: Celery Beat (optional, for cleanup)
cd backend
celery -A app.core.celery_app beat --loglevel=info

# Redis (required)
docker run -d -p 6379:6379 redis:7-alpine
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### Docker (Full Stack)
```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Environment Configuration

Required in `.env` (root or `backend/.env`):
```
LLM_PROVIDER=anthropic  # or "openai"
ANTHROPIC_API_KEY=your_key  # if LLM_PROVIDER=anthropic
OPENAI_API_KEY=your_key  # if LLM_PROVIDER=openai

REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

BROWSER_EXECUTION_MODE=local  # or "cloud"
BROWSER_USE_API_KEY=your_key  # if BROWSER_EXECUTION_MODE=cloud
```

Optional:
```
TEST_CASE_AGENT_MODEL=claude-sonnet-4-5-20250929
QA_AGENT_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4o-mini
JOB_RETENTION_HOURS=24
```

## Important Implementation Details

### CDP (Chrome DevTools Protocol) Configuration
- CDP URL is **NOT** configured in .env (it was removed)
- CDP URL is passed dynamically from frontend forms when browser_mode="existing"
- Flow: Frontend form → API request → Celery task → QaAgent/ReplayService
- See `BROWSER_CDP_SETUP.md` for Chrome launch commands

### Cloud vs Local Browser Execution
- **Local mode**: Uses browser-use's Agent with local Playwright browser
- **Cloud mode**: Uses browser-use cloud API (remote execution)
- QaAgent has CloudResultAdapter to normalize cloud results to local format

### Test Case vs Actions
- **Test Case**: LLM-generated text describing test steps (human-readable)
- **Actions**: Recorded browser actions from execution (JSON array)
- Actions can be replayed without re-running LLM via ReplayService

### Status Determination Logic
For replay tasks (`replay_actions_task`):
- If test has `expected_outcome` → use LLM to validate → PASSED/FAILED
- If no expectations → check for errors → COMPLETED (no errors) or FAILED (errors)
- Status stored in result JSON and shown in UI

### File Downloads
Files are served via `/api/jobs/{job_id}/download/{type}`:
- `test-cases`: JSON with test case text
- `results`: JSON with execution results + actions
- `report`: Markdown test report
- `actions`: JSON with actions + expectations (for replay)

Frontend downloads use browser `<a>` tag with blob URLs.

### Optional Credentials
All three forms (TestCaseGenerator, TestCaseUploader, ReplayUploader) have:
- Checkbox: "Include login credentials (optional)"
- Conditionally shows email/password fields
- Used for apps requiring authentication before testing

## Code Style Notes

- Backend uses Pydantic models for request validation
- Celery tasks always update Redis status with progress % and current_step message
- Frontend uses lucide-react for icons
- Frontend uses Tailwind CSS for styling
- All API calls go through `frontend/src/services/api.js`
- Browser settings (CDP, headless, mode) are managed by reusable BrowserSettings component

## Common Tasks

**Adding a new API endpoint:**
1. Add route in `backend/app/api/routes/` (test_cases.py or jobs.py)
2. Create/update Celery task in `backend/app/workers/tasks.py`
3. Add service logic in `backend/app/services/`
4. Update frontend API client in `frontend/src/services/api.js`

**Changing test generation prompt:**
- Edit system_prompt in `backend/app/services/test_case_agent.py`

**Changing browser automation behavior:**
- Edit `backend/app/services/qa_agent.py` → `run_agent()` method
- Modify task instructions passed to browser-use Agent

**Switching LLM provider:**
- Change LLM_PROVIDER in .env to "anthropic" or "openai"
- Set corresponding API key
- Optionally adjust model names (TEST_CASE_AGENT_MODEL, QA_AGENT_MODEL, OPENAI_MODEL)
