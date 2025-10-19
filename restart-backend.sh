#!/bin/bash

echo "🔄 Restarting Backend to Load New Code"
echo "======================================="
echo ""

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found"
    echo "   Backend is running in Docker, but docker command not available in this environment"
    echo ""
    echo "   Manual restart needed:"
    echo "   1. Exit this environment"
    echo "   2. Run: docker compose restart backend"
    echo "   3. Wait 30 seconds for backend to restart"
    exit 1
fi

echo "1️⃣  Checking backend status..."
docker compose ps backend

echo ""
echo "2️⃣  Restarting backend container..."
docker compose restart backend

echo ""
echo "3️⃣  Waiting for backend to be ready..."
sleep 5

for i in {1..30}; do
  if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is ready!"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo ""
echo "4️⃣  Testing proxy with new code..."
echo "   The logs should now show:"
echo "   'Full request path: /proxy/3000/static/js/bundle.js'"
echo "   'Trying: http://vscode:3000/proxy/3000/static/js/bundle.js'"
echo ""
echo "   NOT:"
echo "   'Extracted path: static/js/bundle.js'"
echo "   'Trying: http://vscode:3000/static/js/bundle.js'"
echo ""

echo "5️⃣  View backend logs:"
echo "   docker compose logs -f backend"
echo ""

echo "✅ Backend restarted!"
echo ""
echo "Now test: http://localhost:8000/proxy/3000/"
