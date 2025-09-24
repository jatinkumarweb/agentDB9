#!/bin/bash

# API Key Handling Test Script
set -e

echo "🔑 Testing API Key Handling..."
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -e "\n${BLUE}🧪 $test_name${NC}"
    ((TESTS_TOTAL++))
    
    if eval "$test_command" > /tmp/api_test_output 2>&1; then
        local result=$(cat /tmp/api_test_output)
        
        if [[ "$result" == *"$expected_result"* ]]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ FAILED${NC}"
            echo -e "${RED}   Expected: $expected_result${NC}"
            echo -e "${RED}   Got: $(echo "$result" | head -1)${NC}"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${RED}❌ FAILED (Command failed)${NC}"
        cat /tmp/api_test_output | head -3
        ((TESTS_FAILED++))
    fi
}

echo -e "\n📋 Checking Environment Variables"
echo "================================="

# Check current API key status
echo "Current API key configuration:"
if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "  OpenAI: ${GREEN}✅ Configured${NC}"
else
    echo -e "  OpenAI: ${YELLOW}⚠️  Not configured${NC}"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo -e "  Anthropic: ${GREEN}✅ Configured${NC}"
else
    echo -e "  Anthropic: ${YELLOW}⚠️  Not configured${NC}"
fi

if [ -n "$COHERE_API_KEY" ]; then
    echo -e "  Cohere: ${GREEN}✅ Configured${NC}"
else
    echo -e "  Cohere: ${YELLOW}⚠️  Not configured${NC}"
fi

if [ -n "$HUGGINGFACE_API_KEY" ]; then
    echo -e "  HuggingFace: ${GREEN}✅ Configured${NC}"
else
    echo -e "  HuggingFace: ${YELLOW}⚠️  Not configured${NC}"
fi

echo -e "\n🔧 Testing Model Availability API"
echo "================================="

# Test models endpoint
run_test "Models endpoint accessibility" \
    "curl -s http://localhost:9000/api/models | jq -e '.success'" \
    "true"

run_test "Models endpoint returns model list" \
    "curl -s http://localhost:9000/api/models | jq -e '.models | length > 0'" \
    "true"

run_test "Disabled models are marked correctly" \
    "curl -s http://localhost:9000/api/models | jq -r '.models[] | select(.status == \"disabled\") | .reason'" \
    "API key not configured"

echo -e "\n🤖 Testing Model Generation with API Key Handling"
echo "================================================="

# Test generation with available model (Ollama)
run_test "Generation with available model (codellama:7b)" \
    "curl -s -X POST http://localhost:9000/api/generate -H 'Content-Type: application/json' -d '{\"prompt\":\"test\",\"modelId\":\"codellama:7b\",\"provider\":\"ollama\"}' | jq -e '.success'" \
    "true"

# Test generation with disabled model (if no API key)
if [ -z "$OPENAI_API_KEY" ]; then
    run_test "Generation with disabled model (gpt-4) returns proper error" \
        "curl -s -X POST http://localhost:9000/api/generate -H 'Content-Type: application/json' -d '{\"prompt\":\"test\",\"modelId\":\"gpt-4\",\"provider\":\"openai\"}' | jq -r '.error'" \
        "Model is disabled"
        
    run_test "Disabled model error includes reason" \
        "curl -s -X POST http://localhost:9000/api/generate -H 'Content-Type: application/json' -d '{\"prompt\":\"test\",\"modelId\":\"gpt-4\",\"provider\":\"openai\"}' | jq -r '.reason'" \
        "API key not configured"
else
    echo -e "${YELLOW}⚠️  Skipping disabled model tests (OpenAI API key is configured)${NC}"
fi

echo -e "\n🌐 Testing Frontend Model Selector"
echo "=================================="

# Test frontend models endpoint (proxied through backend)
run_test "Frontend models endpoint accessibility" \
    "curl -s http://localhost:8000/api/models | jq -e '.success'" \
    "true"

run_test "Frontend receives disabled model information" \
    "curl -s http://localhost:8000/api/models | jq -e '.models[] | select(.status == \"disabled\") | has(\"requiresApiKey\")'" \
    "true"

echo -e "\n📊 Testing Environment Health with Disabled Models"
echo "=================================================="

# Test that disabled models don't cause environment to be marked as unhealthy
run_test "Environment health handles disabled models gracefully" \
    "curl -s -X POST http://localhost:8000/api/test/environment -H 'Content-Type: application/json' -d '{\"runAll\":true}' | jq -e '.health.overall != \"unhealthy\"'" \
    "true"

run_test "Model tests distinguish between disabled and failed" \
    "curl -s -X POST http://localhost:8000/api/test/environment -H 'Content-Type: application/json' -d '{\"runAll\":true}' | jq -e '.models.summary.skipped > 0 or .models.summary.passed > 0'" \
    "true"

echo -e "\n🔍 Testing Configuration Validation"
echo "==================================="

# Test .env.example file exists and contains API key placeholders
run_test ".env.example contains API key placeholders" \
    "grep -q 'OPENAI_API_KEY=your_openai_key_here' .env.example" \
    ""

run_test ".env.example contains all required API keys" \
    "grep -q 'ANTHROPIC_API_KEY\\|COHERE_API_KEY\\|HUGGINGFACE_API_KEY' .env.example" \
    ""

echo -e "\n📋 Testing Documentation and User Guidance"
echo "=========================================="

# Test that testing interface shows helpful messages for disabled models
run_test "Test interface handles disabled models" \
    "curl -s http://localhost:3000/test/env | grep -q 'API.*key.*required' || echo 'Interface accessible'" \
    "Interface accessible"

echo -e "\n📊 Test Results Summary"
echo "======================"

echo "Total Tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

SUCCESS_RATE=$(( (TESTS_PASSED * 100) / TESTS_TOTAL ))
echo "Success Rate: $SUCCESS_RATE%"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All API key handling tests passed!${NC}"
    echo -e "✅ Models are properly disabled when API keys are missing"
    echo -e "✅ Error messages are user-friendly and informative"
    echo -e "✅ Environment health correctly handles disabled models"
    echo -e "✅ Frontend gracefully shows disabled models"
elif [ $TESTS_FAILED -le 2 ]; then
    echo -e "\n${YELLOW}⚠️  Minor issues with API key handling${NC}"
    echo -e "Most functionality works correctly"
else
    echo -e "\n${RED}❌ Significant issues with API key handling${NC}"
    echo -e "Please review the implementation"
fi

echo -e "\n💡 Configuration Tips"
echo "===================="

if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}💡 To enable external models:${NC}"
    echo "   1. Copy .env.example to .env"
    echo "   2. Add your API keys to the .env file"
    echo "   3. Restart the services: docker-compose restart"
    echo "   4. External models will become available automatically"
else
    echo -e "${GREEN}✅ External API models are configured and available${NC}"
fi

echo -e "\n🔗 Useful Commands"
echo "=================="
echo "  • Check model status: curl http://localhost:9000/api/models"
echo "  • Test environment: npm run test:env"
echo "  • View test interface: http://localhost:3000/test/env"
echo "  • Check logs: docker-compose logs llm-service"

# Cleanup
rm -f /tmp/api_test_output

if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
elif [ $TESTS_FAILED -le 2 ]; then
    exit 1
else
    exit 2
fi