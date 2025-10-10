#!/bin/bash

# Test Agent Chat with External API
set -e

echo "🧪 Testing Agent Chat with External API"
echo "========================================"

# Configuration
BACKEND_URL="http://localhost:8000"
LLM_SERVICE_URL="http://localhost:9000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n1️⃣ Login or Signup"
echo "------------------"

# Try to login first
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token // .access_token // empty')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id // .user.id // empty')

# If login failed, try to signup
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Login failed, trying to signup..."
  
  SIGNUP_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"password123"}')
  
  TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.access_token // .access_token // empty')
  USER_ID=$(echo $SIGNUP_RESPONSE | jq -r '.data.user.id // .user.id // empty')
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}✗ Login and signup both failed${NC}"
    echo "Login response: $LOGIN_RESPONSE"
    echo "Signup response: $SIGNUP_RESPONSE"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Signed up and logged in${NC}"
else
  echo -e "${GREEN}✓ Logged in${NC}"
fi

echo "User ID: $USER_ID"

echo -e "\n2️⃣ Configure OpenAI API Key"
echo "----------------------------"
read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY

if [ -n "$OPENAI_KEY" ]; then
  CONFIG_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/providers/config" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"provider\":\"openai\",\"apiKey\":\"${OPENAI_KEY}\"}")
  
  if echo "$CONFIG_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API key configured${NC}"
  else
    echo -e "${RED}✗ Failed to configure API key${NC}"
    echo "Response: $CONFIG_RESPONSE"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠ Skipped API key configuration${NC}"
fi

echo -e "\n3️⃣ Get or Create Agent"
echo "----------------------"
AGENTS_RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${BACKEND_URL}/api/agents")
AGENT_ID=$(echo $AGENTS_RESPONSE | jq -r '.data[0].id // empty')

if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "null" ]; then
  echo "Creating new agent..."
  CREATE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/agents" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Agent",
      "description": "Test agent for external API",
      "configuration": {
        "model": "gpt-4o",
        "temperature": 0.7
      }
    }')
  
  AGENT_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id // empty')
  
  if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "null" ]; then
    echo -e "${RED}✗ Failed to create agent${NC}"
    echo "Response: $CREATE_RESPONSE"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Agent created${NC}"
else
  echo -e "${GREEN}✓ Using existing agent${NC}"
fi

echo "Agent ID: $AGENT_ID"

echo -e "\n4️⃣ Test Direct LLM Service Call"
echo "--------------------------------"
echo "Testing: ${LLM_SERVICE_URL}/api/chat?userId=${USER_ID}"

LLM_RESPONSE=$(curl -s -X POST "${LLM_SERVICE_URL}/api/chat?userId=${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Say hello"}
    ],
    "temperature": 0.7,
    "max_tokens": 50
  }')

echo "Response:"
echo "$LLM_RESPONSE" | jq '.'

if echo "$LLM_RESPONSE" | jq -e '.response' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ LLM service responded${NC}"
else
  echo -e "${RED}✗ LLM service error${NC}"
  if echo "$LLM_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR=$(echo "$LLM_RESPONSE" | jq -r '.error')
    MESSAGE=$(echo "$LLM_RESPONSE" | jq -r '.message // empty')
    echo "Error: $ERROR"
    [ -n "$MESSAGE" ] && echo "Message: $MESSAGE"
  fi
fi

echo -e "\n5️⃣ Test Agent Chat"
echo "------------------"
CHAT_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/agents/${AGENT_ID}/chat" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, are you there?",
    "context": {}
  }')

echo "Response:"
echo "$CHAT_RESPONSE" | jq '.'

if echo "$CHAT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  RESPONSE_TEXT=$(echo "$CHAT_RESPONSE" | jq -r '.data.response')
  echo -e "\n${GREEN}✓ Agent responded:${NC}"
  echo "$RESPONSE_TEXT"
else
  echo -e "${RED}✗ Agent chat failed${NC}"
  ERROR=$(echo "$CHAT_RESPONSE" | jq -r '.error // empty')
  [ -n "$ERROR" ] && echo "Error: $ERROR"
fi

echo -e "\n6️⃣ Check Backend Logs"
echo "---------------------"
echo "Recent backend logs:"
docker-compose logs backend 2>&1 | grep -E "AgentsService|LLM" | tail -10

echo -e "\n7️⃣ Check LLM Service Logs"
echo "-------------------------"
echo "Recent LLM service logs:"
docker-compose logs llm-service 2>&1 | grep -E "chat|userId|API" | tail -10

echo -e "\n✅ Test complete"
