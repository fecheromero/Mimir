#!/bin/bash
# Startup script for Render.com free tier deployment
# Runs both FastAPI (uvicorn) and Celery worker in the same process
# Optimized for 512MB RAM limit

set -e  # Exit on error

echo "🚀 Starting Mimir backend services..."

# Check if Celery worker should be enabled (default: true)
ENABLE_CELERY_WORKER=${ENABLE_CELERY_WORKER:-true}

if [ "$ENABLE_CELERY_WORKER" = "true" ]; then
  # Start Celery worker in background with memory optimizations
  echo "📦 Starting Celery worker (optimized for low memory)..."
  celery -A app.core.celery_app worker \
    --loglevel=info \
    --concurrency=1 \
    --pool=solo \
    --max-tasks-per-child=10 \
    &
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
else
  echo "⏭️  Celery worker disabled (ENABLE_CELERY_WORKER=false)"
  echo "   Using synchronous execution mode only"
fi

# Start FastAPI in foreground (this keeps the container running)
echo "🌐 Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
