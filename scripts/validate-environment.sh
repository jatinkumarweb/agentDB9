#!/bin/bash

# Comprehensive Environment Validation Script for AgentDB9
set -e

echo "🔍 AgentDB9 Environment Validation"
echo "=================================="
echo "Running comprehensive tests on all services and components..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Test result tracking
RESULTS=()

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local is_critical="${3:-true}"
    
    echo -e "${BLUE}🧪 $test_name${NC}"
    ((TOTAL_TESTS++))
    
    if eval "$test_command" > /tmp/test_output 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED_TESTS++))
        RESULTS+=("✅ $test_name")
        
        # Show relevant output
        if [ -s /tmp/test_output ]; then
            tail -3 /tmp/test_output | sed 's/^/   /'
        fi
    else
        if [ "$is_critical" = "true" ]; then
            echo -e "${RED}❌ FAILED${NC}"
            ((FAILED_TESTS++))
            RESULTS+=("❌ $test_name")
        else
            echo -e "${YELLOW}⚠️  WARNING${NC}"
            ((WARNING_TESTS++))
            RESULTS+=("⚠️ $test_name")
        fi
        
        # Show error output
        if [ -s /tmp/test_output ]; then
            echo -e "${RED}   Error details:${NC}"
            tail -3 /tmp/test_output | sed 's/^/   /'
        fi
    fi
    echo ""
}

# Check prerequisites
echo -e "${BLUE}📋 Checking Prerequisites${NC}"
echo "=========================="

run_test "Docker availability" "command -v docker"
run_test "Docker Compose availability" "command -v docker-compose || command -v docker"
run_test "curl availability" "command -v curl"
run_test "jq availability" "command -v jq" false

echo ""

# Test Docker containers
echo -e "${BLUE}🐳 Testing Docker Containers${NC}"
echo "============================="

run_test "Frontend container" "docker ps | grep -q frontend"
run_test "Backend container" "docker ps | grep -q backend"
run_test "LLM Service container" "docker ps | grep -q llm-service"
run_test "Ollama container" "docker ps | grep -q ollama"
run_test "VS Code container" "docker ps | grep -q vscode"
run_test "PostgreSQL container" "docker ps | grep -q postgres"
run_test "Redis container" "docker ps | grep -q redis"
run_test "Qdrant container" "docker ps | grep -q qdrant"

echo ""

# Test service health endpoints
echo -e "${BLUE}🏥 Testing Service Health${NC}"
echo "========================="

run_test "Frontend health" "curl -f -s http://localhost:3000/api/health"
run_test "Backend health" "curl -f -s http://localhost:8000/health"
run_test "LLM Service health" "curl -f -s http://localhost:9000/health"
run_test "Ollama health" "curl -f -s http://localhost:11434/api/tags"
run_test "VS Code health" "curl -f -s http://localhost:8080/healthz" false
run_test "Qdrant health" "curl -f -s http://localhost:6333/health"

echo ""

# Test database connections
echo -e "${BLUE}💾 Testing Database Connections${NC}"
echo "==============================="

run_test "PostgreSQL connection" "curl -f -s http://localhost:8000/api/test/database | jq -e '.connected'"
run_test "Redis connection" "curl -f -s http://localhost:8000/api/test/redis | jq -e '.connected'"
run_test "Qdrant collections" "curl -f -s http://localhost:6333/collections"

echo ""

# Test model availability
echo -e "${BLUE}🤖 Testing Model Availability${NC}"
echo "============================="

run_test "LLM Service models endpoint" "curl -f -s http://localhost:9000/api/models"
run_test "Ollama models list" "curl -f -s http://localhost:11434/api/tags"
run_test "Model generation test" "curl -f -s -X POST http://localhost:9000/api/generate -H 'Content-Type: application/json' -d '{\"prompt\":\"test\",\"modelId\":\"codellama:7b\",\"provider\":\"ollama\",\"maxTokens\":10}'" false

echo ""

# Test API endpoints
echo -e "${BLUE}🔌 Testing API Endpoints${NC}"
echo "========================"

run_test "Backend status endpoint" "curl -f -s http://localhost:8000/api/status | jq -e '.success'"
run_test "Environment test endpoint" "curl -f -s -X POST http://localhost:8000/api/test/environment -H 'Content-Type: application/json' -d '{\"runAll\":true}'"
run_test "VS Code extension setup" "curl -f -s -X POST http://localhost:8000/api/vscode/setup-extensions" false

echo ""

# Test file system and workspace
echo -e "${BLUE}📁 Testing Workspace and Files${NC}"
echo "=============================="

run_test "Package.json exists" "test -f package.json"
run_test "Docker Compose file exists" "test -f docker-compose.yml"
run_test "Environment example exists" "test -f .env.example"
run_test "Frontend source exists" "test -d frontend/src"
run_test "Backend source exists" "test -d backend/src"
run_test "LLM Service source exists" "test -d llm-service/src"
run_test "Shared types exist" "test -d shared/src"

echo ""

# Test VS Code integration
echo -e "${BLUE}🎨 Testing VS Code Integration${NC}"
echo "=============================="

VSCODE_CONTAINER=$(docker ps --filter "name=vscode" --format "{{.Names}}" | head -1)
if [ -n "$VSCODE_CONTAINER" ]; then
    run_test "VS Code workspace mount" "docker exec $VSCODE_CONTAINER test -d /home/coder/workspace"
    run_test "VS Code Node.js" "docker exec $VSCODE_CONTAINER node --version" false
    run_test "VS Code Git" "docker exec $VSCODE_CONTAINER git --version" false
    run_test "VS Code extensions" "docker exec $VSCODE_CONTAINER code-server --list-extensions" false
else
    run_test "VS Code container running" "false"
fi

echo ""

# Performance and resource tests
echo -e "${BLUE}⚡ Testing Performance${NC}"
echo "====================="

run_test "Frontend response time" "timeout 10 curl -w '%{time_total}' -o /dev/null -s http://localhost:3000/ | awk '{exit (\$1 > 5)}'"
run_test "Backend response time" "timeout 10 curl -w '%{time_total}' -o /dev/null -s http://localhost:8000/health | awk '{exit (\$1 > 2)}'"
run_test "LLM Service response time" "timeout 10 curl -w '%{time_total}' -o /dev/null -s http://localhost:9000/health | awk '{exit (\$1 > 2)}'"

echo ""

# Generate comprehensive report
echo -e "${BLUE}📊 Validation Report${NC}"
echo "==================="

echo "Test Results Summary:"
echo "  Total Tests: $TOTAL_TESTS"
echo -e "  ${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "  ${RED}Failed: $FAILED_TESTS${NC}"
echo -e "  ${YELLOW}Warnings: $WARNING_TESTS${NC}"

echo ""
echo "Detailed Results:"
for result in "${RESULTS[@]}"; do
    echo "  $result"
done

echo ""

# Calculate success rate
SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
echo "Success Rate: $SUCCESS_RATE%"

# Determine overall status
if [ $FAILED_TESTS -eq 0 ]; then
    if [ $WARNING_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ENVIRONMENT STATUS: EXCELLENT${NC}"
        echo "All tests passed! Your AgentDB9 environment is fully operational."
    else
        echo -e "\n${GREEN}✅ ENVIRONMENT STATUS: GOOD${NC}"
        echo "Core functionality is working with minor warnings."
    fi
    OVERALL_EXIT=0
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "\n${YELLOW}⚠️  ENVIRONMENT STATUS: DEGRADED${NC}"
    echo "Most features are working but some issues need attention."
    OVERALL_EXIT=1
else
    echo -e "\n${RED}❌ ENVIRONMENT STATUS: CRITICAL${NC}"
    echo "Multiple critical issues detected. Environment needs repair."
    OVERALL_EXIT=2
fi

# Provide recommendations
echo ""
echo -e "${BLUE}🔧 Recommendations${NC}"
echo "=================="

if [ $FAILED_TESTS -gt 0 ]; then
    echo "To fix failed tests:"
    echo "  1. Check Docker containers: docker-compose ps"
    echo "  2. View service logs: docker-compose logs [service-name]"
    echo "  3. Restart services: docker-compose restart"
    echo "  4. Rebuild if needed: docker-compose up --build"
fi

if [ $WARNING_TESTS -gt 0 ]; then
    echo "To address warnings:"
    echo "  1. Install missing tools: jq, git, etc."
    echo "  2. Configure API keys in .env file"
    echo "  3. Pull Ollama models: npm run setup:ollama"
    echo "  4. Setup VS Code extensions: npm run setup:vscode"
fi

echo ""
echo "For detailed testing of specific components:"
echo "  • Test models: ./scripts/test-models.sh"
echo "  • Test databases: ./scripts/test-databases.sh"
echo "  • Test VS Code: ./scripts/test-vscode.sh"
echo "  • Environment tests: node scripts/test-environment.js"

echo ""
echo -e "${BLUE}🌐 Access Points${NC}"
echo "==============="
echo "  Frontend:     http://localhost:3000"
echo "  Backend API:  http://localhost:8000"
echo "  LLM Service:  http://localhost:9000"
echo "  VS Code:      http://localhost:8080"
echo "  Ollama:       http://localhost:11434"
echo "  Qdrant:       http://localhost:6333"
echo "  Test UI:      http://localhost:3000/test/env"

echo ""
echo "Validation completed at: $(date)"

# Cleanup
rm -f /tmp/test_output

exit $OVERALL_EXIT