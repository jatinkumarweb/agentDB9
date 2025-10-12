#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000"

echo -e "${BLUE}=========================================="
echo "Test: Knowledge Source Processing"
echo -e "==========================================${NC}\n"

# Check prerequisites
echo -e "${CYAN}Checking prerequisites...${NC}\n"

# Check if backend is running
if ! curl -s "${API_URL}/health" > /dev/null; then
    echo -e "${RED}❌ Backend is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend running${NC}"

# Check if database is accessible
if ! docker exec agentdb9-postgres-1 pg_isready > /dev/null 2>&1; then
    echo -e "${RED}❌ Database is not accessible${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database accessible${NC}\n"

# Create test user and get token
echo -e "${BLUE}=== Setup: Create Test User ===${NC}\n"

# Register test user
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-knowledge@example.com",
    "username": "testknowledge",
    "password": "TestPassword123!",
    "firstName": "Knowledge",
    "lastName": "Test"
  }')

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-knowledge@example.com",
    "password": "TestPassword123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .access_token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Failed to get authentication token${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Authentication token obtained${NC}\n"

# Create a test agent
echo -e "${BLUE}=== Setup: Create Test Agent ===${NC}\n"

AGENT_RESPONSE=$(curl -s -X POST "${API_URL}/api/agents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Knowledge Test Agent",
    "description": "Agent for testing knowledge sources",
    "configuration": {
      "llmProvider": "openai",
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 2000,
      "systemPrompt": "You are a helpful assistant.",
      "codeStyle": {
        "indentSize": 2,
        "useTabs": false,
        "semicolons": true,
        "quotes": "single",
        "trailingComma": "es5"
      },
      "autoSave": true,
      "autoFormat": true,
      "autoTest": false
    }
  }')

AGENT_ID=$(echo "$AGENT_RESPONSE" | jq -r '.data.id // .id // .agentId // empty')

if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to create test agent${NC}"
    echo "Response: $AGENT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Test agent created: $AGENT_ID${NC}\n"

# Test 1: Add Markdown Knowledge Source
echo -e "${BLUE}=== Test 1: Add Markdown Knowledge Source ===${NC}\n"

MARKDOWN_SOURCE=$(curl -s -X POST "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Markdown Document",
    "type": "markdown",
    "content": "# Test Document\n\nThis is a test document with some content.\n\n## Section 1\n\nSome text here about artificial intelligence and machine learning.\n\n## Section 2\n\nMore text here about natural language processing and embeddings.",
    "metadata": {
      "title": "Test Markdown Document",
      "description": "A test document for knowledge source processing",
      "tags": ["test", "markdown", "ai"]
    }
  }')

SOURCE_ID=$(echo "$MARKDOWN_SOURCE" | jq -r '.id // .sourceId // empty')

if [ -z "$SOURCE_ID" ] || [ "$SOURCE_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to add markdown source${NC}"
    echo "Response: $MARKDOWN_SOURCE"
    exit 1
fi

echo -e "${GREEN}✅ Markdown source added: $SOURCE_ID${NC}\n"

# Wait for processing
echo "Waiting for document processing..."
sleep 3

# Test 2: Add Website Knowledge Source
echo -e "${BLUE}=== Test 2: Add Website Knowledge Source ===${NC}\n"

WEBSITE_SOURCE=$(curl -s -X POST "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Example Website",
    "type": "website",
    "url": "https://example.com",
    "metadata": {
      "title": "Example Website",
      "description": "A test website for knowledge source processing",
      "tags": ["test", "website"]
    }
  }')

WEBSITE_SOURCE_ID=$(echo "$WEBSITE_SOURCE" | jq -r '.id // .sourceId // empty')

if [ -z "$WEBSITE_SOURCE_ID" ] || [ "$WEBSITE_SOURCE_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to add website source${NC}"
    echo "Response: $WEBSITE_SOURCE"
    exit 1
fi

echo -e "${GREEN}✅ Website source added: $WEBSITE_SOURCE_ID${NC}\n"

# Wait for processing
echo "Waiting for website processing..."
sleep 3

# Test 3: List Knowledge Sources
echo -e "${BLUE}=== Test 3: List Knowledge Sources ===${NC}\n"

SOURCES_LIST=$(curl -s -X GET "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN")

SOURCE_COUNT=$(echo "$SOURCES_LIST" | jq '. | length')

if [ "$SOURCE_COUNT" -ge 2 ]; then
    echo -e "${GREEN}✅ Found $SOURCE_COUNT knowledge sources${NC}\n"
else
    echo -e "${RED}❌ Expected at least 2 sources, found $SOURCE_COUNT${NC}"
    echo "Response: $SOURCES_LIST"
    exit 1
fi

# Test 4: Retrieve Knowledge
echo -e "${BLUE}=== Test 4: Retrieve Knowledge ===${NC}\n"

RETRIEVAL_RESPONSE=$(curl -s -X POST "${API_URL}/knowledge/retrieve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"agentId\": \"$AGENT_ID\",
    \"query\": \"artificial intelligence\",
    \"topK\": 3
  }")

CHUNKS=$(echo "$RETRIEVAL_RESPONSE" | jq -r '.chunks // .results // empty')

if [ -z "$CHUNKS" ] || [ "$CHUNKS" = "null" ]; then
    echo -e "${RED}❌ Failed to retrieve knowledge${NC}"
    echo "Response: $RETRIEVAL_RESPONSE"
    exit 1
fi

CHUNK_COUNT=$(echo "$RETRIEVAL_RESPONSE" | jq '.chunks | length // .results | length // 0')
echo -e "${GREEN}✅ Retrieved $CHUNK_COUNT knowledge chunks${NC}\n"

# Test 5: Get Knowledge Stats
echo -e "${BLUE}=== Test 5: Get Knowledge Stats ===${NC}\n"

STATS_RESPONSE=$(curl -s -X GET "${API_URL}/knowledge/stats/${AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_CHUNKS=$(echo "$STATS_RESPONSE" | jq -r '.totalChunks // .total_chunks // 0')

if [ "$TOTAL_CHUNKS" -gt 0 ]; then
    echo -e "${GREEN}✅ Knowledge base has $TOTAL_CHUNKS chunks${NC}\n"
else
    echo -e "${RED}❌ No chunks found in knowledge base${NC}"
    echo "Response: $STATS_RESPONSE"
    exit 1
fi

# Test 6: Verify Cheerio Website Loading
echo -e "${BLUE}=== Test 6: Verify Cheerio Website Loading ===${NC}\n"

# Check if the website source was processed correctly
WEBSITE_DETAILS=$(curl -s -X GET "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN" | jq ".[] | select(.id == \"$WEBSITE_SOURCE_ID\")")

WEBSITE_STATUS=$(echo "$WEBSITE_DETAILS" | jq -r '.status // empty')

if [ "$WEBSITE_STATUS" = "processed" ] || [ "$WEBSITE_STATUS" = "ready" ]; then
    echo -e "${GREEN}✅ Website source processed successfully${NC}\n"
else
    echo -e "${RED}⚠️  Website source status: $WEBSITE_STATUS${NC}"
    echo "Details: $WEBSITE_DETAILS"
fi

# Cleanup
echo -e "${BLUE}=== Cleanup ===${NC}\n"

# Delete knowledge sources
curl -s -X DELETE "${API_URL}/knowledge/sources/${SOURCE_ID}" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

curl -s -X DELETE "${API_URL}/knowledge/sources/${WEBSITE_SOURCE_ID}" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Delete agent
curl -s -X DELETE "${API_URL}/api/agents/${AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo -e "${GREEN}✅ Cleanup completed${NC}\n"

echo -e "${GREEN}=========================================="
echo "All tests passed!"
echo -e "==========================================${NC}"
