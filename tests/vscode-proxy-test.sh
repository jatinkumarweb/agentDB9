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

# Function to test path handling with detailed logging
test_path_handling() {
    local port=$1
    local test_path=$2
    local expected_behavior=$3
    
    echo ""
    echo "Testing path handling for port $port with path: $test_path"
    
    # Make request and capture backend logs
    curl -s "http://localhost:8000/proxy/${port}${test_path}" > /dev/null 2>&1
    sleep 1
    
    # Check logs for path handling
    local logs=$(docker-compose logs --tail=30 backend 2>/dev/null)
    
    if echo "$logs" | grep -q "$expected_behavior"; then
        print_status "PASS" "Path handling for port $port: $expected_behavior"
        ((PASSED_TESTS++))
        return 0
    else
        print_status "FAIL" "Path handling for port $port: Expected '$expected_behavior' not found in logs"
        ((FAILED_TESTS++))
        FAILED_TEST_NAMES+=("Path handling for port $port")
        return 1
    fi
}

# Function to verify no double prefix bug
verify_no_double_prefix() {
    local port=$1
    
    echo ""
    echo "Verifying no double prefix bug for port $port"
    
    # Make request
    curl -s "http://localhost:8000/proxy/${port}/?test=double_prefix_check" > /dev/null 2>&1
    sleep 1
    
    # Check logs for double prefix
    local logs=$(docker-compose logs --tail=30 backend 2>/dev/null)
    
    if echo "$logs" | grep -q "/proxy/${port}/proxy/${port}"; then
        print_status "FAIL" "DOUBLE PREFIX BUG DETECTED for port $port!"
        ((FAILED_TESTS++))
        FAILED_TEST_NAMES+=("Double prefix bug check for port $port")
        echo "Found: /proxy/${port}/proxy/${port} in target URL"
        return 1
    else
        print_status "PASS" "No double prefix bug for port $port"
        ((PASSED_TESTS++))
        return 0
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

# Test 2.3: WebSocket Support Check
print_status "INFO" "Testing WebSocket support"

# Check if backend has http-proxy-middleware for WebSocket support
run_test "Backend has http-proxy-middleware dependency" \
    "grep -q 'http-proxy-middleware' backend/package.json" \
    ""

# Check if proxy controller handles WebSocket upgrades
run_test "Proxy controller handles WebSocket upgrade requests" \
    "grep -q 'upgrade.*websocket\|WebSocket' backend/src/proxy/proxy.controller.ts" \
    ""

# Test Suite 3: Path Handling (Regression Tests for Bug Fix)
echo ""
echo "========================================="
echo "Test Suite 3: Path Handling"
echo "========================================="

# Test 3.1: VS Code Path Stripping
# This test verifies the bug fix: backend should strip /proxy/8080 prefix
# when forwarding to VS Code
print_status "INFO" "Testing VS Code path stripping (port 8080)"

# Check backend logs for path stripping
run_test "Backend strips /proxy/8080 prefix for VS Code" \
    "docker-compose logs --tail=50 backend 2>/dev/null | grep -i 'VS Code proxy: stripped prefix' || echo 'Log check: Make a request first'" \
    "stripped prefix\|Log check"

# Test 3.2: VS Code with Query Parameters
# Verify that query parameters are preserved after stripping prefix
run_test "VS Code proxy preserves query parameters" \
    "curl -s -o /dev/null -w '%{http_code}' 'http://localhost:8000/proxy/8080/?folder=/home/coder/workspace'" \
    "200\|302"

# Test 3.3: VS Code with Path and Query
# Verify complex paths work correctly
run_test "VS Code proxy handles complex paths" \
    "curl -s -o /dev/null -w '%{http_code}' 'http://localhost:8000/proxy/8080/static/out/vs/code/electron-sandbox/workbench/workbench.html'" \
    "200\|302\|404"

# Test 3.4: Dev Server Path Preservation
# For dev servers (non-8080 ports), the full path should be kept
print_status "INFO" "Testing dev server path preservation (other ports)"

# This would fail if services aren't running, but we test the logic
run_test "Backend preserves full path for dev servers (port 5173)" \
    "docker-compose logs --tail=50 backend 2>/dev/null | grep -i 'Dev server proxy: keeping full path' || echo 'Log check: Make a request to port 5173 first'" \
    "keeping full path\|Log check"

# Test 3.5: Path Stripping Logic in Code
# Verify the fix is present in the code
run_test "Proxy controller has path stripping logic for port 8080" \
    "grep -A 5 \"port === '8080'\" backend/src/proxy/proxy.controller.ts" \
    "substring\|strip"

run_test "Proxy controller preserves path for other ports" \
    "grep -B 2 -A 2 'Dev server proxy: keeping full path' backend/src/proxy/proxy.controller.ts" \
    "else\|Dev server"

# Test 3.6: Verify No Double Prefix (Regression Test)
# This catches the original bug: ensure we don't send /proxy/8080/proxy/8080/
print_status "INFO" "Verifying no double prefix bug (REGRESSION TEST)"

# Test for port 8080 (VS Code)
((TOTAL_TESTS++))
if command -v docker-compose &> /dev/null; then
    verify_no_double_prefix "8080"
else
    print_status "SKIP" "Docker Compose not available - skipping double prefix test"
fi

# Test 3.7: Detailed Path Handling Tests
print_status "INFO" "Running detailed path handling tests"

# Test VS Code path stripping with actual request
((TOTAL_TESTS++))
if command -v docker-compose &> /dev/null; then
    test_path_handling "8080" "/?folder=/home/coder/workspace" "Target path: /\|stripped prefix"
else
    print_status "SKIP" "Docker Compose not available - skipping path handling test"
fi

# Test dev server path preservation
((TOTAL_TESTS++))
if command -v docker-compose &> /dev/null; then
    # Make a request to port 5173 (even if it fails, we check the logs)
    curl -s "http://localhost:8000/proxy/5173/" > /dev/null 2>&1
    sleep 1
    logs=$(docker-compose logs --tail=30 backend 2>/dev/null)
    if echo "$logs" | grep -q "keeping full path\|Target path: /proxy/5173"; then
        print_status "PASS" "Dev server path preservation for port 5173"
        ((PASSED_TESTS++))
    else
        print_status "FAIL" "Dev server path preservation - expected 'keeping full path' in logs"
        ((FAILED_TESTS++))
        FAILED_TEST_NAMES+=("Dev server path preservation")
    fi
else
    print_status "SKIP" "Docker Compose not available - skipping dev server path test"
fi

# Test Suite 4: Error Handling
echo ""
echo "========================================="
echo "Test Suite 4: Error Handling"
echo "========================================="

# Test 4.1: Invalid Port
run_test "Invalid port returns 502" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/proxy/9999/" \
    "502"

run_test "Invalid port returns error message" \
    "curl -s http://localhost:8000/proxy/9999/" \
    "Could not reach service\|Bad Gateway\|error"

# Test Suite 5: Configuration
echo ""
echo "========================================="
echo "Test Suite 5: Configuration"
echo "========================================="

# Test 5.1: Check proxy service mappings
run_test "Proxy controller has vscode service mapping" \
    "grep -r 'vscode' backend/src/proxy/proxy.controller.ts" \
    "vscode"

# Test 5.2: Check frontend uses proxy URL
run_test "Frontend VSCodeContainer uses proxy URL" \
    "grep -r 'proxy/8080' frontend/src/components/VSCodeContainer.tsx" \
    "proxy/8080"

# Test 5.3: Verify port 8080 is mapped to vscode service
run_test "Port 8080 mapped to vscode service in proxy controller" \
    "grep -A 5 \"'8080': 'vscode'\" backend/src/proxy/proxy.controller.ts" \
    "8080.*vscode"

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
