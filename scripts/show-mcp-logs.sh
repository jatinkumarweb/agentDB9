#!/bin/bash

# Show MCP Server logs with filtering for important messages
# This makes it easier to see MCP server activity

echo "📋 MCP Server Logs"
echo "=================="
echo ""

# Check if MCP server is running
if ! docker ps | grep -q "agentdb9-mcp-server"; then
    echo "❌ MCP server is not running"
    echo ""
    echo "Start it with: docker-compose up -d mcp-server"
    exit 1
fi

echo "✅ MCP server is running"
echo ""

# Show options
echo "Choose log view:"
echo "  1) All logs (default)"
echo "  2) Only [INFO] logs"
echo "  3) Only [API] and [HANDLER] logs (tool execution)"
echo "  4) Only errors"
echo "  5) Follow live logs"
echo ""

# Get user choice or default to 1
read -p "Enter choice (1-5) [1]: " choice
choice=${choice:-1}

echo ""
echo "Showing logs..."
echo "=================="
echo ""

case $choice in
    1)
        # All logs
        docker logs agentdb9-mcp-server-1 2>&1 | tail -100
        ;;
    2)
        # Only INFO logs
        docker logs agentdb9-mcp-server-1 2>&1 | grep "\[INFO\]" | tail -50
        ;;
    3)
        # Only API and HANDLER logs
        docker logs agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]" | tail -50
        ;;
    4)
        # Only errors
        docker logs agentdb9-mcp-server-1 2>&1 | grep -E "\[ERROR\]|Error|error" | tail -50
        ;;
    5)
        # Follow live logs
        echo "Following live logs (Ctrl+C to stop)..."
        echo ""
        docker logs -f agentdb9-mcp-server-1 2>&1
        ;;
    *)
        echo "Invalid choice, showing all logs"
        docker logs agentdb9-mcp-server-1 2>&1 | tail -100
        ;;
esac
