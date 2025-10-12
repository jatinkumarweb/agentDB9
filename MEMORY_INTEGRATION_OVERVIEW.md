# Memory Integration Overview

## Summary

Memory is integrated into **BOTH** the Agent Service and Conversation Service, providing comprehensive memory capabilities across the entire system.

## Integration Points

### 1. Conversation Service (Primary) ✅

**File**: `backend/src/conversations/conversations.service.ts`

The conversation service is the **primary** location for memory integration, handling:
- Tool execution memory creation
- Conversation summary memory creation
- Memory context retrieval for agent responses
- Memory-enhanced system prompts

#### Memory Creation

**Tool Execution Memory** (Line 2256-2291):
```typescript
private async saveToolExecutionMemory(
  agentId: string,
  sessionId: string,
  toolName: string,
  toolResult: any,
  observation: string,
  model: string
): Promise<void> {
  await this.memoryService.createMemory({
    agentId,
    sessionId,
    type: 'long-term',
    category: 'interaction',
    content: `${summary}\n\n${content}`,
    importance: success ? 0.7 : 0.9,
    metadata: {
      tags: [model, 'tool-execution', toolName, success ? 'success' : 'error'],
      keywords: [toolName, success ? 'success' : 'error'],
      source: 'tool-execution'
    }
  });
}
```

**Conversation Summary** (Line 704-730):
```typescript
if (conversation.agent?.configuration?.memory?.enabled) {
  await this.memoryService.createMemory({
    agentId: conversation.agentId,
    sessionId: conversation.id,
    type: 'long-term',
    category: 'interaction',
    content: `${summary}\n\n${details}`,
    importance: result.toolsUsed.length > 0 ? 0.8 : 0.5,
    metadata: {
      tags: [model, 'ollama', 'react', 'conversation'],
      keywords: result.toolsUsed.length > 0 ? ['tool-usage', ...result.toolsUsed] : ['conversation'],
      source: 'conversation'
    }
  });
}
```

#### Memory Context Retrieval

**System Prompt Enhancement** (Line 919-954):
```typescript
// Add memory context if enabled
if (conversation.agent?.configuration?.memory?.enabled) {
  const memoryContext = await this.memoryService.getMemoryContext(
    conversation.agentId,
    conversation.id,
    userMessage
  );
  
  if (memoryContext.totalMemories > 0) {
    systemPrompt += `\n\n## Memory Context\n${memoryContext.summary}\n`;
    
    // Add recent interactions
    if (memoryContext.recentInteractions.length > 0) {
      systemPrompt += `\nRecent interactions:\n`;
      memoryContext.recentInteractions.slice(0, 3).forEach((interaction) => {
        systemPrompt += `- ${interaction.summary || interaction.content}\n`;
      });
    }
    
    // Add relevant lessons
    if (memoryContext.relevantLessons.length > 0) {
      systemPrompt += `\nLearned lessons:\n`;
      memoryContext.relevantLessons.slice(0, 3).forEach((lesson) => {
        systemPrompt += `- ${lesson.summary || lesson.content}\n`;
      });
    }
  }
}
```

**Usage Locations in Conversation Service**:
- Line 385: Create memory for simple interactions
- Line 711: Create memory for ReAct conversation summaries
- Line 923: Retrieve memory context for Ollama streaming
- Line 1492: Retrieve memory context for external LLM streaming
- Line 1883: Create memory for external LLM ReAct summaries
- Line 2272: Save tool execution memories
- Line 2301: Query memories for consolidation
- Line 2337: Create consolidated memories

---

### 2. Agent Service (Secondary) ✅

**File**: `backend/src/agents/agents.service.ts`

The agent service provides **additional** memory integration for direct agent interactions:
- Memory context retrieval for agent chat
- Interaction memory creation
- Agent-specific memory queries

#### Memory Context Retrieval

**Agent Chat Processing** (Line 286-301):
```typescript
// Get memory context for continuous learning
let memoryContext: any = null;
if (context.sessionId) {
  try {
    memoryContext = await this.memoryService.getMemoryContext(
      agentId,
      context.sessionId,
      message,
    );
    if (memoryContext) {
      this.logger.log(`Retrieved memory context: ${memoryContext.summary}`);
    }
  } catch (error: any) {
    this.logger.warn(`Failed to retrieve memory context: ${error.message}`);
  }
}
```

#### Memory Creation

**Interaction Storage** (Line 303-325):
```typescript
// Store interaction in short-term memory
if (context.sessionId) {
  try {
    await this.memoryService.createMemory({
      agentId,
      sessionId: context.sessionId,
      category: 'interaction',
      content: `User: ${message}`,
      importance: 0.5,
      metadata: {
        workspaceId: context.workspaceId,
        userId: context.userId,
        tags: ['chat', 'interaction'],
        keywords: this.extractKeywords(message),
        confidence: 0.8,
        relevance: 0.7,
        source: 'chat',
      },
    });
  } catch (error: any) {
    this.logger.warn(`Failed to store interaction in memory: ${error.message}`);
  }
}
```

**Usage Locations in Agent Service**:
- Line 290: Retrieve memory context for agent chat
- Line 306: Create memory for chat interactions

---

## Memory Flow Comparison

### Conversation Service Flow (Primary)

```
User Message
     ↓
Conversation Service
     ↓
Check: agent.configuration.memory.enabled
     ↓
[IF ENABLED]
     ↓
Retrieve Memory Context
     ↓
Enhance System Prompt with:
  - Recent interactions (last 3)
  - Relevant lessons (last 3)
  - Memory summary
     ↓
Execute ReAct Loop
     ↓
[FOR EACH TOOL]
     ↓
Save Tool Execution Memory
  - Type: long-term
  - Importance: 0.7 (success) or 0.9 (error)
  - Source: tool-execution
     ↓
Generate Agent Response
     ↓
Save Conversation Summary
  - Type: long-term
  - Importance: 0.8 (with tools) or 0.5 (without)
  - Source: conversation
```

### Agent Service Flow (Secondary)

```
User Message
     ↓
Agent Service (processChatWithAgent)
     ↓
Check: context.sessionId exists
     ↓
[IF EXISTS]
     ↓
Retrieve Memory Context
     ↓
Store User Interaction
  - Type: short-term (default)
  - Importance: 0.5
  - Source: chat
     ↓
Build Enhanced Context:
  - Knowledge Base (if enabled)
  - Project Context (if workspace)
  - Memory Context (if session)
     ↓
Execute Agent Logic
```

---

## Key Differences

### Conversation Service
- **Primary memory handler**
- Creates memories for **tool executions**
- Creates memories for **conversation summaries**
- Uses **long-term storage** (database)
- Higher importance scores (0.7-0.9)
- Triggered by **ReAct loop** and **tool usage**

### Agent Service
- **Secondary memory handler**
- Creates memories for **chat interactions**
- Uses **short-term storage** (default)
- Lower importance score (0.5)
- Triggered by **direct agent chat**
- More general-purpose

---

## Memory Context Usage

Both services retrieve memory context to enhance agent responses:

### What Memory Context Includes

```typescript
interface MemoryContext {
  summary: string;                    // Overall memory summary
  recentInteractions: Memory[];       // Last 3 interactions
  relevantLessons: Memory[];          // Last 3 lessons learned
  totalMemories: number;              // Total memory count
  averageImportance: number;          // Average importance score
}
```

### How It's Used

**In System Prompt**:
```
## Memory Context
Agent has 12 memories with average importance 0.76

Recent interactions:
- list_files: Success - Found 15 files
- read_file: Success - Read package.json
- write_file: Error - Permission denied

Learned lessons:
- System files require elevated permissions
- Always check file existence before reading
- Use relative paths for project files
```

This context helps the agent:
- Remember previous interactions
- Learn from past mistakes
- Provide more contextual responses
- Avoid repeating errors

---

## Configuration

### Agent Configuration

Memory is enabled per-agent in the agent configuration:

```json
{
  "memory": {
    "enabled": true,
    "shortTerm": {
      "enabled": true,
      "maxMessages": 50,
      "retentionHours": 24
    },
    "longTerm": {
      "enabled": true,
      "consolidationThreshold": 10,
      "importanceThreshold": 0.7
    }
  }
}
```

### Checking Memory Status

```sql
-- Check if agent has memory enabled
SELECT 
    id, 
    name, 
    configuration::jsonb->'memory'->'enabled' as memory_enabled
FROM agents 
WHERE id = 'your-agent-id';
```

---

## Memory Types by Service

### Conversation Service Creates:

| Memory Type | Source | Importance | Storage | Trigger |
|-------------|--------|------------|---------|---------|
| Tool Execution (Success) | tool-execution | 0.7 | Long-term | Tool called |
| Tool Execution (Error) | tool-execution | 0.9 | Long-term | Tool error |
| Conversation Summary | conversation | 0.8 | Long-term | After response |
| Simple Interaction | interaction | 0.5 | Long-term | No tools |

### Agent Service Creates:

| Memory Type | Source | Importance | Storage | Trigger |
|-------------|--------|------------|---------|---------|
| Chat Interaction | chat | 0.5 | Short-term | User message |

---

## When Memories Are Created

### Conversation Service (Primary)
✅ **Always creates memories when**:
- Tool is executed (success or error)
- Conversation completes with tool usage
- Agent configuration has memory enabled

❌ **Does NOT create memories when**:
- No tools are used
- Memory is disabled in agent config
- Simple fallback responses (Ollama unavailable)

### Agent Service (Secondary)
✅ **Always creates memories when**:
- User sends message
- Session ID is provided
- Agent processes chat

❌ **Does NOT create memories when**:
- No session ID provided
- Memory creation fails (logged as warning)

---

## Memory Retrieval

Both services retrieve memory context before generating responses:

### Conversation Service
```typescript
const memoryContext = await this.memoryService.getMemoryContext(
  conversation.agentId,
  conversation.id,      // Uses conversation ID as session
  userMessage
);
```

### Agent Service
```typescript
const memoryContext = await this.memoryService.getMemoryContext(
  agentId,
  context.sessionId,    // Uses provided session ID
  message
);
```

---

## Integration Summary

| Feature | Conversation Service | Agent Service |
|---------|---------------------|---------------|
| **Memory Creation** | ✅ Tool executions, summaries | ✅ Chat interactions |
| **Memory Retrieval** | ✅ For system prompts | ✅ For agent context |
| **Storage Type** | Long-term (database) | Short-term (default) |
| **Importance Scores** | 0.7-0.9 | 0.5 |
| **Triggered By** | Tool usage, ReAct loop | Direct chat |
| **Primary Use** | Conversation memory | Agent memory |

---

## Best Practices

### Use Conversation Service When:
- Building conversational agents
- Using tool execution (ReAct pattern)
- Need persistent memory across sessions
- Want high-importance memories

### Use Agent Service When:
- Building direct agent interactions
- Need lightweight memory
- Want session-specific context
- Building custom agent workflows

---

## Code References

### Conversation Service
- **File**: `backend/src/conversations/conversations.service.ts`
- **Memory Creation**: Lines 2256-2291 (tool), 704-730 (summary)
- **Memory Retrieval**: Lines 919-954, 1492-1520
- **Memory Context**: Used in system prompt enhancement

### Agent Service
- **File**: `backend/src/agents/agents.service.ts`
- **Memory Creation**: Lines 303-325
- **Memory Retrieval**: Lines 286-301
- **Memory Context**: Used in enhanced context building

### Memory Service
- **File**: `backend/src/memory/memory.service.ts`
- **Create Memory**: Line 27-40
- **Get Context**: Line 45-130
- **Query Memories**: Line 132-150

---

## Testing Memory Integration

### Test Conversation Service Memory
```bash
# 1. Enable memory for agent
# 2. Start conversation with tool usage
# 3. Ask: "List all files in the current directory"
# 4. Check database for memories

docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -c \
  "SELECT summary, importance, metadata->'source' FROM long_term_memories 
   WHERE \"agentId\" = 'your-agent-id' 
   ORDER BY \"createdAt\" DESC LIMIT 5;"
```

### Test Agent Service Memory
```bash
# 1. Call agent service directly
# 2. Provide sessionId in context
# 3. Check for interaction memory

# Note: Agent service memories are short-term by default
# Check short-term memory service for these
```

---

## Conclusion

**Memory is fully integrated into both services:**

✅ **Conversation Service** (Primary)
- Handles tool execution memories
- Creates conversation summaries
- Uses long-term storage
- Higher importance scores
- Primary memory system

✅ **Agent Service** (Secondary)
- Handles chat interaction memories
- Uses short-term storage
- Lower importance scores
- Supplementary memory system

Both services retrieve and use memory context to enhance agent responses, providing a comprehensive memory system across the entire application.
