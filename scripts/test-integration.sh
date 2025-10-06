#!/bin/bash

# Integration Test Script for AgentDB9
# Tests the complete flow: Frontend -> Backend -> LLM Service -> MCP Server -> Ollama

set -e

echo "🧪 AgentDB9 Integration Test Suite"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

info() {
    echo -e "ℹ️  $1"
}

# Test 1: Check if services are running
echo "Test 1: Service Health Checks"
echo "------------------------------"

# Backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    pass "Backend service is running (port 8000)"
else
    fail "Backend service is not accessible"
fi

# Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    pass "Frontend service is running (port 3000)"
else
    fail "Frontend service is not accessible"
fi

# LLM Service
if curl -s http://localhost:9000/health > /dev/null 2>&1; then
    pass "LLM service is running (port 9000)"
else
    fail "LLM service is not accessible"
fi

# MCP Server
if curl -s http://localhost:9001/health > /dev/null 2>&1; then
    pass "MCP server is running (port 9001)"
else
    fail "MCP server is not accessible"
fi

# Ollama (optional)
if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    pass "Ollama service is running (port 11434)"
    OLLAMA_AVAILABLE=true
else
    warn "Ollama service is not accessible (optional for local dev)"
    OLLAMA_AVAILABLE=false
fi

echo ""

# Test 2: Check Ollama models
if [ "$OLLAMA_AVAILABLE" = true ]; then
    echo "Test 2: Ollama Model Availability"
    echo "----------------------------------"
    
    MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -n "$MODELS" ]; then
        pass "Ollama models available:"
        echo "$MODELS" | while read -r model; do
            echo "   - $model"
        done
    else
        warn "No Ollama models downloaded. Run: npm run setup:ollama"
    fi
    echo ""
fi

# Test 3: Backend API endpoints
echo "Test 3: Backend API Endpoints"
echo "------------------------------"

# Health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    pass "Backend health endpoint returns OK"
else
    fail "Backend health endpoint not responding correctly"
fi

# Models endpoint
MODELS_RESPONSE=$(curl -s http://localhost:9000/api/models)
if echo "$MODELS_RESPONSE" | grep -q '"success":true'; then
    pass "LLM service models endpoint accessible"
else
    fail "LLM service models endpoint not responding"
fi

echo ""

# Test 4: WebSocket connectivity
echo "Test 4: WebSocket Connectivity"
echo "-------------------------------"

# Test WebSocket connection using Node.js
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:8000', {
    transports: ['websocket', 'polling'],
    timeout: 5000
});

socket.on('connect', () => {
    console.log('${GREEN}✅ PASS${NC}: WebSocket connection established');
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.log('${RED}❌ FAIL${NC}: WebSocket connection failed:', error.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('${RED}❌ FAIL${NC}: WebSocket connection timeout');
    process.exit(1);
}, 5000);
" 2>/dev/null && ((TESTS_PASSED++)) || ((TESTS_FAILED++))

echo ""

# Test 5: MCP Tools availability
echo "Test 5: MCP Tools Availability"
echo "-------------------------------"

MCP_TOOLS=$(curl -s http://localhost:9001/api/tools)
if echo "$MCP_TOOLS" | grep -q '"success":true'; then
    TOOL_COUNT=$(echo "$MCP_TOOLS" | grep -o '"name"' | wc -l)
    pass "MCP server has $TOOL_COUNT tools available"
else
    fail "MCP server tools endpoint not responding"
fi

echo ""

# Test 6: Database connectivity
echo "Test 6: Database Connectivity"
echo "------------------------------"

if [ -f "./data/agentdb9.db" ]; then
    pass "SQLite database file exists"
else
    warn "SQLite database file not found (will be created on first use)"
fi

echo ""

# Test 7: Environment configuration
echo "Test 7: Environment Configuration"
echo "----------------------------------"

# Check for API keys (optional)
if [ -n "$OPENAI_API_KEY" ]; then
    pass "OpenAI API key configured"
else
    info "OpenAI API key not configured (optional)"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    pass "Anthropic API key configured"
else
    info "Anthropic API key not configured (optional)"
fi

echo ""

# Test 8: Integration test - Create conversation
echo "Test 8: End-to-End Integration Test"
echo "------------------------------------"

info "This test requires authentication. Skipping for now."
info "To test manually:"
info "  1. Open http://localhost:3000"
info "  2. Sign up / Log in"
info "  3. Create a new conversation"
info "  4. Send a message"
info "  5. Verify agent response"

echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open http://localhost:3000 in your browser"
    echo "  2. Sign up or log in"
    echo "  3. Create a conversation and test the agent"
    if [ "$OLLAMA_AVAILABLE" = false ]; then
        echo ""
        echo "To enable Ollama models:"
        echo "  npm run setup:ollama"
    fi
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Services not running: Run 'npm run dev' or 'docker-compose up'"
    echo "  - Port conflicts: Check if ports 3000, 8000, 9000, 9001 are available"
    echo "  - Database issues: Run 'npm run clean:db' to reset"
    exit 1
fi
