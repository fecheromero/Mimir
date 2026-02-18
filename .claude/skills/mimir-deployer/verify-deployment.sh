#!/bin/bash
# Deployment Verification Script
# Usage: ./verify-deployment.sh <api-url> <frontend-url>

set -e

API_URL=${1:-""}
FRONTEND_URL=${2:-""}

if [ -z "$API_URL" ] || [ -z "$FRONTEND_URL" ]; then
    echo "Usage: ./verify-deployment.sh <api-url> <frontend-url>"
    echo "Example: ./verify-deployment.sh https://mimir-api.onrender.com https://mimir.vercel.app"
    exit 1
fi

echo "🔍 Verifying Mimir Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: API Health
echo ""
echo "1️⃣  Testing API health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ API is responding (HTTP $HTTP_CODE)"
else
    echo "   ❌ API health check failed (HTTP $HTTP_CODE)"
    exit 1
fi

# Test 2: API Docs
echo ""
echo "2️⃣  Testing API documentation..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ API docs accessible at $API_URL/docs"
else
    echo "   ⚠️  API docs not found (HTTP $HTTP_CODE)"
fi

# Test 3: CORS Headers
echo ""
echo "3️⃣  Testing CORS configuration..."
CORS_HEADER=$(curl -s -H "Origin: $FRONTEND_URL" -I "$API_URL/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    echo "   ✅ CORS headers configured"
    echo "   📋 $CORS_HEADER"
else
    echo "   ❌ CORS headers missing (frontend won't be able to call API)"
    exit 1
fi

# Test 4: Frontend Accessibility
echo ""
echo "4️⃣  Testing frontend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Frontend is live"
else
    echo "   ❌ Frontend not accessible (HTTP $HTTP_CODE)"
    exit 1
fi

# Test 5: Frontend API Configuration
echo ""
echo "5️⃣  Checking frontend API configuration..."
FRONTEND_HTML=$(curl -s "$FRONTEND_URL")
if echo "$FRONTEND_HTML" | grep -q "VITE_API_URL"; then
    echo "   ⚠️  VITE_API_URL might be exposed in HTML (check env vars)"
else
    echo "   ✅ Environment variables properly configured"
fi

# Test 6: API Endpoints
echo ""
echo "6️⃣  Testing API endpoints..."

# Test generate endpoint (OPTIONS for CORS preflight)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_URL/api/generate" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ /api/generate endpoint exists"
else
    echo "   ⚠️  /api/generate CORS preflight failed (HTTP $HTTP_CODE)"
fi

# Test execute endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_URL/api/execute" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ /api/execute endpoint exists"
else
    echo "   ⚠️  /api/execute CORS preflight failed (HTTP $HTTP_CODE)"
fi

# Test replay endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_URL/api/replay" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ /api/replay endpoint exists"
else
    echo "   ⚠️  /api/replay CORS preflight failed (HTTP $HTTP_CODE)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Deployment verification complete!"
echo ""
echo "📍 API URL: $API_URL"
echo "📍 Frontend URL: $FRONTEND_URL"
echo "📍 API Docs: $API_URL/docs"
echo ""
echo "Next steps:"
echo "  1. Visit $FRONTEND_URL in your browser"
echo "  2. Try generating a test case"
echo "  3. Monitor logs in Render dashboard"
echo "  4. Check Vercel deployment logs if issues occur"
echo ""
