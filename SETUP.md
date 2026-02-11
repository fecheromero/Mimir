# Mimir Setup Guide

## Prerequisites

- Docker & Docker Compose (for production)
- Python 3.11+ (for local development)
- Node.js 20+ (for local development)
- Anthropic API Key

## Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Mimir
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Local Development Setup

### Backend

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```

4. **Create .env file**
   ```bash
   cp ../.env.example .env
   # Edit .env with your settings
   ```

5. **Start Redis (required)**
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

6. **Start the API server**
   ```bash
   uvicorn app.main:app --reload
   ```

7. **Start Celery worker (in another terminal)**
   ```bash
   celery -A app.core.celery_app worker --loglevel=info
   ```

8. **Start Celery beat (in another terminal, for cleanup)**
   ```bash
   celery -A app.core.celery_app beat --loglevel=info
   ```

### Frontend

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the app**
   - Open http://localhost:3000

## Usage

### 1. Generate Test Cases

1. Go to the dashboard
2. Enter:
   - Ticket ID
   - Ticket Description (paste from Notion, Markdown supported)
   - Test URL
   - Optional: User credentials for login
3. Click "Generate Test Cases"
4. Wait for AI to generate test cases
5. Download the JSON file for future use

### 2. Execute Tests

After test cases are generated:
1. Review the test cases
2. Click "Execute Tests"
3. Monitor progress in real-time
4. Download results (JSON) and report (Markdown)

### 3. Re-run Tests

1. Upload a previously downloaded test case JSON file
2. Optionally override URL and credentials
3. Click "Execute Test Cases"
4. Monitor and download results

## API Endpoints

### Test Cases
- `POST /api/test-cases/generate` - Generate test cases from ticket
- `POST /api/test-cases/execute` - Execute test cases
- `POST /api/test-cases/upload-and-execute` - Upload and execute

### Jobs
- `GET /api/jobs/{job_id}/status` - Get job status
- `GET /api/jobs/{job_id}/test-cases` - Get generated test cases
- `GET /api/jobs/{job_id}/results` - Get test results
- `GET /api/jobs/{job_id}/download/{type}` - Download files

## File Retention

- Job files are automatically deleted after 24 hours (configurable)
- Download your test cases and results before expiration
- Redis job data expires automatically

## Troubleshooting

### Backend issues

**Celery worker not starting:**
- Check Redis is running: `redis-cli ping`
- Check environment variables are set
- Check logs: `docker-compose logs worker`

**Browser automation failing:**
- Ensure Playwright browsers are installed: `playwright install chromium`
- Check if running in headless mode (required for Docker)
- Check available memory (workers need ~500MB+ RAM)

### Frontend issues

**API calls failing:**
- Check backend is running on port 8000
- Check CORS settings in backend
- Check browser console for errors

**Build errors:**
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`

## Production Deployment

1. **Update docker-compose.yml for production:**
   - Set proper domain names
   - Configure SSL/TLS
   - Set secure environment variables

2. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Setup reverse proxy (nginx/caddy):**
   - Configure SSL certificates
   - Setup SSO authentication
   - Rate limiting

4. **Monitor services:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT
