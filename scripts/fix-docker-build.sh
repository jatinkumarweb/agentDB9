#!/bin/bash
set -e

echo "🔧 Fixing Docker build issues..."

# Stop all containers
echo "📦 Stopping containers..."
docker-compose down

# Clean up Docker build cache
echo "🧹 Cleaning Docker build cache..."
docker builder prune -f

# Remove backend image to force rebuild
echo "🗑️  Removing old backend image..."
docker rmi agentdb9-backend 2>/dev/null || true

# Clear npm cache in backend
echo "🧹 Clearing npm cache..."
cd backend
npm cache clean --force
cd ..

# Build with no cache and verbose output
echo "🏗️  Building backend with no cache..."
DOCKER_BUILDKIT=1 docker-compose build --no-cache --progress=plain backend

echo "✅ Build complete! Starting services..."
docker-compose up -d

echo "📊 Checking backend logs..."
docker-compose logs -f backend
