#!/bin/bash
# Startup script for Render.com free tier deployment
# Runs both FastAPI (uvicorn) and Celery worker in the same process

set -e  # Exit on error

echo "🚀 Starting Mimir backend services..."

# Start Celery worker in background
echo "📦 Starting Celery worker..."
celery -A app.core.celery_app worker --loglevel=info &
CELERY_PID=$!

# Give Celery a moment to start
sleep 2

# Check if Celery started successfully
if ps -p $CELERY_PID > /dev/null; then
   echo "✅ Celery worker started (PID: $CELERY_PID)"
else
   echo "❌ Celery worker failed to start"
   exit 1
fi

# Start FastAPI in foreground (this keeps the container running)
echo "🌐 Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
