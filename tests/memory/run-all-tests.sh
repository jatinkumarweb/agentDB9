#!/bin/bash

# Master Test Runner for Memory System
# Runs all memory-related tests in sequence

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "Memory System - Master Test Runner"
echo "==========================================${NC}"
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_script=$2
    
    echo -e "${CYAN}Running: ${test_name}${NC}"
    echo ""
    
    ((TOTAL_TESTS++))
    
    if bash "$test_script"; then
        echo -e "${GREEN}✅ ${test_name}: PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ ${test_name}: FAILED${NC}"
        ((FAILED_TESTS++))
    fi
    
    echo ""
    echo "---"
    echo ""
}

# Test 1: Basic conversation memory flow
run_test "Conversation Memory Flow" "tests/memory/test-conversation-memory.sh"

# Test 2: Multiple conversations
run_test "Multiple Conversations" "tests/memory/test-multiple-conversations.sh"

# Final Summary
echo -e "${BLUE}=========================================="
echo "Final Test Summary"
echo "==========================================${NC}"
echo ""

echo -e "Total tests run: ${YELLOW}${TOTAL_TESTS}${NC}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}=========================================="
    echo "ALL TESTS PASSED ✅"
    echo "==========================================${NC}"
    echo ""
    echo "Memory system is working correctly!"
    echo ""
    exit 0
else
    echo -e "${RED}=========================================="
    echo "SOME TESTS FAILED ❌"
    echo "==========================================${NC}"
    echo ""
    echo "Please review the failed tests above."
    echo ""
    exit 1
fi
