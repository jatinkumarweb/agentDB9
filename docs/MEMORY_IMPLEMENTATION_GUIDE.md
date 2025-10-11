# Agent Memory Implementation Guide

## Quick Start: Implementing Vector-Based Long-Term Memory

### Step 1: Enable pgvector Extension

```sql
-- Run in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Step 2: Add Embedding Column

```sql
-- Add vector column to existing table
ALTER TABLE long_term_memories 
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_ltm_embedding 
  ON long_term_memories 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Step 3: Install Embedding Service

```bash
# Install OpenAI SDK
npm install openai --workspace=backend

# Or use Cohere
npm install cohere-ai --workspace=backend
```

### Step 4: Create Embedding Service

```typescript
// backend/src/memory/embedding.service.ts
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536 dimensions, cheaper
        input: text.substring(0, 8000), // Limit input size
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embeddings in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts.map(t => t.substring(0, 8000)),
      });

      return response.data.map(d => d.embedding);
    } catch (error) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

### Step 5: Update Long-Term Memory Service

```typescript
// backend/src/memory/long-term-memory.service.ts

import { EmbeddingService } from './embedding.service';

@Injectable()
export class LongTermMemoryService {
  constructor(
    @InjectRepository(LongTermMemoryEntity)
    private ltmRepository: Repository<LongTermMemoryEntity>,
    private embeddingService: EmbeddingService, // Add this
  ) {}

  /**
   * Create memory with embedding
   */
  async create(
    summary: string,
    details: string,
    agentId: string,
    category: MemoryCategory,
    metadata: any,
    importance: number = 0.7,
    consolidatedFrom?: string[],
  ): Promise<LongTermMemory> {
    try {
      // Generate embedding for semantic search
      const embedding = await this.embeddingService.generateEmbedding(
        `${summary}\n\n${details}`
      );

      const entity = this.ltmRepository.create({
        id: generateId(),
        agentId,
        category,
        summary,
        details,
        metadata,
        importance,
        embedding: JSON.stringify(embedding), // Store as JSON
        accessCount: 0,
        consolidatedFrom,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await this.ltmRepository.save(entity);
      this.logger.log(`Created LTM with embedding: ${saved.id}`);

      return this.entityToMemory(saved);
    } catch (error) {
      this.logger.error(`Failed to create LTM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search memories by semantic similarity
   */
  async searchSimilar(
    agentId: string,
    query: string,
    limit: number = 5,
    minImportance: number = 0.5
  ): Promise<LongTermMemory[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Use pgvector for similarity search
      const results = await this.ltmRepository
        .createQueryBuilder('ltm')
        .where('ltm.agentId = :agentId', { agentId })
        .andWhere('ltm.importance >= :minImportance', { minImportance })
        .andWhere('ltm.embedding IS NOT NULL')
        .orderBy(`ltm.embedding <-> '[${queryEmbedding.join(',')}]'`, 'ASC')
        .limit(limit)
        .getMany();

      // Update access count
      for (const result of results) {
        await this.incrementAccessCount(result.id);
      }

      return results.map(e => this.entityToMemory(e));
    } catch (error) {
      this.logger.error(`Failed to search similar memories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get relevant memories for current context
   */
  async getRelevantMemories(
    agentId: string,
    context: {
      userMessage: string;
      recentMessages?: string[];
      currentTask?: string;
    },
    limit: number = 5
  ): Promise<LongTermMemory[]> {
    // Combine context into search query
    const searchQuery = [
      context.userMessage,
      ...(context.recentMessages || []).slice(-3),
      context.currentTask
    ].filter(Boolean).join('\n');

    return this.searchSimilar(agentId, searchQuery, limit);
  }
}
```

### Step 6: Update Memory Module

```typescript
// backend/src/memory/memory.module.ts

import { EmbeddingService } from './embedding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LongTermMemoryEntity]),
  ],
  providers: [
    MemoryService,
    ShortTermMemoryService,
    LongTermMemoryService,
    MemoryConsolidationService,
    EmbeddingService, // Add this
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
```

### Step 7: Use in Conversations

```typescript
// backend/src/conversations/conversations.service.ts

private async generateAgentResponse(conversation: any, userMessage: string) {
  // Get relevant memories before generating response
  const relevantMemories = await this.memoryService.getRelevantMemories(
    conversation.agentId,
    {
      userMessage,
      recentMessages: conversationHistory.slice(-5).map(m => m.content),
      currentTask: conversation.projectId ? 'workspace' : 'chat'
    },
    5 // Get top 5 relevant memories
  );

  // Add memories to system prompt
  const memoryContext = relevantMemories.length > 0
    ? `\n\nRelevant past experiences:\n${relevantMemories.map(m => 
        `- ${m.summary}: ${m.details.substring(0, 200)}`
      ).join('\n')}`
    : '';

  const systemPrompt = this.buildSystemPrompt(conversation.agent) + memoryContext;

  // Continue with normal flow...
}
```

## Testing the Implementation

### Test 1: Create Memory with Embedding

```typescript
// Test creating a memory
const memory = await memoryService.createMemory({
  agentId: 'test-agent',
  sessionId: 'test-session',
  type: 'long-term',
  category: 'interaction',
  content: 'User prefers TypeScript over JavaScript for all projects',
  importance: 0.9,
  metadata: {
    tags: ['preference', 'typescript'],
    keywords: ['typescript', 'preference']
  }
});

console.log('Created memory with embedding:', memory.id);
```

### Test 2: Search Similar Memories

```typescript
// Test semantic search
const similar = await ltmService.searchSimilar(
  'test-agent',
  'What programming language should I use?',
  5
);

console.log('Found similar memories:', similar.length);
similar.forEach(m => {
  console.log(`- ${m.summary} (importance: ${m.importance})`);
});
```

### Test 3: Get Relevant Context

```typescript
// Test context retrieval
const relevant = await ltmService.getRelevantMemories(
  'test-agent',
  {
    userMessage: 'Create a new React component',
    recentMessages: ['I want to build a dashboard', 'Use modern practices'],
    currentTask: 'workspace'
  },
  5
);

console.log('Relevant memories for context:', relevant.length);
```

## Performance Optimization

### 1. Batch Embedding Generation

```typescript
// When consolidating multiple memories
async consolidateMemories(memories: ShortTermMemory[]) {
  // Generate all embeddings in one API call
  const texts = memories.map(m => `${m.content}`);
  const embeddings = await this.embeddingService.generateEmbeddings(texts);
  
  // Create LTM entries with embeddings
  const ltmEntries = memories.map((m, i) => ({
    ...m,
    embedding: embeddings[i]
  }));
  
  await this.ltmRepository.save(ltmEntries);
}
```

### 2. Cache Frequently Accessed Memories

```typescript
// Add Redis caching
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class LongTermMemoryService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    // ... other dependencies
  ) {}

  async get(id: string): Promise<LongTermMemory | null> {
    // Check cache first
    const cached = await this.cacheManager.get<LongTermMemory>(`ltm:${id}`);
    if (cached) return cached;

    // Fetch from database
    const memory = await this.ltmRepository.findOne({ where: { id } });
    if (!memory) return null;

    // Cache for 1 hour
    await this.cacheManager.set(`ltm:${id}`, memory, 3600);
    
    return this.entityToMemory(memory);
  }
}
```

### 3. Async Embedding Generation

```typescript
// Don't block on embedding generation
async create(...) {
  const entity = this.ltmRepository.create({
    // ... other fields
    embedding: null // Initially null
  });

  const saved = await this.ltmRepository.save(entity);

  // Generate embedding asynchronously
  this.generateEmbeddingAsync(saved.id, summary, details)
    .catch(err => this.logger.error(`Failed to generate embedding: ${err}`));

  return this.entityToMemory(saved);
}

private async generateEmbeddingAsync(id: string, summary: string, details: string) {
  const embedding = await this.embeddingService.generateEmbedding(
    `${summary}\n\n${details}`
  );
  
  await this.ltmRepository.update(id, {
    embedding: JSON.stringify(embedding)
  });
}
```

## Migration Script

```typescript
// scripts/migrate-embeddings.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LongTermMemoryService } from '../src/memory/long-term-memory.service';
import { EmbeddingService } from '../src/memory/embedding.service';

async function migrateEmbeddings() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ltmService = app.get(LongTermMemoryService);
  const embeddingService = app.get(EmbeddingService);

  console.log('Starting embedding migration...');

  // Get all memories without embeddings
  const memories = await ltmService.findWithoutEmbeddings();
  console.log(`Found ${memories.length} memories without embeddings`);

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}...`);

    const texts = batch.map(m => `${m.summary}\n\n${m.details}`);
    const embeddings = await embeddingService.generateEmbeddings(texts);

    // Update database
    for (let j = 0; j < batch.length; j++) {
      await ltmService.updateEmbedding(batch[j].id, embeddings[j]);
    }

    console.log(`Completed ${Math.min(i + batchSize, memories.length)} / ${memories.length}`);
  }

  console.log('Migration complete!');
  await app.close();
}

migrateEmbeddings().catch(console.error);
```

## Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...

# Or use Cohere
COHERE_API_KEY=...

# Memory configuration
MEMORY_EMBEDDING_MODEL=text-embedding-3-small
MEMORY_VECTOR_DIMENSIONS=1536
MEMORY_MIN_IMPORTANCE=0.5
MEMORY_MAX_PER_AGENT=10000
```

## Monitoring & Analytics

```typescript
// Add memory analytics endpoint
@Get('analytics/memory/:agentId')
async getMemoryAnalytics(@Param('agentId') agentId: string) {
  const stats = await this.memoryService.getAnalytics(agentId);
  
  return {
    totalMemories: stats.total,
    withEmbeddings: stats.withEmbeddings,
    averageImportance: stats.avgImportance,
    mostAccessedCategories: stats.topCategories,
    memoryGrowth: stats.growthRate,
    storageSize: stats.storageMB
  };
}
```

## Cost Estimation

**OpenAI Embeddings (text-embedding-3-small):**
- Cost: $0.02 per 1M tokens
- Average memory: ~500 tokens
- 1000 memories: ~$0.01
- 100k memories: ~$1.00

**Storage:**
- Vector size: 1536 dimensions × 4 bytes = 6KB per memory
- 100k memories: ~600MB
- PostgreSQL storage: Minimal cost

## Next Steps

1. ✅ Enable pgvector extension
2. ✅ Add embedding column
3. ✅ Create embedding service
4. ✅ Update LTM service with vector search
5. ✅ Integrate with conversation flow
6. [ ] Add background consolidation job
7. [ ] Implement memory decay
8. [ ] Add analytics dashboard
9. [ ] Optimize with caching
10. [ ] Monitor costs and performance
