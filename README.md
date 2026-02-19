# Mimir - AI-Powered QA Testing Platform

Mimir is an automated testing platform that uses AI to generate and execute test cases from ticket descriptions.

## Features

- 🤖 AI-powered test case generation from ticket descriptions (Claude or GPT)
- 🌐 Automated browser testing using browser-use + Playwright
- 📊 Detailed test reports in Markdown
- 💾 Download/upload test cases for re-execution
- 🔄 Replay functionality to re-run tests without LLM
- 🎯 Portable app - no complex setup required

## Quick Start (Portable App)

### Prerequisites

- Python 3.11+
- Node.js 18+
- Anthropic or OpenAI API key

### Create & Run Portable App

```bash
# 1. Configure your API keys
nano backend/.env  # Add ANTHROPIC_API_KEY or OPENAI_API_KEY

# 2. Create portable app
./create-portable-app.sh

# 3. Run the app
cd build/Mimir-Portable
./start-mimir.sh
```

The portable app will:
- Auto-install Python dependencies (first run only, ~3-4 minutes)
- Auto-install Node dependencies (first run only)
- Start backend on http://localhost:3022
- Start frontend on http://localhost:3023
- Open browser automatically

**To stop**: Press `Ctrl+C` in the terminal

## Development Setup

If you want to develop on Mimir directly (without creating the portable app):

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# Configure .env file
cp .env.example .env
nano .env  # Add your API keys

# Run the server
uvicorn app.main:app --reload --port 3022
```

### Frontend

```bash
cd frontend
npm install

# Configure API URL
echo "VITE_API_URL=http://localhost:3022" > .env

# Run dev server
npm run dev -- --port 3023
```

## Usage

1. **Generate Test Cases**
   - Paste ticket description (supports Markdown from Notion)
   - Provide URL and optional credentials
   - Click "Generate Test Cases"
   - Download generated test cases (.json)

2. **Execute Tests**
   - Upload previously generated test cases or use newly generated ones
   - Click "Execute Tests"
   - Monitor progress in real-time
   - Download results and report

3. **Re-run Tests**
   - Upload a previous test case file
   - Execute immediately without re-generation

## Project Structure

```
Mimir/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Config & Celery setup
│   │   ├── services/        # Business logic
│   │   ├── workers/         # Celery tasks
│   │   └── storage/         # Temporary file storage
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── hooks/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Environment Variables

Edit `backend/.env`:

```env
# LLM Provider (choose one)
LLM_PROVIDER=anthropic  # or "openai"

# API Keys (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Browser Execution Mode
BROWSER_EXECUTION_MODE=local  # local or cloud

# Optional: Specific models
TEST_CASE_AGENT_MODEL=claude-sonnet-4-5-20250929
QA_AGENT_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4o-mini

# Sync mode (portable app uses sync mode)
ENABLE_CELERY_WORKER=false
```

## License

MIT
