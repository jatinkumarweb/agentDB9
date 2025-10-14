#!/bin/bash
# Quick start script for macOS

set -e

echo "=========================================="
echo "Starting AgentDB9 on macOS"
echo "=========================================="
echo ""

# Check if on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only"
    exit 1
fi

# Pull VSCode base image if not exists
if ! docker images agentdb9-vscode:latest | grep -q agentdb9-vscode; then
    echo "📥 Pulling VSCode base image..."
    docker pull codercom/code-server:latest
    docker tag codercom/code-server:latest agentdb9-vscode:latest
    echo "✅ VSCode image ready"
    echo ""
fi

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.arm64.yml -f docker-compose.mac.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "=========================================="
echo "✅ Services started!"
echo "=========================================="
echo ""
echo "Access the application:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  VSCode:    http://localhost:8080"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
