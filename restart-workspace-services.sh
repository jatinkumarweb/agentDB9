#!/bin/bash

echo "🔄 Restarting workspace-related services..."

# Stop the affected services
echo "Stopping services..."
docker-compose stop vscode mcp-server frontend

# Remove containers to ensure clean restart
echo "Removing containers..."
docker-compose rm -f vscode mcp-server frontend

# Start services again
echo "Starting services..."
docker-compose up -d vscode mcp-server frontend

# Wait a bit for services to start
sleep 3

# Check status
echo ""
echo "✅ Service status:"
docker-compose ps vscode mcp-server frontend

echo ""
echo "📝 To view logs:"
echo "  docker-compose logs -f vscode"
echo "  docker-compose logs -f mcp-server"
echo "  docker-compose logs -f frontend"
