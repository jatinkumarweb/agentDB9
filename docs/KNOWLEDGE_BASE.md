# Knowledge Base Integration

The Knowledge Base system allows agents to ingest, store, and retrieve contextual information from various sources to enhance their responses with domain-specific knowledge.

## Features

- **Multiple Document Types**: Support for PDF, Markdown, websites, APIs, GitHub repositories, and documentation sites
- **Vector Embeddings**: Integration with OpenAI, Cohere, HuggingFace, and Ollama embedding providers
- **Intelligent Chunking**: Structure-aware document chunking with configurable size and overlap
- **Semantic Search**: Vector similarity search with cosine similarity scoring
- **Automatic Ingestion**: Sources are automatically ingested during agent creation
- **Reindexing**: Support for reindexing sources when configuration changes

## Architecture

```
┌─────────────────┐
│  Agent Config   │
│  (with KB)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Knowledge       │
│ Service         │
└────────┬────────┘
         │
    ┌────┴────┬────────┬──────────┐
    ▼         ▼        ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐
│Document│ │Chunk │ │Embed   │ │Vector  │
│Loader  │ │ing   │ │ding    │ │Store   │
└────────┘ └──────┘ └────────┘ └────────┘
```

## Configuration

### Agent Configuration with Knowledge Base

```typescript
const agentConfig: AgentConfiguration = {
  llmProvider: 'ollama',
  model: 'codellama:7b',
  temperature: 0.7,
  maxTokens: 2000,
  // ... other config
  knowledgeBase: {
    enabled: true,
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    vectorStore: 'chroma',
    chunkSize: 1000,
    chunkOverlap: 200,
    retrievalTopK: 5,
    autoUpdate: true,
    updateFrequency: 'daily',
    sources: [
      {
        id: 'docs-1',
        type: 'markdown',
        content: '# API Documentation\n\n...',
        metadata: {
          title: 'API Documentation',
          description: 'Internal API docs',
          tags: ['api', 'docs'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        status: 'pending',
      },
      {
        id: 'website-1',
        type: 'website',
        url: 'https://docs.example.com',
        metadata: {
          title: 'External Documentation',
          tags: ['external', 'docs'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        status: 'pending',
      },
    ],
  },
};
```

### Embedding Providers

#### OpenAI
```typescript
{
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-3-small', // or 'text-embedding-3-large'
}
```

#### Cohere
```typescript
{
  embeddingProvider: 'cohere',
  embeddingModel: 'embed-english-v3.0', // or 'embed-multilingual-v3.0'
}
```

#### HuggingFace
```typescript
{
  embeddingProvider: 'huggingface',
  embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
}
```

#### Ollama
```typescript
{
  embeddingProvider: 'ollama',
  embeddingModel: 'nomic-embed-text',
}
```

## Usage

### Creating an Agent with Knowledge Base

```typescript
import { AgentsService } from './agents/agents.service';

const agentsService = // ... inject service

const agent = await agentsService.create({
  name: 'Documentation Assistant',
  description: 'Helps with API documentation questions',
  configuration: {
    // ... LLM config
    knowledgeBase: {
      enabled: true,
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      vectorStore: 'chroma',
      chunkSize: 1000,
      chunkOverlap: 200,
      retrievalTopK: 5,
      sources: [
        {
          id: 'api-docs',
          type: 'markdown',
          content: apiDocsContent,
          metadata: {
            title: 'API Documentation',
            tags: ['api'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending',
        },
      ],
    },
  },
}, userId);

// Sources are automatically ingested during creation
```

### Adding Knowledge Sources

```typescript
import { KnowledgeService } from './knowledge/knowledge.service';

const knowledgeService = // ... inject service

// Add a new source
await knowledgeService.addSource(agentId, {
  id: 'new-source',
  type: 'website',
  url: 'https://example.com/docs',
  metadata: {
    title: 'Example Docs',
    tags: ['docs'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  status: 'pending',
});

// Ingest the source
await knowledgeService.ingestSource({
  agentId,
  source: {
    id: 'new-source',
    type: 'website',
    url: 'https://example.com/docs',
    metadata: {
      title: 'Example Docs',
      tags: ['docs'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    status: 'pending',
  },
  options: {
    chunkSize: 1000,
    chunkOverlap: 200,
    extractMetadata: true,
    generateEmbeddings: true,
  },
});
```

### Retrieving Knowledge

```typescript
// Retrieve relevant chunks for a query
const result = await knowledgeService.retrieve({
  agentId,
  query: 'How do I authenticate with the API?',
  topK: 5,
  minScore: 0.7, // Optional: minimum similarity score
});

console.log(`Found ${result.results.length} relevant chunks`);
result.results.forEach(r => {
  console.log(`Score: ${r.score}, Content: ${r.chunk.content}`);
});
```

### Getting Agent Knowledge Context

```typescript
// Get formatted knowledge context for agent
const context = await knowledgeService.getAgentKnowledgeContext(
  agentId,
  'authentication',
  5
);

console.log(`Agent: ${context.agentId}`);
console.log(`Relevant chunks: ${context.relevantChunks.length}`);
console.log(`Total relevance: ${context.totalRelevance}`);
console.log(`Sources: ${context.sources.length}`);
```

### Managing Sources

```typescript
// List all sources
const sources = await knowledgeService.listSources(agentId);

// Update a source
await knowledgeService.updateSource(sourceId, {
  metadata: {
    ...existingMetadata,
    tags: ['updated', 'api'],
  },
});

// Delete a source
await knowledgeService.deleteSource(sourceId);

// Reindex a source
await knowledgeService.reindexSource(sourceId);

// Reindex all sources for an agent
await knowledgeService.reindexAgent(agentId);

// Get statistics
const stats = await knowledgeService.getStats(agentId);
console.log(`Total sources: ${stats.totalSources}`);
console.log(`Total chunks: ${stats.totalChunks}`);
console.log(`Total tokens: ${stats.totalTokens}`);
```

## REST API Endpoints

### Ingest Knowledge Source
```http
POST /knowledge/ingest
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentId": "agent-123",
  "source": {
    "id": "source-1",
    "type": "markdown",
    "content": "# Documentation\n\n...",
    "metadata": {
      "title": "Docs",
      "tags": ["docs"],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "status": "pending"
  },
  "options": {
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "generateEmbeddings": true
  }
}
```

### Retrieve Knowledge
```http
POST /knowledge/retrieve
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentId": "agent-123",
  "query": "How do I authenticate?",
  "topK": 5,
  "minScore": 0.7
}
```

### Get Agent Knowledge Context
```http
GET /knowledge/context/:agentId?query=authentication&topK=5
Authorization: Bearer <token>
```

### Add Knowledge Source
```http
POST /knowledge/sources/:agentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "source-1",
  "type": "website",
  "url": "https://example.com/docs",
  "metadata": {
    "title": "Example Docs",
    "tags": ["docs"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "status": "pending"
}
```

### List Knowledge Sources
```http
GET /knowledge/sources/:agentId
Authorization: Bearer <token>
```

### Update Knowledge Source
```http
PUT /knowledge/sources/:sourceId
Authorization: Bearer <token>
Content-Type: application/json

{
  "metadata": {
    "title": "Updated Title",
    "tags": ["updated"]
  }
}
```

### Delete Knowledge Source
```http
DELETE /knowledge/sources/:sourceId
Authorization: Bearer <token>
```

### Reindex Source
```http
POST /knowledge/sources/:sourceId/reindex
Authorization: Bearer <token>
```

### Reindex Agent
```http
POST /knowledge/agents/:agentId/reindex
Authorization: Bearer <token>
```

### Get Statistics
```http
GET /knowledge/stats/:agentId
Authorization: Bearer <token>
```

## Document Types

### Markdown
```typescript
{
  type: 'markdown',
  content: '# Title\n\nContent here...',
  metadata: {
    title: 'Document Title',
    tags: ['markdown', 'docs'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}
```

### Website
```typescript
{
  type: 'website',
  url: 'https://example.com/docs',
  metadata: {
    title: 'Website Documentation',
    tags: ['website', 'docs'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}
```

### PDF
```typescript
{
  type: 'pdf',
  url: 'https://example.com/document.pdf',
  metadata: {
    title: 'PDF Document',
    tags: ['pdf', 'docs'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}
```

### API
```typescript
{
  type: 'api',
  url: 'https://api.example.com/docs',
  metadata: {
    title: 'API Documentation',
    tags: ['api', 'docs'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}
```

### GitHub Repository
```typescript
{
  type: 'github',
  url: 'https://github.com/user/repo',
  metadata: {
    title: 'GitHub Repository',
    tags: ['github', 'code'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}
```

## Chunking Strategy

The chunking service uses intelligent strategies to preserve document structure:

- **Markdown**: Chunks by sections (headers) while respecting chunk size limits
- **Code**: Preserves code blocks and syntax
- **Sentences**: Splits on sentence boundaries when possible
- **Overlap**: Maintains context between chunks with configurable overlap

### Chunking Options

```typescript
{
  chunkSize: 1000,        // Maximum chunk size in characters
  chunkOverlap: 200,      // Overlap between chunks
  preserveStructure: true, // Respect document structure
  splitOnSentences: true,  // Split on sentence boundaries
  respectCodeBlocks: true, // Keep code blocks intact
}
```

## Best Practices

1. **Chunk Size**: Use 500-1500 characters for optimal balance between context and precision
2. **Overlap**: Set overlap to 10-20% of chunk size for better context continuity
3. **Embedding Model**: Choose based on your use case:
   - OpenAI: Best quality, requires API key
   - Cohere: Good quality, multilingual support
   - HuggingFace: Free, self-hosted
   - Ollama: Local, no API required
4. **Top K**: Start with 3-5 chunks for retrieval, adjust based on results
5. **Min Score**: Use 0.7-0.8 threshold to filter low-relevance results
6. **Reindexing**: Reindex when:
   - Embedding model changes
   - Chunk size/overlap changes
   - Source content is updated

## Troubleshooting

### Low Relevance Scores
- Increase `topK` to retrieve more chunks
- Lower `minScore` threshold
- Check if embedding model matches your content type
- Verify source content is relevant to queries

### Slow Ingestion
- Reduce `chunkSize` for faster processing
- Disable `generateEmbeddings` during initial testing
- Use local embedding models (Ollama) for faster processing

### High Memory Usage
- Reduce `chunkSize` and `chunkOverlap`
- Limit number of sources per agent
- Use smaller embedding models

### Missing Context
- Increase `chunkOverlap` for better context continuity
- Increase `topK` to retrieve more chunks
- Check if sources are properly indexed

## Examples

See the test files for complete examples:
- `backend/src/knowledge/__tests__/knowledge.service.spec.ts` - Unit tests
- `backend/src/knowledge/__tests__/knowledge-integration.spec.ts` - Integration tests

## Future Enhancements

- [ ] Support for more vector stores (Pinecone, Weaviate, Qdrant)
- [ ] Hybrid search (keyword + semantic)
- [ ] Reranking for improved relevance
- [ ] Automatic source updates based on schedule
- [ ] Source versioning and history
- [ ] Multi-modal embeddings (text + images)
- [ ] Knowledge graph integration
