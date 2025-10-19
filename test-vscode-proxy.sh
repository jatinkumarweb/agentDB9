#!/bin/bash

echo "🧪 Testing VSCode Container Proxy"
echo "=================================="
echo ""

echo "1️⃣  Testing proxy to vscode container port 3000:"
echo "   URL: http://localhost:8000/proxy/3000/"
echo ""

# Test the proxy
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8000/proxy/3000/ 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ SUCCESS! Proxy is working"
  echo ""
  echo "   Response preview:"
  echo "$BODY" | head -20
  echo "   ..."
  echo ""
  
  # Check for bundle.js or common React/Vite patterns
  if echo "$BODY" | grep -q "bundle.js\|main.js\|index.js\|app.js"; then
    echo "   ✅ JavaScript bundle found in response"
  else
    echo "   ⚠️  No JavaScript bundle detected (might be a different framework)"
  fi
  
elif [ "$HTTP_CODE" = "502" ]; then
  echo "   ❌ Bad Gateway - Dev server not running in vscode container"
  echo ""
  echo "   To fix:"
  echo "   1. Open vscode terminal (http://localhost:8080)"
  echo "   2. cd /home/coder/workspace/your-project"
  echo "   3. npm start (or npm run dev)"
  echo ""
  
elif [ "$HTTP_CODE" = "000" ]; then
  echo "   ❌ Backend not responding"
  echo ""
  echo "   Backend might not be running or still reloading"
  echo "   Wait a few seconds and try again"
  echo ""
  
else
  echo "   ❌ Unexpected status code"
  echo ""
  echo "   Response:"
  echo "$BODY" | head -10
  echo ""
fi

echo "2️⃣  Check backend logs for proxy attempts:"
echo "   Look for lines like:"
echo "   'Port 3000 mapped to service: vscode'"
echo "   'Trying: http://vscode:3000/'"
echo "   '✅ Success with vscode:3000'"
echo ""

echo "3️⃣  If bundle.js still not found:"
echo "   - Ensure dev server is running in vscode container"
echo "   - Check PUBLIC_URL is set correctly in dev server"
echo "   - Verify the app builds successfully"
echo ""
