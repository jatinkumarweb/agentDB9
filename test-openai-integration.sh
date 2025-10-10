#!/bin/bash

# Test script for OpenAI integration flow
# This script tests the complete flow from API key configuration to model availability

set -e

echo "=== OpenAI Integration Test ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8000"
LLM_SERVICE_URL="http://localhost:9000"
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="password123"
TEST_OPENAI_KEY="sk-test-key-for-testing"

echo "Step 1: Login to get auth token"
echo "--------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token // .access_token // empty')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id // .user.id // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}✗ Failed to login${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "User ID: $USER_ID"
echo ""

echo "Step 2: Configure OpenAI API key"
echo "--------------------------------"
CONFIG_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/providers/config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"provider\":\"openai\",\"apiKey\":\"${TEST_OPENAI_KEY}\"}")

CONFIG_SUCCESS=$(echo $CONFIG_RESPONSE | jq -r '.success')

if [ "$CONFIG_SUCCESS" != "true" ]; then
  echo -e "${RED}✗ Failed to configure API key${NC}"
  echo "Response: $CONFIG_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ API key configured successfully${NC}"
echo ""

echo "Step 3: Check provider status (Backend)"
echo "---------------------------------------"
STATUS_RESPONSE=$(curl -s "${BACKEND_URL}/api/providers/status?userId=${USER_ID}")

echo "Response: $STATUS_RESPONSE"
OPENAI_CONFIGURED=$(echo $STATUS_RESPONSE | jq -r '.data.openai')

if [ "$OPENAI_CONFIGURED" = "true" ]; then
  echo -e "${GREEN}✓ Backend reports OpenAI as configured${NC}"
else
  echo -e "${RED}✗ Backend reports OpenAI as NOT configured${NC}"
  exit 1
fi
echo ""

echo "Step 4: Check models API (via Backend)"
echo "--------------------------------------"
MODELS_RESPONSE=$(curl -s "${BACKEND_URL}/api/models" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Checking OpenAI models in response..."
GPT4_STATUS=$(echo $MODELS_RESPONSE | jq -r '.data.models[] | select(.id=="gpt-4o") | .status')
GPT4_API_KEY_CONFIGURED=$(echo $MODELS_RESPONSE | jq -r '.data.models[] | select(.id=="gpt-4o") | .apiKeyConfigured')

echo "GPT-4o Status: $GPT4_STATUS"
echo "GPT-4o API Key Configured: $GPT4_API_KEY_CONFIGURED"

if [ "$GPT4_API_KEY_CONFIGURED" = "true" ]; then
  echo -e "${GREEN}✓ Models API correctly shows OpenAI API key as configured${NC}"
else
  echo -e "${RED}✗ Models API shows OpenAI API key as NOT configured${NC}"
  echo "Full response:"
  echo $MODELS_RESPONSE | jq '.data.models[] | select(.provider=="openai") | {id, status, apiKeyConfigured}'
  exit 1
fi
echo ""

echo "Step 5: Direct LLM Service check"
echo "--------------------------------"
LLM_MODELS_RESPONSE=$(curl -s "${LLM_SERVICE_URL}/api/models?userId=${USER_ID}")

echo "Checking OpenAI models in LLM service response..."
LLM_GPT4_API_KEY_CONFIGURED=$(echo $LLM_MODELS_RESPONSE | jq -r '.data.models[] | select(.id=="gpt-4o") | .apiKeyConfigured')

echo "LLM Service - GPT-4o API Key Configured: $LLM_GPT4_API_KEY_CONFIGURED"

if [ "$LLM_GPT4_API_KEY_CONFIGURED" = "true" ]; then
  echo -e "${GREEN}✓ LLM Service correctly shows OpenAI API key as configured${NC}"
else
  echo -e "${RED}✗ LLM Service shows OpenAI API key as NOT configured${NC}"
  echo "Full response:"
  echo $LLM_MODELS_RESPONSE | jq '.data.models[] | select(.provider=="openai") | {id, status, apiKeyConfigured}'
  exit 1
fi
echo ""

echo -e "${GREEN}=== All tests passed! ===${NC}"
echo ""
echo "Summary:"
echo "1. ✓ Login successful"
echo "2. ✓ API key saved to database"
echo "3. ✓ Backend provider status endpoint works"
echo "4. ✓ Backend models API shows correct status"
echo "5. ✓ LLM service receives and uses provider status"
