#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000"

echo -e "${BLUE}=========================================="
echo "Test: Puppeteer & Documentation Crawling"
echo -e "==========================================${NC}\n"

# Check prerequisites
echo -e "${CYAN}Checking prerequisites...${NC}\n"

if ! curl -s "${API_URL}/health" > /dev/null; then
    echo -e "${RED}❌ Backend is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend running${NC}"

if ! docker exec agentdb9-postgres-1 pg_isready > /dev/null 2>&1; then
    echo -e "${RED}❌ Database is not accessible${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database accessible${NC}\n"

# Setup: Create test user and agent
echo -e "${BLUE}=== Setup ===${NC}\n"

# Register and login
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-crawl@example.com",
    "username": "testcrawl",
    "password": "TestPassword123!",
    "firstName": "Crawl",
    "lastName": "Test"
  }')

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-crawl@example.com",
    "password": "TestPassword123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .access_token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Failed to get authentication token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"

# Create test agent
AGENT_RESPONSE=$(curl -s -X POST "${API_URL}/api/agents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Crawl Test Agent",
    "description": "Agent for testing documentation crawling",
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
    exit 1
fi

echo -e "${GREEN}✅ Test agent created: $AGENT_ID${NC}\n"

# Test 1: Static Website (Cheerio)
echo -e "${BLUE}=== Test 1: Static Website with Cheerio ===${NC}\n"

STATIC_SOURCE=$(curl -s -X POST "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Example.com",
    "type": "website",
    "url": "https://example.com",
    "metadata": {
      "title": "Example Domain",
      "description": "Static website test",
      "tags": ["test", "static"],
      "useJavaScript": false
    }
  }')

STATIC_ID=$(echo "$STATIC_SOURCE" | jq -r '.id // .sourceId // empty')

if [ -z "$STATIC_ID" ] || [ "$STATIC_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to add static website source${NC}"
    echo "Response: $STATIC_SOURCE"
else
    echo -e "${GREEN}✅ Static website source added: $STATIC_ID${NC}"
    
    # Trigger reindex
    echo "Processing with Cheerio..."
    REINDEX_RESULT=$(curl -s -X POST "${API_URL}/knowledge/sources/${STATIC_ID}/reindex" \
      -H "Authorization: Bearer $TOKEN")
    
    CHUNKS=$(echo "$REINDEX_RESULT" | jq -r '.chunksCreated // 0')
    echo -e "${GREEN}✅ Processed: $CHUNKS chunks created${NC}"
fi

echo ""

# Test 2: JavaScript-Rendered Website (Puppeteer)
echo -e "${BLUE}=== Test 2: JavaScript-Rendered Website with Puppeteer ===${NC}\n"

JS_SOURCE=$(curl -s -X POST "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "React Docs (Sample)",
    "type": "website",
    "url": "https://react.dev",
    "metadata": {
      "title": "React Documentation",
      "description": "JavaScript-rendered site test",
      "tags": ["test", "javascript", "react"],
      "useJavaScript": true,
      "waitForSelector": "main"
    }
  }')

JS_ID=$(echo "$JS_SOURCE" | jq -r '.id // .sourceId // empty')

if [ -z "$JS_ID" ] || [ "$JS_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to add JS website source${NC}"
    echo "Response: $JS_SOURCE"
else
    echo -e "${GREEN}✅ JS website source added: $JS_ID${NC}"
    
    echo -e "${YELLOW}⏳ Processing with Puppeteer (this may take 10-20 seconds)...${NC}"
    REINDEX_RESULT=$(curl -s -X POST "${API_URL}/knowledge/sources/${JS_ID}/reindex" \
      -H "Authorization: Bearer $TOKEN")
    
    CHUNKS=$(echo "$REINDEX_RESULT" | jq -r '.chunksCreated // 0')
    STATUS=$(echo "$REINDEX_RESULT" | jq -r '.status // "unknown"')
    
    if [ "$STATUS" = "success" ]; then
        echo -e "${GREEN}✅ Processed with Puppeteer: $CHUNKS chunks created${NC}"
    else
        echo -e "${YELLOW}⚠️  Processing status: $STATUS${NC}"
        echo "Result: $REINDEX_RESULT"
    fi
fi

echo ""

# Test 3: Documentation Crawling (Single Page)
echo -e "${BLUE}=== Test 3: Documentation Site (Single Page) ===${NC}\n"

DOC_SINGLE=$(curl -s -X POST "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "MDN Single Page",
    "type": "documentation",
    "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "metadata": {
      "title": "MDN JavaScript Docs",
      "description": "Single page documentation test",
      "tags": ["test", "documentation", "mdn"],
      "followLinks": false,
      "useJavaScript": false
    }
  }')

DOC_SINGLE_ID=$(echo "$DOC_SINGLE" | jq -r '.id // .sourceId // empty')

if [ -z "$DOC_SINGLE_ID" ] || [ "$DOC_SINGLE_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to add documentation source${NC}"
else
    echo -e "${GREEN}✅ Documentation source added: $DOC_SINGLE_ID${NC}"
    
    echo "Processing single page..."
    REINDEX_RESULT=$(curl -s -X POST "${API_URL}/knowledge/sources/${DOC_SINGLE_ID}/reindex" \
      -H "Authorization: Bearer $TOKEN")
    
    CHUNKS=$(echo "$REINDEX_RESULT" | jq -r '.chunksCreated // 0')
    echo -e "${GREEN}✅ Processed: $CHUNKS chunks created${NC}"
fi

echo ""

# Test 4: Documentation Crawling (Multiple Pages)
echo -e "${BLUE}=== Test 4: Documentation Crawling (Multiple Pages) ===${NC}\n"

DOC_CRAWL=$(curl -s -X POST "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Example Docs Crawl",
    "type": "documentation",
    "url": "https://example.com",
    "metadata": {
      "title": "Example Documentation",
      "description": "Multi-page crawl test",
      "tags": ["test", "documentation", "crawl"],
      "followLinks": true,
      "maxDepth": 1,
      "maxPages": 5,
      "useJavaScript": false
    }
  }')

DOC_CRAWL_ID=$(echo "$DOC_CRAWL" | jq -r '.id // .sourceId // empty')

if [ -z "$DOC_CRAWL_ID" ] || [ "$DOC_CRAWL_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to add crawl documentation source${NC}"
else
    echo -e "${GREEN}✅ Crawl documentation source added: $DOC_CRAWL_ID${NC}"
    
    echo -e "${YELLOW}⏳ Crawling documentation (this may take 10-30 seconds)...${NC}"
    REINDEX_RESULT=$(curl -s -X POST "${API_URL}/knowledge/sources/${DOC_CRAWL_ID}/reindex" \
      -H "Authorization: Bearer $TOKEN")
    
    CHUNKS=$(echo "$REINDEX_RESULT" | jq -r '.chunksCreated // 0')
    PAGES=$(echo "$REINDEX_RESULT" | jq -r '.pagesProcessed // 0')
    
    echo -e "${GREEN}✅ Crawled $PAGES pages, created $CHUNKS chunks${NC}"
fi

echo ""

# Test 5: List All Sources
echo -e "${BLUE}=== Test 5: List All Knowledge Sources ===${NC}\n"

SOURCES_LIST=$(curl -s -X GET "${API_URL}/knowledge/sources/${AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN")

SOURCE_COUNT=$(echo "$SOURCES_LIST" | jq '. | length')

echo -e "${GREEN}✅ Total sources: $SOURCE_COUNT${NC}\n"

# Display source details
echo "$SOURCES_LIST" | jq -r '.[] | "  - \(.metadata.title // .name): \(.type) (\(.status))"'

echo ""

# Test 6: Knowledge Base Statistics
echo -e "${BLUE}=== Test 6: Knowledge Base Statistics ===${NC}\n"

STATS=$(curl -s -X GET "${API_URL}/knowledge/stats/${AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_SOURCES=$(echo "$STATS" | jq -r '.totalSources // 0')
TOTAL_CHUNKS=$(echo "$STATS" | jq -r '.totalChunks // 0')

echo -e "${GREEN}✅ Statistics:${NC}"
echo "  Total Sources: $TOTAL_SOURCES"
echo "  Total Chunks: $TOTAL_CHUNKS"

echo ""

# Cleanup
echo -e "${BLUE}=== Cleanup ===${NC}\n"

# Delete all sources
if [ ! -z "$STATIC_ID" ] && [ "$STATIC_ID" != "null" ]; then
    curl -s -X DELETE "${API_URL}/knowledge/sources/${STATIC_ID}" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
fi

if [ ! -z "$JS_ID" ] && [ "$JS_ID" != "null" ]; then
    curl -s -X DELETE "${API_URL}/knowledge/sources/${JS_ID}" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
fi

if [ ! -z "$DOC_SINGLE_ID" ] && [ "$DOC_SINGLE_ID" != "null" ]; then
    curl -s -X DELETE "${API_URL}/knowledge/sources/${DOC_SINGLE_ID}" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
fi

if [ ! -z "$DOC_CRAWL_ID" ] && [ "$DOC_CRAWL_ID" != "null" ]; then
    curl -s -X DELETE "${API_URL}/knowledge/sources/${DOC_CRAWL_ID}" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
fi

# Delete agent
curl -s -X DELETE "${API_URL}/api/agents/${AGENT_ID}" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo -e "${GREEN}✅ Cleanup completed${NC}\n"

echo -e "${GREEN}=========================================="
echo "All tests completed!"
echo -e "==========================================${NC}"
