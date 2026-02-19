#!/bin/bash
# Start Chrome with CDP and expose via ngrok
# For use with Mimir deployed on Render

set -e

echo "🚀 Starting Mimir CDP Setup..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found!"
    echo ""
    echo "Please install ngrok:"
    echo "  Mac:    brew install ngrok"
    echo "  Linux:  snap install ngrok"
    echo "  Or download from: https://ngrok.com/download"
    echo ""
    exit 1
fi

# Detect Chrome path based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CHROME_PATH="google-chrome"
else
    echo "❌ Unsupported OS: $OSTYPE"
    echo "Please run Chrome manually with --remote-debugging-port=9222"
    exit 1
fi

# Check if Chrome is installed
if [[ "$OSTYPE" == "darwin"* ]] && [[ ! -f "$CHROME_PATH" ]]; then
    echo "❌ Chrome not found at: $CHROME_PATH"
    exit 1
fi

# Kill existing Chrome CDP instances
echo "🧹 Cleaning up existing Chrome CDP instances..."
pkill -f "remote-debugging-port=9222" 2>/dev/null || true
sleep 1

# Start Chrome with CDP
echo "📱 Starting Chrome with CDP on port 9222..."
"$CHROME_PATH" \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug-mimir" \
  --no-first-run \
  --no-default-browser-check \
  > /dev/null 2>&1 &

CHROME_PID=$!
sleep 2

# Check if Chrome started
if ! ps -p $CHROME_PID > /dev/null 2>&1; then
    echo "❌ Failed to start Chrome"
    exit 1
fi

echo "✅ Chrome started (PID: $CHROME_PID)"
echo ""

# Start ngrok
echo "🌐 Starting ngrok tunnel for port 9222..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 COPY THE CDP URL BELOW TO MIMIR FRONTEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Look for the line: 'Forwarding https://XXXX.ngrok.io'"
echo "  2. Copy that HTTPS URL (e.g., https://abc-123.ngrok.io)"
echo "  3. In Mimir frontend:"
echo "     - Browser Mode: Select 'Existing (CDP)'"
echo "     - CDP URL: Paste the ngrok HTTPS URL"
echo "  4. Execute your test - it will run in the Chrome window above!"
echo ""
echo "  Note: Using HTTP tunnel (free, no time limits!) ✨"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start ngrok in foreground (blocks until Ctrl+C)
# Using HTTP tunnel instead of TCP - completely free!
ngrok http 9222

# Cleanup on exit (Ctrl+C)
echo ""
echo "🧹 Cleaning up..."
kill $CHROME_PID 2>/dev/null || true
echo "✅ Done!"
