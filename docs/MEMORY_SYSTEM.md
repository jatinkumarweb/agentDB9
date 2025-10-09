# Long-Term and Short-Term Memory System

The Memory System enables continuous learning and context retention across sessions through a dual-layer storage architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Session                         │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Short-Term      │    │  Long-Term       │
│  Memory (STM)    │    │  Memory (LTM)    │
│                  │    │                  │
│  • In-Memory     │    │  • PostgreSQL    │
│  • Redis (prod)  │    │  • Persistent    │
│  • 10-15 recent  │    │  • Consolidated  │
│  • 24hr TTL      │    │  • Searchable    │
└────────┬─────────┘    └─────────┬────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
         ┌────────────────┐
         │ Consolidation  │
         │   Process      │
         │ (Daily/Weekly) │
         └────────────────┘
```

## Features

### Short-Term Memory (STM)
- **Storage**: In-memory (Redis in production)
- **Capacity**: 10-15 most recent interactions per session
- **TTL**: 24 hours default
- **Purpose**: Fast context window recall for active sessions
- **Content**: Recent interactions, project data, temporary context

### Long-Term Memory (LTM)
- **Storage**: PostgreSQL with JSONB
- **Capacity**: Unlimited
- **Persistence**: Permanent
- **Purpose**: Agent-level learning and knowledge retention
- **Content**: Lessons learned, resolved challenges, user feedback, consolidated knowledge

### Memory Consolidation
- **Frequency**: Daily/weekly automatic runs
- **Strategies**: Summarize, Promote, Merge, Archive
- **Process**: STM → LTM transformation
- **Triggers**: Age, importance, session end

## Usage

### Creating Memories

```typescript
import { MemoryService } from './memory/memory.service';

const memoryService = // ... inject service

// Create short-term memory (interaction)
await memoryService.createMemory({
  agentId: 'agent-123',
  sessionId: 'session-456',
  category: 'interaction',
  content: 'User asked about implementing authentication',
  importance: 0.7,
  metadata: {
    workspaceId: 'workspace-789',
    tags: ['authentication', 'security'],
    keywords: ['auth', 'jwt', 'login'],
    confidence: 0.8,
    relevance: 0.9,
    source: 'chat',
  },
});

// Create long-term memory (lesson)
await memoryService.createMemory({
  agentId: 'agent-123',
  category: 'lesson',
  content: 'When implementing JWT authentication in NestJS, always use @nestjs/jwt and @nestjs/passport together for best practices',
  importance: 0.9,
  type: 'long-term',
  metadata: {
    tags: ['nestjs', 'jwt', 'authentication', 'best-practice'],
    keywords: ['jwt', 'passport', 'nestjs', 'auth'],
    confidence: 0.95,
    relevance: 0.9,
    source: 'system-observation',
  },
});
```

### Retrieving Memory Context

```typescript
// Get memory context for current session
const memoryContext = await memoryService.getMemoryContext(
  'agent-123',
  'session-456',
  'authentication implementation'
);

console.log(memoryContext.summary);
// "Memory context includes: 5 recent interactions, 3 learned lessons, 2 resolved challenges"

console.log(`Recent interactions: ${memoryContext.recentInteractions.length}`);
console.log(`Relevant lessons: ${memoryContext.relevantLessons.length}`);
console.log(`Resolved challenges: ${memoryContext.relevantChallenges.length}`);
console.log(`User feedback: ${memoryContext.relevantFeedback.length}`);
```

### Memory Consolidation

```typescript
// Manual consolidation
const result = await memoryService.consolidate({
  agentId: 'agent-123',
  minImportance: 0.6,
  maxAge: 24, // hours
  strategy: 'summarize',
});

console.log(result.summary);
// "Strategy: summarize, Processed 15 STM entries, Created 3 LTM entries, Archived 15 STM entries"

// Automatic consolidation (scheduled)
const results = await memoryService.runAutoConsolidation([
  'agent-123',
  'agent-456',
  'agent-789',
]);
```

### Querying Memories

```typescript
// Query both STM and LTM
const result = await memoryService.queryMemories({
  agentId: 'agent-123',
  query: 'authentication',
  category: 'lesson',
  minImportance: 0.7,
  limit: 10,
});

console.log(`Found ${result.totalCount} memories`);
result.memories.forEach(memory => {
  console.log(`- ${memory.category}: ${memory.content || memory.summary}`);
});
```

### Memory Statistics

```typescript
const stats = await memoryService.getStats('agent-123');

console.log('Short-Term Memory:');
console.log(`  Total: ${stats.shortTerm.total}`);
console.log(`  By category:`, stats.shortTerm.byCategory);
console.log(`  Average importance: ${stats.shortTerm.averageImportance}`);

console.log('Long-Term Memory:');
console.log(`  Total: ${stats.longTerm.total}`);
console.log(`  By category:`, stats.longTerm.byCategory);
console.log(`  Total accesses: ${stats.longTerm.totalAccesses}`);
console.log(`  Most accessed:`, stats.longTerm.mostAccessed?.summary);
```

## REST API Endpoints

### Create Memory
```http
POST /memory
Content-Type: application/json

{
  "agentId": "agent-123",
  "sessionId": "session-456",
  "category": "interaction",
  "content": "User asked about authentication",
  "importance": 0.7,
  "metadata": {
    "tags": ["auth", "security"],
    "keywords": ["authentication", "jwt"],
    "source": "chat"
  }
}
```

### Get Memory Context
```http
GET /memory/context/:agentId/:sessionId?query=authentication
```

### Query Memories
```http
POST /memory/query
Content-Type: application/json

{
  "agentId": "agent-123",
  "category": "lesson",
  "minImportance": 0.7,
  "limit": 10
}
```

### Get Statistics
```http
GET /memory/stats/:agentId
```

### Consolidate Memories
```http
POST /memory/consolidate
Content-Type: application/json

{
  "agentId": "agent-123",
  "minImportance": 0.6,
  "maxAge": 24,
  "strategy": "summarize"
}
```

### Clear Session
```http
POST /memory/clear/:agentId/:sessionId
```

## Memory Categories

### Interaction
Recent user-agent interactions and conversations.

### Lesson
Learned lessons and patterns from experience.

### Challenge
Resolved challenges and their solutions.

### Feedback
User feedback and preferences.

### Context
Project and workspace context.

### Decision
Important decisions made during development.

### Error
Errors encountered and their fixes.

### Success
Successful completions and achievements.

### Preference
User preferences and patterns.

## Consolidation Strategies

### Summarize (Default)
Groups similar STMs by category and creates summarized LTMs.
- **Best for**: Regular daily/weekly consolidation
- **Output**: Fewer, more comprehensive LTM entries

### Promote
Promotes high-importance STMs directly to LTM without summarization.
- **Best for**: Critical learnings and important interactions
- **Threshold**: Importance >= 0.8

### Merge
Merges new STMs with existing related LTMs.
- **Best for**: Updating existing knowledge
- **Output**: Updated LTM entries

### Archive
Archives old STMs without creating LTMs.
- **Best for**: Cleanup of low-importance memories
- **Output**: Freed STM space

## Agent Integration

The memory system is automatically integrated into agent sessions:

```typescript
// When processing chat, the agent automatically:
// 1. Stores the interaction in STM
// 2. Retrieves relevant memory context
// 3. Includes memory in system prompt
// 4. Learns from past interactions

const response = await agentsService.processChatWithAgent(
  agentId,
  'How do I implement JWT authentication?',
  {
    sessionId: 'session-123',
    workspaceId: 'workspace-456',
    userId: 'user-789',
  }
);

// The agent's response will include:
// - Recent interactions from this session
// - Relevant lessons learned about JWT
// - Past challenges with authentication
// - User preferences for security implementations
```

## System Prompt Enhancement

Memory context is automatically included in the agent's system prompt:

```
Memory Context (Memory context includes: 5 recent interactions, 3 learned lessons, 2 resolved challenges):

Learned Lessons:
[1] When implementing JWT authentication in NestJS, use @nestjs/jwt and @nestjs/passport
[2] Always validate JWT tokens on every protected route
[3] Store refresh tokens securely in HTTP-only cookies

Resolved Challenges:
[1] Fixed JWT expiration handling by implementing refresh token rotation
[2] Resolved CORS issues with authentication by configuring proper headers

User Feedback:
[1] User prefers TypeScript strict mode for better type safety
[2] User likes detailed code comments for complex logic
```

## Scheduled Consolidation

Set up automatic consolidation using cron jobs or schedulers:

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MemoryScheduler {
  constructor(private memoryService: MemoryService) {}

  // Run daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyConsolidation() {
    const agentIds = await this.getAllAgentIds();
    await this.memoryService.runAutoConsolidation(agentIds);
  }

  // Run weekly on Sunday at 3 AM
  @Cron('0 3 * * 0')
  async handleWeeklyConsolidation() {
    // More aggressive consolidation
    const agentIds = await this.getAllAgentIds();
    
    for (const agentId of agentIds) {
      await this.memoryService.consolidate({
        agentId,
        minImportance: 0.5,
        maxAge: 168, // 1 week
        strategy: 'merge',
      });
    }
  }
}
```

## Best Practices

1. **Importance Scoring**: Assign higher importance (0.8-1.0) to critical learnings
2. **Tagging**: Use consistent tags for better retrieval
3. **Keywords**: Extract meaningful keywords for search
4. **Consolidation**: Run daily for active agents, weekly for less active
5. **Cleanup**: Archive low-importance memories regularly
6. **Context Size**: Keep memory context concise (top 3-5 items per category)
7. **Session Management**: Clear sessions after completion
8. **Monitoring**: Track consolidation metrics and memory growth

## Performance Considerations

- **STM**: O(1) access, limited by session size (10-15 entries)
- **LTM**: Indexed queries, scales with proper database optimization
- **Consolidation**: Run during low-traffic periods
- **Memory Growth**: Monitor and archive old LTMs periodically

## Future Enhancements

- [ ] Redis integration for production STM
- [ ] Vector embeddings for semantic search
- [ ] Memory importance decay over time
- [ ] Cross-agent knowledge sharing
- [ ] Memory visualization dashboard
- [ ] Automatic importance scoring with ML
- [ ] Memory conflict resolution
- [ ] Memory versioning and history
