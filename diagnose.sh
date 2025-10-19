#!/bin/bash

echo "🔍 Diagnosing Proxy Issue"
echo "========================="
echo ""

echo "1️⃣  Checking Gitpod Ports:"
gitpod environment port list
echo ""

echo "2️⃣  Checking what's listening on common ports:"
for port in 3000 5173 8000 8080; do
  echo -n "Port $port: "
  if curl -s --connect-timeout 1 http://localhost:$port/ > /dev/null 2>&1; then
    echo "✅ RESPONDING"
  elif curl -s --connect-timeout 1 http://0.0.0.0:$port/ > /dev/null 2>&1; then
    echo "✅ RESPONDING (via 0.0.0.0)"
  else
    echo "❌ NOT RESPONDING"
  fi
done
echo ""

echo "3️⃣  Checking processes:"
ps aux | grep -E "(node|python|nest)" | grep -v grep | grep -v vscode | head -10
echo ""

echo "4️⃣  Testing backend:"
echo -n "Backend health (localhost:8000): "
curl -s --connect-timeout 2 http://localhost:8000/health 2>&1 | head -1
echo ""

echo "5️⃣  Testing dev server:"
echo -n "Dev server (localhost:5173): "
curl -s --connect-timeout 2 http://localhost:5173/ 2>&1 | head -1
echo ""

echo "6️⃣  Testing proxy:"
echo -n "Proxy (localhost:8000/proxy/5173/): "
curl -s --connect-timeout 2 http://localhost:8000/proxy/5173/ 2>&1 | head -1
echo ""

echo ""
echo "📋 Summary:"
echo "==========="
echo ""
echo "To fix the 'Bad Gateway' error, you need to:"
echo ""
echo "1. Make sure your dev server is running:"
echo "   python3 test-server.py 5173"
echo "   OR"
echo "   cd your-project && npm run dev"
echo ""
echo "2. Make sure it's accessible:"
echo "   curl http://localhost:5173/"
echo ""
echo "3. Then the proxy will work:"
echo "   curl http://localhost:8000/proxy/5173/"
echo ""
