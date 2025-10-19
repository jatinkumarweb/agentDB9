#!/bin/bash

echo "🚀 Starting All Services"
echo "======================="
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
  echo "❌ Backend directory not found"
  exit 1
fi

# Start backend
echo "1️⃣  Starting Backend (port 8000)..."
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "   Installing backend dependencies..."
  npm install
fi

# Start backend in background
npm run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "   Backend PID: $BACKEND_PID"
echo "   Waiting for backend to start..."

# Wait for backend to be ready
for i in {1..30}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Backend is ready!"
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

# Check if backend started successfully
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
  echo "   ❌ Backend failed to start"
  echo "   Check backend.log for errors"
  exit 1
fi

echo ""
echo "2️⃣  Starting Test Dev Server (port 5173)..."

# Start test server in background
python3 test-server.py 5173 > devserver.log 2>&1 &
DEVSERVER_PID=$!

echo "   Dev Server PID: $DEVSERVER_PID"
echo "   Waiting for dev server to start..."

# Wait for dev server to be ready
for i in {1..10}; do
  if curl -s http://localhost:5173/ > /dev/null 2>&1; then
    echo "   ✅ Dev server is ready!"
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

# Check if dev server started successfully
if ! curl -s http://localhost:5173/ > /dev/null 2>&1; then
  echo "   ❌ Dev server failed to start"
  echo "   Check devserver.log for errors"
  exit 1
fi

echo ""
echo "3️⃣  Testing Services..."
echo ""

# Test backend
echo "   Backend Health:"
curl -s http://localhost:8000/health
echo ""

# Test dev server
echo "   Dev Server:"
curl -s http://localhost:5173/ | head -3
echo "   ..."
echo ""

# Test proxy
echo "   Proxy:"
curl -s http://localhost:8000/proxy/5173/ | head -3
echo "   ..."
echo ""

echo ""
echo "✅ All Services Running!"
echo "======================="
echo ""
echo "📊 Service Status:"
echo "   Backend:    http://localhost:8000/health"
echo "   Dev Server: http://localhost:5173/"
echo "   Proxy:      http://localhost:8000/proxy/5173/"
echo ""
echo "📝 Logs:"
echo "   Backend:    tail -f backend.log"
echo "   Dev Server: tail -f devserver.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $DEVSERVER_PID"
echo ""
echo "💡 Access in browser:"
echo "   http://localhost:8000/proxy/5173/"
echo ""

# Save PIDs to file for easy cleanup
echo "$BACKEND_PID" > .service-pids
echo "$DEVSERVER_PID" >> .service-pids

echo "PIDs saved to .service-pids"
