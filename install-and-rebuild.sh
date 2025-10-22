#!/bin/bash

# Install and Rebuild Script for WebSocket Fix
# This script installs dependencies and rebuilds the backend

set -e

echo "========================================="
echo "Installing Dependencies and Rebuilding"
echo "========================================="
echo ""

# Step 1: Install backend dependencies
echo "Step 1: Installing backend dependencies..."
cd backend
npm install
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Step 2: Rebuild backend container
echo "Step 2: Rebuilding backend container..."
docker-compose build backend
echo "✅ Backend container rebuilt"
echo ""

# Step 3: Restart backend
echo "Step 3: Restarting backend..."
docker-compose up -d backend
echo "✅ Backend restarted"
echo ""

# Step 4: Wait for backend to be ready
echo "Step 4: Waiting for backend to be ready..."
sleep 5

# Check if backend is running
if docker-compose ps backend | grep -q "Up"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend failed to start"
    echo "Check logs: docker-compose logs backend"
    exit 1
fi
echo ""

# Step 5: Check for compilation errors
echo "Step 5: Checking for compilation errors..."
docker-compose logs backend | tail -50 | grep -i "error" && {
    echo "❌ Compilation errors found"
    echo "Check logs: docker-compose logs backend"
    exit 1
} || {
    echo "✅ No compilation errors"
}
echo ""

echo "========================================="
echo "Installation and Rebuild Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test VS Code: http://localhost:3000/workspace"
echo "2. Run tests: ./tests/vscode-proxy-test.sh"
echo "3. Check logs: docker-compose logs -f backend"
echo ""
