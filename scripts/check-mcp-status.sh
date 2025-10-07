#!/bin/bash

# Quick MCP Server status check
# Works in any environment (local, Gitpod, etc.)

echo "🔍 MCP Server Status Check"
echo "=========================="
echo ""

# Check if container is running
echo "1. Container Status:"
if docker ps --format "{{.Names}}" | grep -q "mcp-server"; then
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "mcp-server")
    STATUS=$(docker ps --filter "name=mcp-server" --format "{{.Status}}")
    echo "   ✅ Running: $CONTAINER_NAME"
    echo "   Status: $STATUS"
else
    echo "   ❌ Not running"
    echo ""
    echo "   Start with: docker-compose up -d mcp-server"
    exit 1
fi

echo ""

# Check health endpoint
echo "2. Health Check:"
HEALTH_RESPONSE=$(curl -s http://localhost:9001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ Health endpoint responding"
    echo "   Response: $(echo $HEALTH_RESPONSE | jq -r '.status, .service, .tools' 2>/dev/null || echo $HEALTH_RESPONSE)"
else
    echo "   ❌ Health endpoint not responding"
    echo "   URL: http://localhost:9001/health"
fi

echo ""

# Check tool count
echo "3. Registered Tools:"
TOOLS_COUNT=$(echo $HEALTH_RESPONSE | jq -r '.tools' 2>/dev/null)
if [ ! -z "$TOOLS_COUNT" ] && [ "$TOOLS_COUNT" != "null" ]; then
    echo "   ✅ $TOOLS_COUNT tools registered"
else
    echo "   ⚠️  Could not get tool count"
fi

echo ""

# Check recent logs
echo "4. Recent Activity:"
RECENT_LOGS=$(docker logs agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]" | tail -3)
if [ ! -z "$RECENT_LOGS" ]; then
    echo "   Last 3 tool executions:"
    echo "$RECENT_LOGS" | sed 's/^/   /'
else
    echo "   No recent tool executions"
fi

echo ""

# Check for errors
echo "5. Recent Errors:"
ERROR_COUNT=$(docker logs agentdb9-mcp-server-1 2>&1 | grep -c "\[ERROR\]" || echo "0")
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "   ⚠️  $ERROR_COUNT errors found"
    echo "   Last error:"
    docker logs agentdb9-mcp-server-1 2>&1 | grep "\[ERROR\]" | tail -1 | sed 's/^/   /'
else
    echo "   ✅ No errors"
fi

echo ""
echo "=========================="
echo "Summary: MCP Server is $([ $? -eq 0 ] && echo '✅ HEALTHY' || echo '⚠️  HAS ISSUES')"
echo ""
echo "Commands:"
echo "  View logs:        ./scripts/show-mcp-logs.sh"
echo "  Test tool:        curl -X POST http://localhost:9001/api/tools/execute -H 'Content-Type: application/json' -d '{\"tool\":\"fs_list_directory\",\"parameters\":{\"path\":\"/workspace\"}}'"
echo "  Restart:          docker-compose restart mcp-server"
echo "  View all logs:    docker logs -f agentdb9-mcp-server-1"
