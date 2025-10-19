#!/bin/bash

echo "🔍 Testing Dev Server Configuration"
echo "===================================="
echo ""

PORT="${1:-3000}"

echo "Testing port: $PORT"
echo ""

echo "1️⃣  Test: Direct access to dev server (inside vscode container)"
echo "   This tests if dev server is running and configured correctly"
echo ""

# Test if we can access the container
if ! docker compose ps vscode | grep -q "Up"; then
  echo "   ❌ VSCode container is not running"
  echo "   Run: docker compose up -d vscode"
  exit 1
fi

echo "   Testing: http://localhost:$PORT/proxy/$PORT/"
docker compose exec vscode curl -s -I "http://localhost:$PORT/proxy/$PORT/" 2>&1 | head -15
echo ""

echo "2️⃣  Test: Bundle.js with /proxy prefix (inside vscode container)"
echo "   Testing: http://localhost:$PORT/proxy/$PORT/static/js/bundle.js"
RESPONSE=$(docker compose exec vscode curl -s -I "http://localhost:$PORT/proxy/$PORT/static/js/bundle.js" 2>&1)
echo "$RESPONSE" | head -15
echo ""

# Check content type
if echo "$RESPONSE" | grep -q "Content-Type.*javascript"; then
  echo "   ✅ Correct MIME type (JavaScript)"
elif echo "$RESPONSE" | grep -q "Content-Type.*html"; then
  echo "   ❌ Wrong MIME type (HTML) - Dev server returning 404 page"
  echo ""
  echo "   This means dev server is NOT configured with PUBLIC_URL=/proxy/$PORT"
  echo ""
  echo "   Fix: Restart dev server with:"
  echo "   docker compose exec vscode bash"
  echo "   cd /home/coder/workspace/your-project"
  echo "   PUBLIC_URL=\"/proxy/$PORT\" npm start"
else
  echo "   ⚠️  Unknown content type or no response"
fi

echo ""
echo "3️⃣  Test: Via backend proxy"
echo "   Testing: http://localhost:8000/proxy/$PORT/static/js/bundle.js"
RESPONSE=$(curl -s -I "http://localhost:8000/proxy/$PORT/static/js/bundle.js" 2>&1)
echo "$RESPONSE" | head -15
echo ""

if echo "$RESPONSE" | grep -q "Content-Type.*javascript"; then
  echo "   ✅ Proxy forwarding JavaScript correctly"
elif echo "$RESPONSE" | grep -q "Content-Type.*html"; then
  echo "   ❌ Proxy forwarding HTML (dev server issue)"
elif echo "$RESPONSE" | grep -q "502"; then
  echo "   ❌ Bad Gateway - Dev server not running"
else
  echo "   ⚠️  Unknown response"
fi

echo ""
echo "4️⃣  Check dev server process"
echo "   Looking for npm/node processes in vscode container..."
docker compose exec vscode ps aux | grep -E "(npm|node)" | grep -v grep | head -5
echo ""

echo "5️⃣  Check PUBLIC_URL environment"
echo "   Checking if PUBLIC_URL is set in vscode container..."
docker compose exec vscode bash -c 'echo "PUBLIC_URL=$PUBLIC_URL"'
echo ""

echo "📋 Summary"
echo "=========="
echo ""
echo "If you see 'Wrong MIME type (HTML)':"
echo "  → Dev server is NOT configured with PUBLIC_URL=/proxy/$PORT"
echo "  → Restart dev server with correct PUBLIC_URL"
echo ""
echo "If you see 'Bad Gateway':"
echo "  → Dev server is not running"
echo "  → Start dev server in vscode container"
echo ""
echo "If you see 'Correct MIME type':"
echo "  → Configuration is correct!"
echo "  → Check browser console for other issues"
echo ""
