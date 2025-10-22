#!/bin/bash

# VS Code Proxy Test Script
# Tests the proxy functionality to ensure VS Code and dev server previews work correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a FAILED_TEST_NAMES

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        ((PASSED_TESTS++))
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        ((FAILED_TESTS++))
        FAILED_TEST_NAMES+=("$message")
    elif [ "$status" == "SKIP" ]; then
        echo -e "${YELLOW}⏭️  SKIP${NC}: $message"
    elif [ "$status" == "INFO" ]; then
        echo -e "${BLUE}ℹ️  INFO${NC}: $message"
    fi
}

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_pattern=$3
    
    ((TOTAL_TESTS++))
    echo ""
    echo "Running: $test_name"
    
    if output=$(eval "$test_command" 2>&1); then
        if echo "$output" | grep -q "$expected_pattern"; then
            print_status "PASS" "$test_name"
            return 0
        else
            print_status "FAIL" "$test_name - Expected pattern not found: $expected_pattern"
            echo "Output: $output"
            return 1
        fi
    else
        print_status "FAIL" "$test_name - Command failed"
        echo "Output: $output"
        return 1
    fi
}

# Function to check if service is running
check_service() {
    local service_name=$1
    local url=$2
    
    echo ""
    echo "Checking $service_name at $url..."
    
    if curl -s -f -m 5 "$url" > /dev/null 2>&1; then
        print_status "INFO" "$service_name is running"
        return 0
    else
        print_status "FAIL" "$service_name is not accessible at $url"
        return 1
    fi
}

echo "========================================="
echo "VS Code Proxy Test Suite"
echo "========================================="
echo ""

# Test Suite 1: Service Health Checks
echo "========================================="
echo "Test Suite 1: Service Health Checks"
echo "========================================="

# Test 1.1: Backend Health
if check_service "Backend" "http://localhost:8000/health"; then
    run_test "Backend health endpoint returns ok" \
        "curl -s http://localhost:8000/health" \
        '"status".*"ok"'
else
    print_status "SKIP" "Skipping backend tests - service not running"
    echo ""
    echo "⚠️  Backend is not running. Start services with: docker-compose up -d"
    echo "Continuing with remaining tests..."
fi

# Test 1.2: VS Code Direct Access
if check_service "VS Code (direct)" "http://localhost:8080"; then
    run_test "VS Code direct access returns 200" \
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080" \
        "200\|302"
else
    print_status "SKIP" "Skipping VS Code direct access tests - service not running"
fi

# Test 1.3: VS Code Proxied Access
if curl -s -f -m 5 "http://localhost:8000/proxy/8080/" > /dev/null 2>&1; then
    run_test "VS Code proxied access returns 200" \
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/proxy/8080/" \
        "200\|302"
else
    print_status "FAIL" "VS Code proxied access - service not accessible"
    ((TOTAL_TESTS++))
    ((FAILED_TESTS++))
    FAILED_TEST_NAMES+=("VS Code proxied access")
fi

# Test Suite 2: Proxy Controller Functionality
echo ""
echo "========================================="
echo "Test Suite 2: Proxy Controller"
echo "========================================="

# Test 2.1: Proxy OPTIONS Request (CORS)
run_test "Proxy CORS preflight returns 204" \
    "curl -s -o /dev/null -w '%{http_code}' -X OPTIONS http://localhost:8000/proxy/8080/ -H 'Origin: http://localhost:3000'" \
    "204"

run_test "Proxy CORS headers include Access-Control-Allow-Origin" \
    "curl -s -I -X OPTIONS http://localhost:8000/proxy/8080/ -H 'Origin: http://localhost:3000'" \
    "Access-Control-Allow-Origin"

run_test "Proxy CORS headers include Access-Control-Allow-Methods" \
    "curl -s -I -X OPTIONS http://localhost:8000/proxy/8080/ -H 'Origin: http://localhost:3000'" \
    "Access-Control-Allow-Methods"

# Test 2.2: Proxy GET Request
run_test "Proxy GET request returns content" \
    "curl -s http://localhost:8000/proxy/8080/ | head -c 100" \
    "html\|HTML\|<!DOCTYPE"

# Test Suite 3: Error Handling
echo ""
echo "========================================="
echo "Test Suite 3: Error Handling"
echo "========================================="

# Test 3.1: Invalid Port
run_test "Invalid port returns 502" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/proxy/9999/" \
    "502"

run_test "Invalid port returns error message" \
    "curl -s http://localhost:8000/proxy/9999/" \
    "Could not reach service\|Bad Gateway\|error"

# Test Suite 4: Configuration
echo ""
echo "========================================="
echo "Test Suite 4: Configuration"
echo "========================================="

# Test 4.1: Check proxy service mappings
run_test "Proxy controller has vscode service mapping" \
    "grep -r 'vscode' backend/src/proxy/proxy.controller.ts" \
    "vscode"

# Test 4.2: Check frontend uses proxy URL
run_test "Frontend VSCodeContainer uses proxy URL" \
    "grep -r 'proxy/8080' frontend/src/components/VSCodeContainer.tsx" \
    "proxy/8080"

# Summary
echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo "Failed Tests:"
    for test_name in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "  ${RED}❌${NC} $test_name"
    done
    echo ""
fi

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Success Rate: $SUCCESS_RATE%"
    echo ""
    
    if [ $SUCCESS_RATE -ge 80 ]; then
        echo -e "${GREEN}✅ Test suite PASSED (>= 80% success rate)${NC}"
        exit 0
    else
        echo -e "${RED}❌ Test suite FAILED (< 80% success rate)${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check if services are running: docker-compose ps"
        echo "2. Check logs: docker-compose logs backend vscode"
        echo "3. Restart services: docker-compose restart backend vscode"
        echo "4. Review test output above for specific failures"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  No tests were run${NC}"
    exit 1
fi
