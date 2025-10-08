#!/bin/bash

# Rate Limiting Test Script
# Tests the rate limiting functionality on auth endpoints

echo "🔒 Testing Rate Limiting Implementation"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="${BACKEND_URL:-http://localhost:9000}"

echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Login Rate Limiting (10 requests per minute)
echo "Test 1: Login Rate Limiting (10 requests/minute)"
echo "-------------------------------------------------"

SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

for i in {1..12}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    echo -e "${YELLOW}Request $i: Rate limited (429)${NC}"
  elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}Request $i: Allowed ($HTTP_CODE)${NC}"
  else
    echo -e "${RED}Request $i: Unexpected response ($HTTP_CODE)${NC}"
  fi
  
  # Small delay to avoid overwhelming the server
  sleep 0.1
done

echo ""
echo "Results:"
echo "  Allowed requests: $SUCCESS_COUNT"
echo "  Rate limited requests: $RATE_LIMITED_COUNT"

if [ $RATE_LIMITED_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Rate limiting is working!${NC}"
else
  echo -e "${RED}❌ Rate limiting may not be working${NC}"
fi

echo ""
echo "Test 2: Register Rate Limiting (5 requests/minute)"
echo "---------------------------------------------------"

SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

for i in {1..7}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"testuser$i\",\"email\":\"test$i@example.com\",\"password\":\"password123\"}" 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    echo -e "${YELLOW}Request $i: Rate limited (429)${NC}"
  elif [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}Request $i: Allowed ($HTTP_CODE)${NC}"
  else
    echo -e "${RED}Request $i: Unexpected response ($HTTP_CODE)${NC}"
  fi
  
  sleep 0.1
done

echo ""
echo "Results:"
echo "  Allowed requests: $SUCCESS_COUNT"
echo "  Rate limited requests: $RATE_LIMITED_COUNT"

if [ $RATE_LIMITED_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Rate limiting is working!${NC}"
else
  echo -e "${RED}❌ Rate limiting may not be working${NC}"
fi

echo ""
echo "========================================"
echo "Rate Limiting Test Complete"
echo "========================================"
