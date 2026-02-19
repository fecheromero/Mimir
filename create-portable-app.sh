#!/bin/bash
# Create Mimir Portable App (no compilation needed)

set -e

echo "📦 Creating Mimir Portable App..."
echo ""

APP_NAME="Mimir-Portable"
BUILD_DIR="build/$APP_NAME"

# Create directory structure
rm -rf build
mkdir -p "$BUILD_DIR"

# Copy backend
echo "📋 Copying backend..."
cp -r backend "$BUILD_DIR/"
rm -rf "$BUILD_DIR/backend/__pycache__"
rm -rf "$BUILD_DIR/backend/app/__pycache__"
rm -rf "$BUILD_DIR/backend/.pytest_cache"
rm -rf "$BUILD_DIR/backend/venv"

# Copy .env if exists
if [ -f "backend/.env" ]; then
    echo "📝 Copying .env configuration..."
    cp backend/.env "$BUILD_DIR/backend/.env"
    # Ensure ENABLE_CELERY_WORKER=false for portable app
    if grep -q "ENABLE_CELERY_WORKER" "$BUILD_DIR/backend/.env"; then
        sed -i.bak 's/ENABLE_CELERY_WORKER=.*/ENABLE_CELERY_WORKER=false/' "$BUILD_DIR/backend/.env"
        rm "$BUILD_DIR/backend/.env.bak"
    else
        echo "" >> "$BUILD_DIR/backend/.env"
        echo "ENABLE_CELERY_WORKER=false" >> "$BUILD_DIR/backend/.env"
    fi
    echo "✅ Configuration copied and configured for sync mode"
else
    echo "⚠️  No .env found, using example template"
fi

# Copy frontend source (for dev mode)
echo "⚛️  Copying frontend..."
cp -r frontend "$BUILD_DIR/"
rm -rf "$BUILD_DIR/frontend/node_modules"
rm -rf "$BUILD_DIR/frontend/.vite"

# Create startup script
cat > "$BUILD_DIR/start-mimir.sh" << 'SCRIPT_EOF'
#!/bin/bash
# Mimir Portable - Startup Script

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎯 Mimir QA Testing Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found!"
    echo "   Please install Python 3.11+ from https://python.org"
    exit 1
fi

# Check Node.js
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm not found!"
    echo "   Please install Node.js from https://nodejs.org"
    exit 1
fi

# Setup Python environment
if [ ! -d "backend/venv" ]; then
    echo "📦 First run: Setting up Python environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    playwright install chromium
    cd ..
    echo "✅ Python setup complete!"
    echo ""
fi

# Setup Node environment
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 First run: Setting up Node environment..."
    cd frontend
    npm install --silent
    cd ..
    echo "✅ Node setup complete!"
    echo ""
fi

# Create frontend .env
cat > frontend/.env << 'ENVEOF'
VITE_API_URL=http://localhost:3022
ENVEOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Starting Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Backend:  http://localhost:3022"
echo "  Frontend: http://localhost:3023"
echo "  API Docs: http://localhost:3022/docs"
echo ""
echo "  CDP Setup:"
echo "  1. Open Chrome with CDP (in another terminal):"
echo "     /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\"
echo "       --remote-debugging-port=9222 \\"
echo "       --user-data-dir=/tmp/chrome-debug"
echo ""
echo "  2. In Mimir UI (http://localhost:3023):"
echo "     - Browser Mode: Existing (CDP)"
echo "     - CDP URL: http://localhost:9222"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting backend on port 3022..."
source backend/venv/bin/activate
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 3022 --log-level warning &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "⚛️  Starting frontend on port 3023..."
cd frontend
npm run dev -- --port 3023 --host 127.0.0.1 &
FRONTEND_PID=$!
cd ..

# Wait a bit and open browser
sleep 3
echo ""
echo "✅ Services started!"
echo ""
echo "🌐 Opening browser at http://localhost:3023"

# Open browser
if command -v open &> /dev/null; then
    open http://localhost:3023
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3023
fi

# Wait for processes
wait
SCRIPT_EOF

chmod +x "$BUILD_DIR/start-mimir.sh"

# Create Windows batch file
cat > "$BUILD_DIR/start-mimir.bat" << 'BAT_EOF'
@echo off
echo ================================================
echo   Mimir QA Testing Platform
echo ================================================
echo.

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

REM Create venv if doesn't exist
if not exist "backend\venv" (
    echo [Setup] First run: Installing dependencies...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    playwright install chromium --quiet
    cd ..
    echo [Done] Setup complete!
    echo.
)

REM Activate venv
call backend\venv\Scripts\activate

REM Environment variables are loaded from .env file
REM No need to set here - FastAPI loads them automatically from backend\.env

REM Create serve.py (same as bash version)
copy /Y NUL backend\serve.py
(
echo import uvicorn
echo from fastapi.staticfiles import StaticFiles
echo from pathlib import Path
echo import webbrowser
echo import threading
echo.
echo from app.main import app
echo.
echo static_path = Path^(__file__^).parent.parent / "frontend-build"
echo app.mount^("/", StaticFiles^(directory=str^(static_path^), html=True^), name="static"^)
echo.
echo def open_browser^(^):
echo     import time
echo     time.sleep^(2^)
echo     webbrowser.open^("http://localhost:8000"^)
echo.
echo if __name__ == "__main__":
echo     threading.Thread^(target=open_browser, daemon=True^).start^(^)
echo     uvicorn.run^(app, host="127.0.0.1", port=8000, log_level="warning"^)
) > backend\serve.py

REM Start server
cd backend
python serve.py
BAT_EOF

# Create README
cat > "$BUILD_DIR/README.md" << 'README_EOF'
# Mimir Portable - QA Testing Platform

## Quick Start

### Mac/Linux:
```bash
./start-mimir.sh
```

### Windows:
```
start-mimir.bat
```

The app will:
1. Set up dependencies (first run only, takes ~3-4 minutes)
2. Start backend on http://localhost:3022
3. Start frontend on http://localhost:3023
4. Open your browser automatically

## Using CDP (Local Browser)

To use your local Chrome for testing:

### 1. Start Chrome with CDP

**Mac**:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug &
```

**Windows**:
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir=C:\temp\chrome-debug
```

### 2. Configure in Mimir UI

- Browser Mode: **Existing (CDP)**
- CDP URL: `http://localhost:9222`
- Execute test → See it run in your Chrome!

## Requirements

- Python 3.11+
- Node.js 18+
- Internet connection (first run only, to download dependencies)
- Chrome/Chromium (for browser automation)

## Environment Variables

Edit `start-mimir.sh` or `start-mimir.bat` to configure:

- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `OPENAI_API_KEY` - Your OpenAI API key (if using GPT)
- `LLM_PROVIDER` - "anthropic" or "openai"

## Ports

- **Backend**: 3022
- **Frontend**: 3023
- **CDP**: 9222 (Chrome remote debugging)

## Troubleshooting

**"Python not found"**: Install Python 3.11+ from https://python.org

**"Node.js not found"**: Install Node.js from https://nodejs.org

**"Port 3022/3023 already in use"**: Change ports in `start-mimir.sh` (search for 3022 and 3023)

**Slow first run**: Normal, installing ~600MB of dependencies

## Files

- `start-mimir.sh` / `start-mimir.bat` - Startup scripts
- `backend/` - FastAPI server + Python dependencies
- `frontend/` - React UI source code + Node dependencies
- `backend/.env` - Configuration (API keys, settings)

## Distribution

To share with others:
1. Zip the entire `Mimir-Portable` folder
2. Share the zip file
3. Recipients just unzip and run start script
4. No installation needed (besides Python)!
README_EOF

# Create .env.example
cat > "$BUILD_DIR/backend/.env.example" << 'ENV_EOF'
# LLM Provider
LLM_PROVIDER=anthropic

# API Keys (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Browser (leave as local for portable app)
BROWSER_EXECUTION_MODE=local

# Optional: Models
TEST_CASE_AGENT_MODEL=claude-sonnet-4-5-20250929
QA_AGENT_MODEL=claude-sonnet-4-5-20250929
ENV_EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Portable App Created!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Location: $BUILD_DIR/"
echo ""
echo "  Configuration: ✅ API keys already configured from backend/.env"
echo ""
echo "  Next steps:"
echo "  1. Run the app:"
echo "     cd $BUILD_DIR"
echo "     ./start-mimir.sh"
echo ""
echo "  2. (Optional) Review configuration:"
echo "     nano $BUILD_DIR/backend/.env"
echo ""
echo "  3. To distribute:"
echo "     zip -r Mimir-Portable.zip $BUILD_DIR/"
echo "     Share Mimir-Portable.zip with others"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
