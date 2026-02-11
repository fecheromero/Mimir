# Mimir - AI-Powered QA Testing Platform

Mimir is an automated testing platform that uses AI to generate and execute test cases from ticket descriptions.

## Features

- 🤖 AI-powered test case generation from ticket descriptions
- 🌐 Automated browser testing using browser_use
- 📊 Detailed test reports in Markdown
- 💾 Download/upload test cases for re-execution
- 🔒 SSO authentication
- 🚀 Async execution with Celery workers

## Architecture

```
Frontend (React) → Backend API (FastAPI) → Redis → Workers (Celery + browser_use)
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Anthropic API Key

### Run with Docker

```bash
# Clone the repository
git clone <your-repo-url>
cd Mimir

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start services
docker-compose up -d

# Access at http://localhost:3000
```

### Development Setup

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
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

```env
ANTHROPIC_API_KEY=your_api_key
REDIS_URL=redis://redis:6379
SSO_CLIENT_ID=your_sso_client_id
SSO_CLIENT_SECRET=your_sso_secret
```

## License

MIT
