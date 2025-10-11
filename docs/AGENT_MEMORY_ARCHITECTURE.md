# Agent Long-Term Memory Architecture

## Overview

This document outlines the best practices and recommended architecture for implementing long-term memory (LTM) for AI agents.

## Current Implementation

### Storage
- **Database**: PostgreSQL with TypeORM
- **Structure**: `long_term_memories` table
- **Fields**: 
  - `id`, `agentId`, `category`, `summary`, `details`
  - `metadata`, `importance`, `accessCount`, `lastAccessedAt`
  - `embedding` (for vector search - not yet implemented)
  - `consolidatedFrom`, `createdAt`, `updatedAt`

### Current Flow
```
Tool Execution → Long-Term Memory (PostgreSQL)
Conversation   → Long-Term Memory (PostgreSQL)
```

## Recommended Architecture

### 1. **Hierarchical Memory System**

```
┌─────────────────────────────────────────────────────────┐
│                    WORKING MEMORY                        │
│  (Current conversation context - in RAM)                 │
│  - Last N messages                                       │
│  - Active tool results                                   │
│  - Current task state                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  SHORT-TERM MEMORY                       │
│  (Recent session data - Redis/RAM, 24h TTL)             │
│  - Recent interactions                                   │
│  - Tool execution history                                │
│  - Temporary learnings                                   │
│  - Session-specific context                              │
└─────────────────────────────────────────────────────────┘
                          ↓
              (Consolidation Process)
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  LONG-TERM MEMORY                        │
│  (Persistent knowledge - PostgreSQL + Vector DB)        │
│  - Important learnings                                   │
│  - User preferences                                      │
│  - Domain knowledge                                      │
│  - Historical patterns                                   │
│  - Error resolutions                                     │
└─────────────────────────────────────────────────────────┘
```

### 2. **Memory Types & Categories**

#### A. **Episodic Memory** (What happened)
- Specific events and interactions
- Tool executions with results
- User requests and agent responses
- Timestamps and context

**Example:**
```json
{
  "type": "episodic",
  "category": "tool-execution",
  "summary": "Successfully created React component",
  "details": "User requested Button component with TypeScript. Created using shadcn/ui pattern.",
  "importance": 0.7,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### B. **Semantic Memory** (What is known)
- Facts and knowledge
- User preferences
- Project structure
- Domain expertise

**Example:**
```json
{
  "type": "semantic",
  "category": "user-preference",
  "summary": "User prefers TypeScript over JavaScript",
  "details": "Consistently requests TypeScript. Uses strict mode. Prefers functional components.",
  "importance": 0.9
}
```

#### C. **Procedural Memory** (How to do things)
- Successful patterns
- Error resolutions
- Best practices learned
- Workflow optimizations

**Example:**
```json
{
  "type": "procedural",
  "category": "error-resolution",
  "summary": "Fix for npm install failures",
  "details": "When npm install fails with EACCES, run: sudo chown -R $USER ~/.npm",
  "importance": 0.8,
  "successCount": 5
}
```

### 3. **Vector Embeddings for Semantic Search**

**Why Vector Search?**
- Find similar past experiences
- Retrieve relevant context
- Pattern matching across conversations
- Semantic similarity vs keyword matching

**Implementation:**

```typescript
// Add to long-term-memory.service.ts

async createWithEmbedding(
  summary: string,
  details: string,
  agentId: string,
  category: MemoryCategory,
  metadata: any,
  importance: number = 0.7
): Promise<LongTermMemory> {
  // Generate embedding using OpenAI/Cohere
  const embedding = await this.generateEmbedding(details);
  
  const entity = this.ltmRepository.create({
    id: generateId(),
    agentId,
    category,
    summary,
    details,
    metadata,
    importance,
    embedding, // Store vector
    accessCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return await this.ltmRepository.save(entity);
}

async searchSimilar(
  agentId: string,
  query: string,
  limit: number = 5
): Promise<LongTermMemory[]> {
  const queryEmbedding = await this.generateEmbedding(query);
  
  // Use pgvector for similarity search
  const results = await this.ltmRepository
    .createQueryBuilder('ltm')
    .where('ltm.agentId = :agentId', { agentId })
    .orderBy('ltm.embedding <-> :embedding', 'ASC') // Cosine distance
    .setParameter('embedding', JSON.stringify(queryEmbedding))
    .limit(limit)
    .getMany();
    
  return results.map(e => this.entityToMemory(e));
}
```

### 4. **Memory Consolidation Strategy**

**When to Consolidate:**
- End of conversation
- After N tool executions (e.g., 10)
- Periodic background job (hourly)
- When short-term memory reaches threshold

**Consolidation Process:**

```typescript
async consolidateMemories(agentId: string, sessionId: string) {
  // 1. Retrieve short-term memories
  const stmMemories = await this.stmService.query({
    agentId,
    sessionId,
    minImportance: 0.6 // Only consolidate important ones
  });
  
  // 2. Group by similarity/topic
  const groups = await this.groupSimilarMemories(stmMemories);
  
  // 3. Summarize each group using LLM
  for (const group of groups) {
    const summary = await this.summarizeMemories(group);
    
    // 4. Create long-term memory
    await this.ltmService.createWithEmbedding(
      summary.title,
      summary.details,
      agentId,
      'interaction',
      {
        consolidatedFrom: group.map(m => m.id),
        toolsUsed: group.flatMap(m => m.metadata?.tools || []),
        successRate: this.calculateSuccessRate(group)
      },
      this.calculateImportance(group)
    );
  }
  
  // 5. Clean up consolidated short-term memories
  await this.stmService.deleteMany(stmMemories.map(m => m.id));
}
```

### 5. **Importance Scoring**

**Factors:**
- **Recency**: Recent memories more important
- **Frequency**: Often-accessed memories
- **Success**: Successful outcomes weighted higher
- **User Feedback**: Explicit user signals
- **Error Severity**: Critical errors remembered
- **Uniqueness**: Novel situations prioritized

**Formula:**
```typescript
function calculateImportance(memory: Memory): number {
  const recencyScore = 1 - (daysSince(memory.createdAt) / 365); // 0-1
  const frequencyScore = Math.min(memory.accessCount / 10, 1); // 0-1
  const successScore = memory.success ? 1 : 0.3;
  const errorScore = memory.isError ? 0.9 : 0.5;
  const uniquenessScore = memory.isUnique ? 0.9 : 0.5;
  
  return (
    recencyScore * 0.2 +
    frequencyScore * 0.2 +
    successScore * 0.2 +
    errorScore * 0.2 +
    uniquenessScore * 0.2
  );
}
```

### 6. **Memory Retrieval Strategy**

**Context-Aware Retrieval:**

```typescript
async getRelevantMemories(
  agentId: string,
  currentContext: {
    userMessage: string;
    conversationHistory: Message[];
    currentTask?: string;
    projectContext?: any;
  },
  limit: number = 5
): Promise<LongTermMemory[]> {
  // 1. Vector search for semantic similarity
  const semanticMatches = await this.searchSimilar(
    agentId,
    currentContext.userMessage,
    limit * 2
  );
  
  // 2. Filter by relevance
  const relevant = semanticMatches.filter(m => 
    this.isRelevantToContext(m, currentContext)
  );
  
  // 3. Boost recent and frequently accessed
  const scored = relevant.map(m => ({
    memory: m,
    score: this.calculateRetrievalScore(m, currentContext)
  }));
  
  // 4. Sort and limit
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.memory);
}
```

### 7. **Memory Decay & Cleanup**

**Strategies:**
- **Time-based**: Delete memories older than X months
- **Importance-based**: Keep only high-importance memories
- **Access-based**: Remove rarely accessed memories
- **Capacity-based**: Keep top N memories per agent

**Implementation:**
```typescript
async cleanupOldMemories(agentId: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Delete low-importance, old, rarely-accessed memories
  await this.ltmRepository
    .createQueryBuilder()
    .delete()
    .where('agentId = :agentId', { agentId })
    .andWhere('importance < 0.5')
    .andWhere('accessCount < 3')
    .andWhere('createdAt < :date', { date: sixMonthsAgo })
    .execute();
}
```

### 8. **Privacy & Security**

**Best Practices:**
- **Encryption**: Encrypt sensitive memories at rest
- **Access Control**: Agent-specific memories only
- **Anonymization**: Remove PII before storage
- **Retention Policies**: Auto-delete after period
- **User Control**: Allow users to view/delete memories

```typescript
async createSecureMemory(request: CreateMemoryRequest) {
  // 1. Anonymize PII
  const anonymized = await this.anonymizePII(request.content);
  
  // 2. Encrypt if sensitive
  const encrypted = request.sensitive 
    ? await this.encrypt(anonymized)
    : anonymized;
  
  // 3. Store with metadata
  return this.ltmService.create(
    request.summary,
    encrypted,
    request.agentId,
    request.category,
    {
      ...request.metadata,
      encrypted: request.sensitive,
      retentionDays: request.retentionDays || 90
    },
    request.importance
  );
}
```

## Recommended Implementation Plan

### Phase 1: Foundation (Current)
- ✅ PostgreSQL storage
- ✅ Basic CRUD operations
- ✅ Importance scoring
- ✅ Access tracking

### Phase 2: Vector Search
- [ ] Add pgvector extension
- [ ] Generate embeddings for memories
- [ ] Implement semantic search
- [ ] Migrate existing memories

### Phase 3: Smart Consolidation
- [ ] Implement grouping algorithm
- [ ] LLM-based summarization
- [ ] Automatic consolidation triggers
- [ ] Background job scheduler

### Phase 4: Advanced Features
- [ ] Memory decay/cleanup
- [ ] User feedback integration
- [ ] Privacy controls
- [ ] Analytics dashboard

### Phase 5: Optimization
- [ ] Caching layer (Redis)
- [ ] Query optimization
- [ ] Batch operations
- [ ] Performance monitoring

## Database Schema Recommendations

```sql
-- Add vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Update table
ALTER TABLE long_term_memories 
  ADD COLUMN embedding vector(1536), -- OpenAI embedding size
  ADD COLUMN memory_type VARCHAR(50) DEFAULT 'episodic',
  ADD COLUMN success_count INTEGER DEFAULT 0,
  ADD COLUMN failure_count INTEGER DEFAULT 0,
  ADD COLUMN last_consolidated_at TIMESTAMP,
  ADD COLUMN retention_days INTEGER DEFAULT 90,
  ADD COLUMN is_encrypted BOOLEAN DEFAULT false;

-- Add indexes
CREATE INDEX idx_ltm_embedding ON long_term_memories 
  USING ivfflat (embedding vector_cosine_ops);
  
CREATE INDEX idx_ltm_importance ON long_term_memories (importance DESC);
CREATE INDEX idx_ltm_access_count ON long_term_memories (access_count DESC);
CREATE INDEX idx_ltm_created_at ON long_term_memories (created_at DESC);
```

## Configuration

```typescript
// backend/src/memory/memory.config.ts
export const MEMORY_CONFIG = {
  shortTerm: {
    ttlHours: 24,
    maxPerSession: 50,
    consolidationThreshold: 10
  },
  longTerm: {
    minImportance: 0.5,
    maxPerAgent: 10000,
    embeddingModel: 'text-embedding-3-small',
    vectorDimensions: 1536
  },
  consolidation: {
    enabled: true,
    intervalMinutes: 60,
    batchSize: 100,
    minImportanceToKeep: 0.6
  },
  cleanup: {
    enabled: true,
    retentionDays: 90,
    runIntervalDays: 7
  }
};
```

## Best Practices Summary

1. **Use Vector Embeddings** for semantic search
2. **Implement Hierarchical Memory** (working → short → long)
3. **Smart Consolidation** with LLM summarization
4. **Importance Scoring** based on multiple factors
5. **Context-Aware Retrieval** for relevant memories
6. **Regular Cleanup** to manage storage
7. **Privacy First** with encryption and anonymization
8. **Performance Optimization** with caching and indexes

## References

- [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560)
- [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
