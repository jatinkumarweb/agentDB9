#!/bin/bash

# Local Setup Test Script
# Quick validation that the development environment is properly configured

echo "🔍 AgentDB9 Local Setup Validation"
echo "===================================="
echo ""

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found"
    exit 1
fi

# Check Docker (optional)
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✅ Docker installed: $DOCKER_VERSION"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found (optional for local dev)"
    DOCKER_AVAILABLE=false
fi

# Check if dependencies are installed
echo ""
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ Root dependencies installed"
else
    echo "❌ Root dependencies not installed. Run: npm install"
    exit 1
fi

if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "⚠️  Backend dependencies not installed. Run: npm run install:workspaces"
fi

if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "⚠️  Frontend dependencies not installed. Run: npm run install:workspaces"
fi

# Check shared package build
echo ""
echo "Checking shared package..."
if [ -d "shared/dist" ]; then
    echo "✅ Shared package built"
else
    echo "⚠️  Shared package not built. Run: npm run build:shared"
fi

# Check environment files
echo ""
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ Root .env file exists"
else
    echo "ℹ️  No root .env file (optional)"
fi

if [ -f "backend/.env" ]; then
    echo "✅ Backend .env file exists"
else
    echo "ℹ️  No backend .env file (using defaults)"
fi

if [ -f "frontend/.env.local" ]; then
    echo "✅ Frontend .env.local file exists"
else
    echo "ℹ️  No frontend .env.local file (using defaults)"
fi

# Check if services can be started
echo ""
echo "Checking if services can start..."

# Try to start backend in background
echo "Testing backend startup..."
cd backend && npm run start:dev > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!
sleep 5

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend can start successfully"
    kill $BACKEND_PID
else
    echo "❌ Backend failed to start. Check /tmp/backend-test.log"
    cat /tmp/backend-test.log
fi

cd ..

echo ""
echo "=========================================="
echo "Setup validation complete!"
echo "=========================================="
echo ""
echo "To start the development environment:"
echo "  npm run dev"
echo ""
echo "Or start services individually:"
echo "  npm run dev:backend"
echo "  npm run dev:frontend"
echo "  npm run dev:llm"
echo "  npm run dev:mcp"
echo ""
echo "To run integration tests:"
echo "  ./scripts/test-integration.sh"
