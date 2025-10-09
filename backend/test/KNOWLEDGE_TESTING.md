# Knowledge Ingestion Testing Guide

## Overview

This test suite validates the knowledge base functionality by comparing agents with and without knowledge ingestion capabilities.

## Test Scenarios

### 1. Agent Creation
- **Without Knowledge**: Agent relies only on LLM training data
- **With Knowledge**: Agent has access to custom documentation

### 2. Knowledge Source Ingestion
- Add custom API documentation as markdown
- Wait for indexing to complete
- Verify source status

### 3. Query Comparison
Tests the same questions against both agents to demonstrate the difference:

#### Test Query 1: API Usage
**Question**: "How do I process a payment using the Custom Payment API? What are the required fields?"

**Expected Results**:
- **Without Knowledge**: Generic answer or "I don't know"
- **With Knowledge**: Specific details about `customerId`, `paymentMethod`, `metadata` fields

#### Test Query 2: Error Codes
**Question**: "What does error code 4002 mean in the payment API?"

**Expected Results**:
- **Without Knowledge**: Cannot answer or gives generic response
- **With Knowledge**: "Insufficient funds" (from ingested documentation)

### 4. Retrieval Verification
- Confirms knowledge source is indexed
- Verifies chunk count and metadata

## Running the Tests

### Prerequisites

1. **Database**: PostgreSQL running and accessible
2. **Vector Store**: Qdrant running (for knowledge storage)
3. **Embedding Model**: Ollama with `nomic-embed-text` model
4. **LLM Model**: Ollama with `qwen2.5-coder:7b` model

### Setup

```bash
# Install dependencies
cd backend
npm install

# Start required services
docker-compose up -d postgres qdrant ollama

# Pull required models
docker exec ollama ollama pull qwen2.5-coder:7b
docker exec ollama ollama pull nomic-embed-text
```

### Run Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run only knowledge ingestion tests
npm run test:e2e -- knowledge-ingestion.e2e-spec.ts

# Run with verbose output
npm run test:e2e -- knowledge-ingestion.e2e-spec.ts --verbose
```

### Expected Output

```
Knowledge Ingestion (e2e)
  Agent Creation
    ✓ should create agent WITHOUT knowledge base (150ms)
    ✓ should create agent WITH knowledge base (145ms)
  
  Knowledge Source Ingestion
    ✓ should add custom API documentation as knowledge source (200ms)
    ✓ should wait for knowledge source to be indexed (5000ms)
  
  Query Comparison: With vs Without Knowledge
    ✓ should query agent WITHOUT knowledge about custom API (5500ms)
    ✓ should query agent WITH knowledge about custom API (5500ms)
    ✓ should query about error codes - agent WITHOUT knowledge (5500ms)
    ✓ should query about error codes - agent WITH knowledge (5500ms)
  
  Knowledge Retrieval Verification
    ✓ should verify knowledge source is being retrieved (100ms)
  
  Cleanup
    ✓ should delete test agents (200ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Time:        ~30s
```

## Manual Testing

If you prefer to test manually:

### 1. Create Two Agents

**Agent A (No Knowledge)**:
```bash
curl -X POST http://localhost:3001/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent Without Knowledge",
    "configuration": {
      "llmProvider": "ollama",
      "model": "qwen2.5-coder:7b",
      "knowledgeBase": {
        "enabled": false
      }
    }
  }'
```

**Agent B (With Knowledge)**:
```bash
curl -X POST http://localhost:3001/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent With Knowledge",
    "configuration": {
      "llmProvider": "ollama",
      "model": "qwen2.5-coder:7b",
      "knowledgeBase": {
        "enabled": true,
        "embeddingProvider": "ollama",
        "embeddingModel": "nomic-embed-text",
        "vectorStore": "qdrant"
      }
    }
  }'
```

### 2. Add Knowledge Source to Agent B

```bash
curl -X POST http://localhost:3001/api/knowledge/sources/AGENT_B_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "markdown",
    "content": "# Custom Payment API\n\n## POST /api/payments/process\n\nRequired fields:\n- customerId: string\n- paymentMethod: string\n- amount: number\n- metadata: object\n\n## Error Codes\n- 4002: Insufficient funds",
    "metadata": {
      "title": "Payment API Docs",
      "tags": ["api", "payments"]
    }
  }'
```

### 3. Wait for Indexing

Check status:
```bash
curl http://localhost:3001/api/knowledge/sources/AGENT_B_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Wait until `status: "indexed"`

### 4. Test Both Agents

Ask the same question to both agents:

**Question**: "How do I process a payment using the Custom Payment API?"

**Agent A Response** (No Knowledge):
> "I don't have specific information about a Custom Payment API. Generally, payment APIs require..."

**Agent B Response** (With Knowledge):
> "To process a payment using the Custom Payment API, you need to make a POST request to /api/payments/process with the following required fields: customerId (string), paymentMethod (string), amount (number), and metadata (object)..."

## Troubleshooting

### Knowledge Source Not Indexing

1. Check Qdrant is running:
   ```bash
   curl http://localhost:6333/health
   ```

2. Check embedding model is available:
   ```bash
   docker exec ollama ollama list | grep nomic-embed-text
   ```

3. Check backend logs for indexing errors:
   ```bash
   docker logs agentdb9-backend | grep knowledge
   ```

### Agent Not Using Knowledge

1. Verify knowledge base is enabled in agent configuration
2. Check knowledge source status is "indexed"
3. Verify retrievalTopK > 0 in configuration
4. Check if query is relevant to ingested content

## Performance Considerations

- **Indexing Time**: ~5-10 seconds for small documents
- **Query Time**: +200-500ms overhead for knowledge retrieval
- **Chunk Size**: Larger chunks = fewer retrievals but less precise
- **Top K**: Higher values = more context but slower responses

## Next Steps

1. Add more knowledge sources (PDFs, websites, GitHub repos)
2. Test with different embedding models
3. Compare vector stores (Qdrant vs Chroma vs Pinecone)
4. Measure retrieval accuracy with different chunk sizes
5. Test knowledge update/refresh functionality
