# Knowledge System Overview

## Introduction

The AgentDB9 Knowledge System enables agents to ingest, process, and retrieve information from various sources. It provides a comprehensive solution for building agent knowledge bases with support for multiple content types, intelligent chunking, vector embeddings, and semantic search.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Knowledge System                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Document   │  │   Chunking   │  │  Embedding   │      │
│  │   Loaders    │─▶│   Service    │─▶│   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │            Vector Store Service                   │      │
│  │  (PostgreSQL with pgvector / Chroma)             │      │
│  └──────────────────────────────────────────────────┘      │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Knowledge Retrieval & Search              │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Document Loaders

Load content from various sources:

- **Markdown**: Static markdown files or URLs
- **Website**: HTML pages (static or JavaScript-rendered)
- **Documentation**: Multi-page documentation sites with crawling
- **PDF**: PDF documents (planned)
- **API**: JSON/REST API responses
- **GitHub**: GitHub repositories and files

#### Technologies

- **Cheerio**: Fast HTML parsing for static content
- **Puppeteer**: Headless browser for JavaScript-rendered content
- **Sitemap Parser**: XML sitemap discovery and parsing

See: [CHEERIO_IMPLEMENTATION.md](./CHEERIO_IMPLEMENTATION.md), [PUPPETEER_AND_CRAWLING.md](./PUPPETEER_AND_CRAWLING.md)

### 2. Chunking Service

Intelligently splits documents into manageable chunks:

- **Size-based chunking**: Configurable chunk size and overlap
- **Structure preservation**: Respects headings and sections
- **Sentence splitting**: Breaks on sentence boundaries
- **Code block handling**: Keeps code blocks intact
- **Metadata extraction**: Captures context for each chunk

### 3. Embedding Service

Generates vector embeddings for semantic search:

- **Multiple providers**: OpenAI, Cohere, Ollama, HuggingFace
- **Batch processing**: Efficient bulk embedding generation
- **Caching**: Reduces redundant API calls
- **Error handling**: Retry logic and fallbacks

### 4. Vector Store Service

Stores and retrieves document chunks with embeddings:

- **PostgreSQL + pgvector**: Native vector storage
- **Chroma**: Alternative vector database
- **Similarity search**: Cosine similarity, Euclidean distance
- **Metadata filtering**: Filter by tags, types, dates
- **Hybrid search**: Combine vector and keyword search

### 5. Knowledge Service

Orchestrates the entire knowledge pipeline:

- **Source management**: Add, update, delete sources
- **Ingestion**: Process sources into chunks
- **Retrieval**: Semantic search across knowledge base
- **Reindexing**: Update existing sources
- **Statistics**: Track usage and performance

## Supported Source Types

### Markdown

```json
{
  "type": "markdown",
  "content": "# Title\n\nContent here...",
  "metadata": {
    "title": "Document Title",
    "tags": ["tag1", "tag2"]
  }
}
```

### Website (Static)

```json
{
  "type": "website",
  "url": "https://example.com",
  "metadata": {
    "title": "Example Site",
    "tags": ["web"],
    "useJavaScript": false
  }
}
```

### Website (JavaScript-Rendered)

```json
{
  "type": "website",
  "url": "https://app.example.com",
  "metadata": {
    "title": "Web App",
    "tags": ["spa"],
    "useJavaScript": true,
    "waitForSelector": "#content"
  }
}
```

### Documentation (Crawled)

```json
{
  "type": "documentation",
  "url": "https://docs.example.com",
  "metadata": {
    "title": "Documentation",
    "tags": ["docs"],
    "followLinks": true,
    "maxDepth": 2,
    "maxPages": 50
  }
}
```

### API

```json
{
  "type": "api",
  "url": "https://api.example.com/data",
  "metadata": {
    "title": "API Data",
    "tags": ["api"]
  }
}
```

### GitHub

```json
{
  "type": "github",
  "url": "https://github.com/user/repo/blob/main/README.md",
  "metadata": {
    "title": "GitHub README",
    "tags": ["github"]
  }
}
```

## API Endpoints

### Source Management

```bash
# Add source
POST /knowledge/sources/:agentId
{
  "name": "Source Name",
  "type": "website",
  "url": "https://example.com",
  "metadata": { ... }
}

# List sources
GET /knowledge/sources/:agentId

# Update source
PUT /knowledge/sources/:sourceId
{
  "metadata": { ... }
}

# Delete source
DELETE /knowledge/sources/:sourceId
```

### Ingestion

```bash
# Ingest source
POST /knowledge/ingest
{
  "agentId": "agent-id",
  "source": { ... },
  "options": {
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "generateEmbeddings": true
  }
}

# Reindex source
POST /knowledge/sources/:sourceId/reindex

# Reindex all sources for agent
POST /knowledge/agents/:agentId/reindex
```

### Retrieval

```bash
# Retrieve relevant knowledge
POST /knowledge/retrieve
{
  "agentId": "agent-id",
  "query": "search query",
  "topK": 5,
  "filters": {
    "tags": ["tag1"],
    "sourceTypes": ["documentation"]
  }
}

# Get agent knowledge context
GET /knowledge/context/:agentId?query=search&topK=5
```

### Statistics

```bash
# Get knowledge base stats
GET /knowledge/stats/:agentId
```

## Configuration

### Environment Variables

```bash
# Embedding Provider
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://localhost:11434

# Vector Store
VECTOR_STORE_TYPE=chroma
CHROMA_URL=http://localhost:8001

# Chunking
DEFAULT_CHUNK_SIZE=1000
DEFAULT_CHUNK_OVERLAP=200

# Crawling
MAX_CRAWL_DEPTH=3
MAX_CRAWL_PAGES=100
CRAWL_DELAY_MS=500
```

### Agent Configuration

Each agent can have custom knowledge base settings:

```typescript
{
  knowledgeBase: {
    enabled: true,
    embeddingProvider: 'ollama',
    embeddingModel: 'nomic-embed-text',
    vectorStore: 'chroma',
    chunkSize: 1000,
    chunkOverlap: 200,
    retrievalTopK: 5,
    sources: [],
    autoUpdate: false
  }
}
```

## Workflow

### 1. Add Knowledge Source

```bash
curl -X POST http://localhost:8000/knowledge/sources/$AGENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "React Documentation",
    "type": "documentation",
    "url": "https://react.dev/learn",
    "metadata": {
      "title": "React Docs",
      "tags": ["react", "javascript"],
      "preset": "react"
    }
  }'
```

### 2. Process Source

```bash
curl -X POST http://localhost:8000/knowledge/sources/$SOURCE_ID/reindex \
  -H "Authorization: Bearer $TOKEN"
```

This will:
1. Load the document (with Cheerio or Puppeteer)
2. Extract content and structure
3. Chunk the content
4. Generate embeddings
5. Store in vector database

### 3. Query Knowledge Base

```bash
curl -X POST http://localhost:8000/knowledge/retrieve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'$AGENT_ID'",
    "query": "How do I use React hooks?",
    "topK": 5
  }'
```

Returns relevant chunks with similarity scores.

### 4. Use in Conversations

The agent automatically retrieves relevant knowledge during conversations:

```typescript
// Agent receives message
const message = "How do I use useState?";

// Retrieve relevant knowledge
const knowledge = await knowledgeService.retrieve({
  agentId: agent.id,
  query: message,
  topK: 5
});

// Include in context
const context = `
Relevant documentation:
${knowledge.results.map(r => r.chunk.content).join('\n\n')}

User question: ${message}
`;

// Generate response with context
const response = await llm.generate(context);
```

## Performance

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Load static page (Cheerio) | ~100ms | Fast HTML parsing |
| Load JS page (Puppeteer) | ~2-5s | Full browser rendering |
| Chunk document (1000 chars) | ~10ms | Per chunk |
| Generate embedding (OpenAI) | ~100ms | Per batch of 10 |
| Vector search (1000 chunks) | ~50ms | With pgvector |
| Full ingestion (10 pages) | ~30s | Including embeddings |

### Optimization Tips

1. **Use Cheerio when possible**: 20-50x faster than Puppeteer
2. **Batch embeddings**: Process multiple chunks together
3. **Cache embeddings**: Avoid regenerating for unchanged content
4. **Limit crawl depth**: Start with depth 2, increase if needed
5. **Use presets**: Optimized for specific documentation sites
6. **Index strategically**: Not all content needs to be indexed

## Testing

### Unit Tests

```bash
cd backend
npm test -- knowledge
```

### Integration Tests

```bash
# Basic knowledge processing
./tests/knowledge/test-knowledge-processing.sh

# Puppeteer and crawling
./tests/knowledge/test-puppeteer-crawling.sh
```

### Manual Testing

```bash
# Create test agent
AGENT_ID=$(curl -s -X POST http://localhost:8000/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... }' | jq -r '.data.id')

# Add knowledge source
SOURCE_ID=$(curl -s -X POST http://localhost:8000/knowledge/sources/$AGENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... }' | jq -r '.id')

# Process source
curl -X POST http://localhost:8000/knowledge/sources/$SOURCE_ID/reindex \
  -H "Authorization: Bearer $TOKEN"

# Query knowledge
curl -X POST http://localhost:8000/knowledge/retrieve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'$AGENT_ID'",
    "query": "test query",
    "topK": 3
  }'
```

## Troubleshooting

### Common Issues

#### 1. No embeddings generated

**Cause**: Embedding service not configured or unavailable

**Solution**: Check Ollama/OpenAI configuration

```bash
# Test Ollama
curl http://localhost:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "test"}'
```

#### 2. Puppeteer fails to launch

**Cause**: Missing system dependencies

**Solution**: Install Chromium dependencies

```bash
apt-get install -y chromium chromium-sandbox
```

#### 3. Crawl finds no pages

**Cause**: Links don't match base path or sitemap not found

**Solution**: Check logs and adjust filters

```bash
tail -f backend/backend.log | grep "Crawling"
```

#### 4. Low retrieval quality

**Cause**: Poor chunking or embedding quality

**Solution**: Adjust chunk size and overlap

```json
{
  "chunkSize": 500,
  "chunkOverlap": 100
}
```

## Best Practices

### 1. Source Organization

- Use descriptive names and titles
- Tag sources consistently
- Group related sources
- Update metadata regularly

### 2. Chunking Strategy

- **Technical docs**: 500-1000 chars
- **Narrative content**: 1000-2000 chars
- **Code examples**: Keep blocks intact
- **API references**: One endpoint per chunk

### 3. Embedding Quality

- Use appropriate models for content type
- Consider domain-specific embeddings
- Test retrieval quality regularly
- Monitor embedding costs

### 4. Crawling Etiquette

- Respect robots.txt
- Use reasonable delays (500ms+)
- Limit concurrent requests
- Cache aggressively

### 5. Maintenance

- Reindex sources periodically
- Monitor storage usage
- Clean up unused sources
- Update presets as sites change

## Related Documentation

- [Cheerio Implementation](./CHEERIO_IMPLEMENTATION.md)
- [Puppeteer & Crawling](./PUPPETEER_AND_CRAWLING.md)
- [Vector Store Configuration](./VECTOR_STORE.md)
- [Embedding Providers](./EMBEDDING_PROVIDERS.md)

## Conclusion

The Knowledge System provides a powerful foundation for building intelligent agents with access to external knowledge. With support for multiple source types, intelligent processing, and semantic search, agents can effectively leverage documentation, websites, and other content to provide informed responses.

The combination of Cheerio for speed, Puppeteer for JavaScript content, and smart crawling for documentation sites makes it suitable for a wide range of use cases, from simple static pages to complex modern web applications.
