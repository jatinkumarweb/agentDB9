#!/bin/bash

# Fix SQLite3 installation in Docker containers
# This script rebuilds sqlite3 native module for the container architecture

echo "🔧 Fixing SQLite3 installation..."
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Get backend container name
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "❌ Backend container not found. Please start services first:"
    echo "   npm run dev"
    exit 1
fi

echo "Found backend container: $BACKEND_CONTAINER"
echo ""

# Rebuild sqlite3 in the container
echo "Rebuilding sqlite3 native module..."
docker exec $BACKEND_CONTAINER npm rebuild sqlite3

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SQLite3 rebuilt successfully!"
    echo ""
    echo "Restarting backend container..."
    docker restart $BACKEND_CONTAINER
    
    echo ""
    echo "✅ Backend restarted. Waiting for it to be ready..."
    sleep 5
    
    # Check if backend is responding
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is now running!"
        echo ""
        echo "You can now access:"
        echo "  - Backend API: http://localhost:8000"
        echo "  - API Docs: http://localhost:8000/api/docs"
    else
        echo "⚠️  Backend is starting... Check logs with:"
        echo "   npm run logs:backend"
    fi
else
    echo ""
    echo "❌ Failed to rebuild sqlite3"
    echo ""
    echo "Try rebuilding the container:"
    echo "   docker-compose up --build backend"
    exit 1
fi
