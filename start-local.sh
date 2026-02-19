#!/bin/bash
# Start Mimir completely local (no tunnels needed)

set -e

echo "🚀 Starting Mimir (Local Development)"
echo ""

# Detect Chrome path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CHROME_PATH="google-chrome"
else
    echo "❌ Unsupported OS"
    exit 1
fi

# Kill existing Chrome CDP
echo "🧹 Cleaning up..."
pkill -f "remote-debugging-port=9222" 2>/dev/null || true
sleep 1

# Start Chrome with CDP
echo "📱 Starting Chrome with CDP..."
"$CHROME_PATH" \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug-mimir" \
  --no-first-run \
  > /dev/null 2>&1 &

sleep 2
echo "✅ Chrome started on http://localhost:9222"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎯 NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Start backend (new terminal):"
echo "     cd backend && uvicorn app.main:app --reload"
echo ""
echo "  2. Start frontend (new terminal):"
echo "     cd frontend && npm run dev"
echo ""
echo "  3. Open http://localhost:3000"
echo ""
echo "  4. Configure in Mimir:"
echo "     - Browser Mode: Existing (CDP)"
echo "     - CDP URL: http://localhost:9222"
echo ""
echo "  5. Execute test!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop Chrome..."

# Wait for Ctrl+C
wait
