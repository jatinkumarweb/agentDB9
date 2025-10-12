#!/bin/bash

# Login Page Functionality Test Script
# Tests backend integration without UI changes

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

echo -e "${BLUE}=========================================="
echo "Login Page Functionality Tests"
echo -e "==========================================${NC}\n"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED${NC}\n"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}\n"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}\n"

if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running at ${API_URL}${NC}"
    echo "Please start the backend first: cd backend && npm run start:dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

if ! curl -s "${FRONTEND_URL}" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend is not running at ${FRONTEND_URL}${NC}"
    echo "Note: Some tests will be skipped"
    FRONTEND_RUNNING=false
else
    echo -e "${GREEN}✅ Frontend is running${NC}"
    FRONTEND_RUNNING=true
fi

echo ""

# Backend API Tests
echo -e "${BLUE}=========================================="
echo "Backend API Tests"
echo -e "==========================================${NC}\n"

# Test 1: Login endpoint exists
run_test "Login endpoint is accessible" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"test\",\"password\":\"test\"}' \
        -w '%{http_code}' -o /dev/null | grep -E '(200|400|401)'"

# Test 2: Login with valid credentials
run_test "Login with valid credentials returns 200" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"demo@agentdb9.com\",\"password\":\"demo123\"}' \
        -w '%{http_code}' -o /dev/null | grep '200'"

# Test 3: Login response contains required fields
run_test "Login response contains user and accessToken" \
    "RESPONSE=\$(curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"demo@agentdb9.com\",\"password\":\"demo123\"}'); \
    echo \$RESPONSE | jq -e '.user' > /dev/null && \
    echo \$RESPONSE | jq -e '.accessToken' > /dev/null"

# Test 4: Login with invalid credentials returns 401
run_test "Login with invalid credentials returns 401" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"wrong@example.com\",\"password\":\"wrongpass\"}' \
        -w '%{http_code}' -o /dev/null | grep '401'"

# Test 5: Login with missing email returns 400
run_test "Login with missing email returns 400" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"password\":\"test123\"}' \
        -w '%{http_code}' -o /dev/null | grep '400'"

# Test 6: Login with missing password returns 400
run_test "Login with missing password returns 400" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"test@example.com\"}' \
        -w '%{http_code}' -o /dev/null | grep '400'"

# Test 7: User object structure
run_test "User object contains required fields" \
    "RESPONSE=\$(curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"demo@agentdb9.com\",\"password\":\"demo123\"}'); \
    echo \$RESPONSE | jq -e '.user.id' > /dev/null && \
    echo \$RESPONSE | jq -e '.user.email' > /dev/null && \
    echo \$RESPONSE | jq -e '.user.username' > /dev/null"

# Test 8: Token format
run_test "Access token is a valid JWT format" \
    "RESPONSE=\$(curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"demo@agentdb9.com\",\"password\":\"demo123\"}'); \
    TOKEN=\$(echo \$RESPONSE | jq -r '.accessToken'); \
    echo \$TOKEN | grep -E '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'"

# Test 9: Token can be used for authenticated requests
run_test "Token works for authenticated endpoints" \
    "RESPONSE=\$(curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"demo@agentdb9.com\",\"password\":\"demo123\"}'); \
    TOKEN=\$(echo \$RESPONSE | jq -r '.accessToken'); \
    curl -s -X GET ${API_URL}/api/auth/profile \
        -H 'Authorization: Bearer '\$TOKEN \
        -w '%{http_code}' -o /dev/null | grep '200'"

# Test 10: Profile endpoint returns user data
run_test "Profile endpoint returns correct user data" \
    "RESPONSE=\$(curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"demo@agentdb9.com\",\"password\":\"demo123\"}'); \
    TOKEN=\$(echo \$RESPONSE | jq -r '.accessToken'); \
    PROFILE=\$(curl -s -X GET ${API_URL}/api/auth/profile \
        -H 'Authorization: Bearer '\$TOKEN); \
    echo \$PROFILE | jq -e '.data.email' > /dev/null"

# Frontend Integration Tests (if frontend is running)
if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${BLUE}=========================================="
    echo "Frontend Integration Tests"
    echo -e "==========================================${NC}\n"

    # Test 11: Login page loads
    run_test "Login page loads successfully" \
        "curl -s ${FRONTEND_URL}/auth/login -w '%{http_code}' -o /dev/null | grep '200'"

    # Test 12: Login page contains form elements
    run_test "Login page contains email input" \
        "curl -s ${FRONTEND_URL}/auth/login | grep -i 'email'"

    # Test 13: Login page contains password input
    run_test "Login page contains password input" \
        "curl -s ${FRONTEND_URL}/auth/login | grep -i 'password'"

    # Test 14: Login page contains submit button
    run_test "Login page contains sign in button" \
        "curl -s ${FRONTEND_URL}/auth/login | grep -i 'sign in'"
fi

# Security Tests
echo -e "${BLUE}=========================================="
echo "Security Tests"
echo -e "==========================================${NC}\n"

# Test 15: Password not returned in response
run_test "Password is not included in login response" \
    "RESPONSE=\$(curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"demo@agentdb9.com\",\"password\":\"demo123\"}'); \
    ! echo \$RESPONSE | jq -e '.user.password' > /dev/null"

# Test 16: CORS headers present
run_test "CORS headers are present" \
    "curl -s -I -X OPTIONS ${API_URL}/api/auth/login \
        -H 'Origin: http://localhost:3000' | grep -i 'access-control'"

# Test 17: Content-Type validation
run_test "Invalid Content-Type is rejected" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: text/plain' \
        -d 'invalid data' \
        -w '%{http_code}' -o /dev/null | grep -E '(400|415)'"

# Error Handling Tests
echo -e "${BLUE}=========================================="
echo "Error Handling Tests"
echo -e "==========================================${NC}\n"

# Test 18: Invalid JSON returns error
run_test "Invalid JSON returns 400" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d 'invalid json' \
        -w '%{http_code}' -o /dev/null | grep '400'"

# Test 19: Empty request body returns error
run_test "Empty request body returns 400" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{}' \
        -w '%{http_code}' -o /dev/null | grep '400'"

# Test 20: SQL injection attempt is handled
run_test "SQL injection attempt is rejected" \
    "curl -s -X POST ${API_URL}/api/auth/login \
        -H 'Content-Type: application/json' \
        -d '{\"email\":\"admin@example.com OR 1=1--\",\"password\":\"test\"}' \
        -w '%{http_code}' -o /dev/null | grep -E '(400|401)'"

# Summary
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo -e "==========================================${NC}\n"

echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
