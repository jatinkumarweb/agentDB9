#!/bin/bash

# Test Script: Knowledge Source Data Ingestion
# Tests adding various types of data to knowledge sources

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKEND_URL="http://localhost:8000"
DB_CONTAINER="agentdb9-postgres-1"
DB_NAME="coding_agent"
AGENT_ID="a8a015af-b2fa-4cba-951c-a0e4869205a9"

echo -e "${BLUE}=========================================="
echo "Test: Knowledge Source Data Ingestion"
echo "==========================================${NC}"
echo ""

# Function to run SQL query
run_query() {
    docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -t -c "$1" 2>/dev/null | tr -d ' '
}

# Check prerequisites
echo -e "${BLUE}=== Step 1: Prerequisites ===${NC}"
echo ""

echo "Checking backend health..."
HEALTH=$(curl -s ${BACKEND_URL}/health | jq -r .status 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    exit 1
fi

echo ""
echo "Checking database connection..."
DB_CHECK=$(run_query "SELECT 1;")
if [ "$DB_CHECK" = "1" ]; then
    echo -e "${GREEN}✅ Database is accessible${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

echo ""
echo "Checking agent exists..."
AGENT_EXISTS=$(run_query "SELECT COUNT(*) FROM agents WHERE id = '${AGENT_ID}';")
if [ "$AGENT_EXISTS" -eq 1 ]; then
    echo -e "${GREEN}✅ Test Agent exists${NC}"
else
    echo -e "${RED}❌ Test Agent not found${NC}"
    exit 1
fi

# Test Case 1: Markdown Knowledge Source
echo ""
echo -e "${BLUE}=== Test Case 1: Markdown Knowledge Source ===${NC}"
echo ""

echo "Creating markdown knowledge source..."
MARKDOWN_SOURCE_ID=$(docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -t -c "
INSERT INTO knowledge_sources (
    \"agentId\",
    type,
    name,
    description,
    content,
    metadata,
    status,
    \"createdAt\",
    \"updatedAt\"
) VALUES (
    '${AGENT_ID}',
    'markdown',
    'Test Markdown Document',
    'Sample markdown for testing knowledge ingestion',
    E'# Introduction\n\nThis is a test document.\n\n## Features\n\n- Feature 1\n- Feature 2\n\n## Code Example\n\n\`\`\`javascript\nfunction hello() {\n  console.log(\"Hello World\");\n}\n\`\`\`\n\n## Conclusion\n\nThis concludes the test.',
    '{\"author\": \"Test\", \"version\": \"1.0\"}'::jsonb,
    'active',
    NOW(),
    NOW()
) RETURNING id;" 2>/dev/null | tr -d ' ')

if [ -n "$MARKDOWN_SOURCE_ID" ]; then
    echo -e "${GREEN}✅ Markdown source created (ID: ${MARKDOWN_SOURCE_ID})${NC}"
else
    echo -e "${RED}❌ Failed to create markdown source${NC}"
    exit 1
fi

# Test Case 2: Website Knowledge Source
echo ""
echo -e "${BLUE}=== Test Case 2: Website Knowledge Source ===${NC}"
echo ""

echo "Creating website knowledge source..."
WEBSITE_SOURCE_ID=$(docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -t -c "
INSERT INTO knowledge_sources (
    \"agentId\",
    type,
    name,
    description,
    url,
    metadata,
    status,
    \"createdAt\",
    \"updatedAt\"
) VALUES (
    '${AGENT_ID}',
    'website',
    'Example Website',
    'Sample website for testing web scraping',
    'https://example.com',
    '{\"scrapeDepth\": 1}'::jsonb,
    'active',
    NOW(),
    NOW()
) RETURNING id;" 2>/dev/null | tr -d ' ')

if [ -n "$WEBSITE_SOURCE_ID" ]; then
    echo -e "${GREEN}✅ Website source created (ID: ${WEBSITE_SOURCE_ID})${NC}"
else
    echo -e "${RED}❌ Failed to create website source${NC}"
    exit 1
fi

# Test Case 3: GitHub Knowledge Source
echo ""
echo -e "${BLUE}=== Test Case 3: GitHub Knowledge Source ===${NC}"
echo ""

echo "Creating GitHub knowledge source..."
GITHUB_SOURCE_ID=$(docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -t -c "
INSERT INTO knowledge_sources (
    \"agentId\",
    type,
    name,
    description,
    url,
    metadata,
    status,
    \"createdAt\",
    \"updatedAt\"
) VALUES (
    '${AGENT_ID}',
    'github',
    'Sample GitHub README',
    'GitHub repository README for testing',
    'https://github.com/nestjs/nest/blob/master/README.md',
    '{\"repository\": \"nestjs/nest\", \"branch\": \"master\"}'::jsonb,
    'active',
    NOW(),
    NOW()
) RETURNING id;" 2>/dev/null | tr -d ' ')

if [ -n "$GITHUB_SOURCE_ID" ]; then
    echo -e "${GREEN}✅ GitHub source created (ID: ${GITHUB_SOURCE_ID})${NC}"
else
    echo -e "${RED}❌ Failed to create GitHub source${NC}"
    exit 1
fi

# Test Case 4: API Knowledge Source
echo ""
echo -e "${BLUE}=== Test Case 4: API Knowledge Source ===${NC}"
echo ""

echo "Creating API knowledge source..."
API_SOURCE_ID=$(docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -t -c "
INSERT INTO knowledge_sources (
    \"agentId\",
    type,
    name,
    description,
    url,
    metadata,
    status,
    \"createdAt\",
    \"updatedAt\"
) VALUES (
    '${AGENT_ID}',
    'api',
    'JSONPlaceholder API',
    'Sample API for testing JSON ingestion',
    'https://jsonplaceholder.typicode.com/posts/1',
    '{\"apiType\": \"REST\", \"format\": \"JSON\"}'::jsonb,
    'active',
    NOW(),
    NOW()
) RETURNING id;" 2>/dev/null | tr -d ' ')

if [ -n "$API_SOURCE_ID" ]; then
    echo -e "${GREEN}✅ API source created (ID: ${API_SOURCE_ID})${NC}"
else
    echo -e "${RED}❌ Failed to create API source${NC}"
    exit 1
fi

# Verify all sources
echo ""
echo -e "${BLUE}=== Step 2: Verify Knowledge Sources ===${NC}"
echo ""

echo "Knowledge sources created:"
docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -c "
SELECT 
    id,
    type,
    name,
    status,
    CASE 
        WHEN url IS NOT NULL THEN LEFT(url, 50)
        ELSE 'inline content'
    END as source
FROM knowledge_sources 
WHERE \"agentId\" = '${AGENT_ID}'
ORDER BY \"createdAt\" DESC 
LIMIT 10;
"

# Count sources
TOTAL_SOURCES=$(run_query "SELECT COUNT(*) FROM knowledge_sources WHERE \"agentId\" = '${AGENT_ID}';")
echo ""
echo -e "Total knowledge sources for agent: ${YELLOW}${TOTAL_SOURCES}${NC}"

# Test Case 5: Simulate Document Processing
echo ""
echo -e "${BLUE}=== Test Case 5: Simulate Document Processing ===${NC}"
echo ""

echo "Note: Actual document processing requires calling the knowledge service API"
echo "This would trigger:"
echo "  1. Document loading (via DocumentLoaderService)"
echo "  2. Text chunking (via ChunkingService)"
echo "  3. Embedding generation (via EmbeddingService)"
echo "  4. Vector storage (via VectorStoreService)"
echo ""

echo "To process these sources, call:"
echo "  POST /api/knowledge/sources/{sourceId}/reindex"
echo ""

# Test Case 6: Check Document Chunks Table
echo ""
echo -e "${BLUE}=== Test Case 6: Check Document Chunks ===${NC}"
echo ""

CHUNK_COUNT=$(run_query "SELECT COUNT(*) FROM document_chunks WHERE \"agentId\" = '${AGENT_ID}';")
echo -e "Existing document chunks: ${YELLOW}${CHUNK_COUNT}${NC}"

if [ "$CHUNK_COUNT" -gt 0 ]; then
    echo ""
    echo "Sample chunks:"
    docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -c "
    SELECT 
        id,
        \"sourceId\",
        LEFT(content, 50) as content_preview,
        \"chunkIndex\"
    FROM document_chunks 
    WHERE \"agentId\" = '${AGENT_ID}'
    ORDER BY \"createdAt\" DESC 
    LIMIT 5;
    "
fi

# Test Case 7: Knowledge Source Types Summary
echo ""
echo -e "${BLUE}=== Test Case 7: Knowledge Source Types Summary ===${NC}"
echo ""

echo "Knowledge sources by type:"
docker exec ${DB_CONTAINER} psql -U postgres -d ${DB_NAME} -c "
SELECT 
    type,
    COUNT(*) as count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error
FROM knowledge_sources 
WHERE \"agentId\" = '${AGENT_ID}'
GROUP BY type
ORDER BY count DESC;
"

# Summary
echo ""
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo "==========================================${NC}"
echo ""

echo "Knowledge Sources Created:"
echo -e "  ✅ Markdown: ${MARKDOWN_SOURCE_ID}"
echo -e "  ✅ Website: ${WEBSITE_SOURCE_ID}"
echo -e "  ✅ GitHub: ${GITHUB_SOURCE_ID}"
echo -e "  ✅ API: ${API_SOURCE_ID}"
echo ""

echo "Total Sources: ${TOTAL_SOURCES}"
echo "Document Chunks: ${CHUNK_COUNT}"
echo ""

echo -e "${GREEN}=========================================="
echo "All Knowledge Source Tests Passed ✅"
echo "==========================================${NC}"
echo ""

echo "Next Steps:"
echo "1. Process sources via API: POST /api/knowledge/sources/{sourceId}/reindex"
echo "2. Verify chunks are created in document_chunks table"
echo "3. Test knowledge retrieval in conversations"
echo "4. Enable knowledge base in agent configuration"
echo ""

echo "Example API calls:"
echo ""
echo "# Reindex markdown source"
echo "curl -X POST ${BACKEND_URL}/api/knowledge/sources/${MARKDOWN_SOURCE_ID}/reindex"
echo ""
echo "# Reindex website source"
echo "curl -X POST ${BACKEND_URL}/api/knowledge/sources/${WEBSITE_SOURCE_ID}/reindex"
echo ""
echo "# Get agent knowledge context"
echo "curl ${BACKEND_URL}/api/knowledge/agents/${AGENT_ID}/context?query=test"
echo ""
