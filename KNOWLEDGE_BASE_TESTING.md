# Knowledge Base Testing - Complete Guide

## Why Knowledge Sources Aren't in Agent Creation

**Design Decision**: Knowledge base setup is intentionally separated from agent creation because:

1. **Complexity**: Requires embedding provider, vector store, and source configuration
2. **Processing Time**: Indexing documents takes time (5-30 seconds per source)
3. **Optional Feature**: Most agents don't need custom knowledge initially
4. **Better UX**: Keeps agent creation simple and fast
5. **Post-Creation Setup**: Knowledge can be added/updated anytime in Settings

**Current Flow**:
```
Create Agent → Configure in Settings → Add Knowledge Sources → Index → Use
```

## Test Suite Overview

### Automated E2E Tests

Location: `backend/test/knowledge-ingestion.e2e-spec.ts`

**What it tests**:
1. ✅ Agent creation with/without knowledge base
2. ✅ Knowledge source ingestion (markdown content)
3. ✅ Indexing completion verification
4. ✅ Query comparison between agents
5. ✅ Retrieval accuracy validation

**Run tests**:
```bash
cd backend
npm run test:knowledge
```

### Manual Testing Scripts

**Quick Setup**:
```bash
# Create two test agents (one with, one without knowledge)
npm run test:create-agents
```

This creates:
- **Agent A**: No knowledge base (baseline)
- **Agent B**: Knowledge base enabled (ready for sources)

## Test Scenarios

### Scenario 1: Custom API Documentation

**Setup**:
1. Create agent with knowledge base enabled
2. Add custom API docs as markdown source
3. Wait for indexing

**Test Query**: "How do I process a payment using the Custom Payment API?"

**Expected Results**:
- **Without Knowledge**: Generic answer or "I don't know about that specific API"
- **With Knowledge**: Specific details from documentation (endpoints, fields, error codes)

### Scenario 2: Project-Specific Code Patterns

**Setup**:
1. Ingest project README and code examples
2. Index codebase documentation

**Test Query**: "What's the standard way to handle authentication in this project?"

**Expected Results**:
- **Without Knowledge**: Generic auth patterns
- **With Knowledge**: Project-specific auth implementation details

### Scenario 3: Internal Documentation

**Setup**:
1. Add company/team documentation
2. Include deployment guides, architecture docs

**Test Query**: "How do I deploy this application to production?"

**Expected Results**:
- **Without Knowledge**: Generic deployment advice
- **With Knowledge**: Specific deployment steps from internal docs

## Running Tests

### Prerequisites

```bash
# Start required services
docker-compose up -d postgres qdrant ollama

# Pull models
docker exec ollama ollama pull qwen2.5-coder:7b
docker exec ollama ollama pull nomic-embed-text
```

### Automated Tests

```bash
cd backend

# Run all knowledge tests
npm run test:knowledge

# Run with verbose output
npm run test:knowledge -- --verbose

# Run specific test
npm run test:knowledge -- -t "should query agent WITH knowledge"
```

### Manual Testing

```bash
# 1. Create test agents
npm run test:create-agents

# 2. Use the UI or API to:
#    - Add knowledge source to agent with knowledge
#    - Create conversations for both agents
#    - Ask the same question to both
#    - Compare responses

# 3. Check knowledge source status
curl http://localhost:3001/api/knowledge/sources/AGENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Test Data

### Sample Knowledge Source (Custom API)

```markdown
# Custom Payment API Documentation

## Authentication
Use Bearer token in Authorization header.

## Endpoints

### POST /api/payments/process
Process a payment transaction.

Required fields:
- customerId: string - Customer identifier
- paymentMethod: string - Payment method ID
- amount: number - Payment amount
- currency: string - Currency code (USD, EUR, etc.)
- metadata: object - Additional transaction data

Response:
{
  "success": true,
  "transactionId": "txn_abc123",
  "status": "completed"
}

## Error Codes
- 4001: Invalid payment method
- 4002: Insufficient funds
- 4003: Payment declined
- 5001: Processing error
```

## Verification Checklist

### Agent Without Knowledge
- [ ] Cannot answer questions about custom API
- [ ] Gives generic responses
- [ ] May say "I don't have information about that"
- [ ] Response time: ~2-3 seconds

### Agent With Knowledge
- [ ] Provides specific details from ingested docs
- [ ] Mentions exact field names, endpoints, error codes
- [ ] Cites or references the documentation
- [ ] Response time: ~3-5 seconds (includes retrieval)

## Performance Metrics

| Metric | Without Knowledge | With Knowledge |
|--------|------------------|----------------|
| Response Time | 2-3s | 3-5s |
| Accuracy (Custom Info) | 0% | 90%+ |
| Accuracy (General Info) | 80%+ | 80%+ |
| Hallucination Risk | Medium | Low |

## Troubleshooting

### Knowledge Not Being Used

**Check**:
1. Knowledge base enabled in agent config
2. Source status is "indexed" (not "pending" or "failed")
3. Query is relevant to ingested content
4. retrievalTopK > 0 in configuration

**Debug**:
```bash
# Check source status
curl http://localhost:3001/api/knowledge/sources/AGENT_ID

# Check Qdrant collections
curl http://localhost:6333/collections

# Check backend logs
docker logs agentdb9-backend | grep knowledge
```

### Indexing Fails

**Common Issues**:
1. Qdrant not running → `docker-compose up -d qdrant`
2. Embedding model not available → `ollama pull nomic-embed-text`
3. Content too large → Reduce chunk size
4. Invalid content format → Check markdown syntax

### Poor Retrieval Quality

**Tuning Parameters**:
- **chunkSize**: 500-2000 (smaller = more precise, larger = more context)
- **chunkOverlap**: 100-300 (higher = better continuity)
- **retrievalTopK**: 3-10 (higher = more context, slower)

## Next Steps

1. **Add More Sources**: PDFs, websites, GitHub repos
2. **Test Different Models**: Compare embedding models
3. **Measure Accuracy**: Track retrieval precision/recall
4. **Optimize Performance**: Tune chunk sizes and top-K
5. **Production Testing**: Test with real user queries

## API Endpoints for Testing

```bash
# Create agent with knowledge
POST /api/agents
{
  "name": "Test Agent",
  "configuration": {
    "knowledgeBase": {
      "enabled": true,
      "embeddingProvider": "ollama",
      "embeddingModel": "nomic-embed-text",
      "vectorStore": "qdrant"
    }
  }
}

# Add knowledge source
POST /api/knowledge/sources/:agentId
{
  "type": "markdown",
  "content": "...",
  "metadata": {
    "title": "API Docs",
    "tags": ["api"]
  }
}

# Check source status
GET /api/knowledge/sources/:agentId

# Query agent
POST /api/conversations/:conversationId/messages
{
  "content": "How do I use the API?"
}
```

## Success Criteria

✅ **Test Passes If**:
1. Agent without knowledge gives generic/no answer
2. Agent with knowledge provides specific details from docs
3. Knowledge source indexes successfully
4. Retrieval happens within 5 seconds
5. Response includes information from ingested content

❌ **Test Fails If**:
1. Both agents give same response
2. Agent with knowledge doesn't use ingested docs
3. Indexing fails or times out
4. Agent hallucinates information not in docs
5. Retrieval takes > 10 seconds
