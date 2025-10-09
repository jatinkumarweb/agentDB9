# Production-Ready Interfaces Documentation

## Overview

This document describes the production-ready interfaces and communication architecture for AgentDB9. All components now use standardized TypeScript interfaces for type safety and consistency across the entire stack.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  - Chat Interface                                            │
│  - Agent Management                                          │
│  - VSCode Integration                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │ WebSocket/RPC Bridge
                   │ (Real-time bidirectional communication)
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                    Backend (NestJS)                          │
│  - Agent Manager                                             │
│  - Conversation Manager                                      │
│  - WebSocket Bridge Service                                  │
│  - Authentication & Authorization                            │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                   LLM Service (Express)                      │
│  - Model Management                                          │
│  - Ollama Integration                                        │
│  - Streaming Support                                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                   MCP Server                                 │
│  - VSCode Tools                                              │
│  - File System Operations                                    │
│  - Git Operations                                            │
│  - Terminal Execution                                        │
└──────────────────────────────────────────────────────────────┘
```

## Core Interfaces

### 1. Agent Profile (`AgentProfile`)

**Location:** `shared/src/types/agent-profile.ts`

The `AgentProfile` interface extends the base `CodingAgent` with production-ready metadata, runtime state, and performance metrics.

```typescript
interface AgentProfile extends CodingAgent {
  profile: AgentProfileMetadata;
  runtime: AgentRuntimeState;
  metrics: AgentMetrics;
  enhancedCapabilities: EnhancedCapability[];
}
```

**Key Features:**
- **Metadata:** Display information, categorization, ownership, permissions
- **Runtime State:** Current status, active tasks, resource usage, health checks
- **Metrics:** Usage statistics, performance metrics, quality metrics, error tracking
- **Enhanced Capabilities:** Detailed capability configuration with performance tracking

**Usage Example:**
```typescript
import { AgentProfile, AgentManager } from '@agentdb9/shared';

const agentManager: AgentManager = // ... get instance
const profile = await agentManager.getProfile(agentId);

console.log(`Agent: ${profile.name}`);
console.log(`Status: ${profile.runtime.status}`);
console.log(`Success Rate: ${profile.metrics.performance.successRate}%`);
```

### 2. Agent Context (`AgentContext`)

**Location:** `shared/src/types/context.ts`

The `AgentContext` provides session and project awareness for agent execution. It includes short-term memory (conversation history) and long-term memory (project knowledge).

```typescript
interface AgentContext {
  sessionId: string;
  userId: string;
  conversationId?: string;
  agent: CodingAgent;
  project?: Project;
  workspace: WorkspaceInfo;
  vscode: VSCodeContext;
  metadata: AgentContextMetadata;
  conversationHistory: ConversationHistoryEntry[];
  projectKnowledge?: ProjectKnowledge;
}
```

**Key Features:**
- **Session Management:** Unique session tracking per user
- **Conversation History:** Short-term memory with token counting
- **Project Knowledge:** Long-term memory with code patterns and conventions
- **Resource Limits:** Configurable limits for tokens, file size, timeouts
- **Feature Flags:** Enable/disable capabilities per context

**Usage Example:**
```typescript
import { AgentContext, AgentContextManager } from '@agentdb9/shared';

const contextManager: AgentContextManager = // ... get instance
const context = await contextManager.createContext({
  userId: user.id,
  agent: agent,
  conversationId: conversation.id,
});

// Add to conversation history
await contextManager.addToHistory(context.sessionId, {
  id: generateId(),
  role: 'user',
  content: 'Create a new React component',
  timestamp: new Date(),
});
```

### 3. Conversation Manager (`ConversationManager`)

**Location:** `shared/src/types/conversation-manager.ts`

The `ConversationManager` handles short-term memory storage, message streaming, and real-time updates.

```typescript
interface ConversationManager {
  // Conversation lifecycle
  createConversation(params: CreateConversationParams): Promise<AgentConversation>;
  getConversation(conversationId: string): Promise<AgentConversation | null>;
  
  // Message management
  addMessage(conversationId: string, message: CreateMessageParams): Promise<ConversationMessage>;
  streamMessage(conversationId: string, message: CreateMessageParams): AsyncGenerator<MessageChunk>;
  stopStreaming(conversationId: string, messageId: string): Promise<void>;
  
  // Real-time updates
  subscribeToConversation(conversationId: string, callback: ConversationUpdateCallback): () => void;
}
```

**Key Features:**
- **Message Streaming:** Real-time token-by-token streaming
- **History Management:** Efficient retrieval and pruning
- **Search:** Full-text search across messages
- **Analytics:** Conversation metrics and insights
- **Caching:** Performance optimization with TTL

**Usage Example:**
```typescript
import { ConversationManager } from '@agentdb9/shared';

const conversationManager: ConversationManager = // ... get instance

// Create conversation
const conversation = await conversationManager.createConversation({
  agentId: agent.id,
  userId: user.id,
  title: 'New Project Setup',
});

// Stream message
const stream = conversationManager.streamMessage(conversation.id, {
  role: 'user',
  content: 'Help me set up a new React project',
});

for await (const chunk of stream) {
  console.log(chunk.delta); // Print each token as it arrives
  if (chunk.isComplete) break;
}
```

### 4. WebSocket Bridge (`WebSocketBridge`)

**Location:** `shared/src/types/websocket-bridge.ts`

The `WebSocketBridge` provides real-time bidirectional communication between VSCode and the backend using both event-based messaging and RPC-style request/response.

```typescript
interface WebSocketBridge {
  // Connection management
  connect(url: string, options?: ConnectionOptions): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Event-based messaging
  emit(event: string, data: any): void;
  on(event: string, handler: EventHandler): () => void;
  
  // RPC-style request/response
  request<T>(method: string, params?: any, timeout?: number): Promise<T>;
  
  // Subscription management
  subscribe(channel: string, handler: SubscriptionHandler): () => void;
}
```

**Key Features:**
- **Dual Protocol:** Supports both events and RPC
- **Automatic Reconnection:** Configurable retry logic
- **Room Management:** Broadcast to specific groups
- **Message Queue:** Reliable delivery with retry
- **Type Safety:** Strongly typed events and methods

**Usage Example:**
```typescript
import { WebSocketBridge, AgentEventType, AgentRPCMethod } from '@agentdb9/shared';

const bridge: WebSocketBridge = // ... get instance

// Connect
await bridge.connect('ws://localhost:8000', {
  auth: { token: authToken },
  reconnect: true,
});

// Subscribe to events
bridge.on(AgentEventType.MESSAGE_STREAMING, (event) => {
  console.log('Streaming:', event.data.content);
});

// Make RPC call
const agents = await bridge.request(AgentRPCMethod.LIST_AGENTS, {
  userId: user.id,
});
```

## Standard Event Types

### Agent Events
- `AGENT_STATUS_UPDATE` - Agent status changed
- `AGENT_STARTED` - Agent started
- `AGENT_STOPPED` - Agent stopped
- `AGENT_ERROR` - Agent encountered an error

### Task Events
- `TASK_STARTED` - Task execution started
- `TASK_PROGRESS` - Task progress update
- `TASK_COMPLETED` - Task completed successfully
- `TASK_FAILED` - Task failed
- `TASK_CANCELLED` - Task was cancelled

### Message Events
- `MESSAGE_CREATED` - New message created
- `MESSAGE_UPDATED` - Message updated
- `MESSAGE_STREAMING` - Message streaming chunk
- `MESSAGE_COMPLETED` - Message streaming completed
- `MESSAGE_STOPPED` - Message streaming stopped

### Tool Events
- `TOOL_STARTED` - Tool execution started
- `TOOL_PROGRESS` - Tool execution progress
- `TOOL_COMPLETED` - Tool execution completed
- `TOOL_FAILED` - Tool execution failed

### File Events
- `FILE_CREATED` - File created
- `FILE_UPDATED` - File updated
- `FILE_DELETED` - File deleted
- `FILE_RENAMED` - File renamed

## Standard RPC Methods

### Agent Management
- `agent.create` - Create new agent
- `agent.get` - Get agent by ID
- `agent.update` - Update agent
- `agent.delete` - Delete agent
- `agent.list` - List all agents
- `agent.start` - Start agent
- `agent.stop` - Stop agent

### Conversation Management
- `conversation.create` - Create conversation
- `conversation.get` - Get conversation
- `conversation.update` - Update conversation
- `conversation.delete` - Delete conversation
- `conversation.list` - List conversations

### Message Management
- `message.send` - Send message
- `message.list` - Get messages
- `message.stop` - Stop generation

### Tool Execution
- `tool.execute` - Execute tool
- `tool.list` - List available tools
- `tool.info` - Get tool information

## Schema Validation

All data types include runtime validation using the schema system in `shared/src/schemas/`.

### Available Schemas

1. **Agent Schema** (`agent.schema.ts`)
   - `AgentConfigurationSchema`
   - `AgentCapabilitySchema`
   - `CreateAgentSchema`
   - `UpdateAgentSchema`

2. **Conversation Schema** (`conversation.schema.ts`)
   - `CreateConversationSchema`
   - `UpdateConversationSchema`

3. **Message Schema** (`message.schema.ts`)
   - `CreateMessageSchema`
   - `UpdateMessageSchema`
   - `MessageMetadataSchema`

4. **Task Schema** (`task.schema.ts`)
   - `CreateTaskSchema`
   - `UpdateTaskSchema`

### Validation Example

```typescript
import { validate, CreateAgentSchema, assertValid } from '@agentdb9/shared';

const data = {
  name: 'My Agent',
  configuration: {
    llmProvider: 'ollama',
    model: 'qwen2.5-coder:7b',
    temperature: 0.3,
    maxTokens: 2048,
    // ... other config
  },
};

const result = validate(data, CreateAgentSchema);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
} else {
  // Data is valid, proceed
}

// Or use assertValid to throw on error
assertValid(result);
```

## Data Transformers

The `transformers.ts` module provides utilities for data conversion and normalization:

```typescript
import {
  toDate,
  toBoolean,
  toNumber,
  parseJSON,
  deepClone,
  deepMerge,
  formatBytes,
  formatDuration,
} from '@agentdb9/shared';

// Convert string to date
const date = toDate('2024-01-01');

// Parse JSON safely
const config = parseJSON<AgentConfiguration>(jsonString, defaultConfig);

// Deep merge objects
const merged = deepMerge(defaultConfig, userConfig);

// Format bytes
console.log(formatBytes(1024 * 1024)); // "1 MB"

// Format duration
console.log(formatDuration(5000)); // "5.0s"
```

## Integration Guide

### Backend Integration

1. **Import shared types:**
```typescript
import {
  AgentProfile,
  AgentContext,
  ConversationManager,
  WebSocketBridgeService,
} from '@agentdb9/shared';
```

2. **Initialize WebSocket Bridge:**
```typescript
@Injectable()
export class AppService {
  constructor(
    private readonly wsBridge: WebSocketBridgeService,
    private readonly agentService: AgentsService,
    private readonly conversationService: ConversationsService,
  ) {
    // Register RPC methods
    this.wsBridge.registerStandardMethods({
      agentService: this.agentService,
      conversationService: this.conversationService,
    });
  }
}
```

### Frontend Integration

1. **Import shared types:**
```typescript
import {
  AgentProfile,
  ConversationMessage,
  WebSocketBridge,
  AgentEventType,
} from '@agentdb9/shared';
```

2. **Use WebSocket hook:**
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function ChatComponent() {
  const { isConnected, emit, on } = useWebSocket();
  
  useEffect(() => {
    const unsubscribe = on(AgentEventType.MESSAGE_STREAMING, (event) => {
      // Handle streaming message
    });
    
    return unsubscribe;
  }, [on]);
}
```

### LLM Service Integration

1. **Import shared types:**
```typescript
import { LLMRequest, LLMResponse, ModelConfig } from '@agentdb9/shared';
```

2. **Implement standard endpoints:**
```typescript
app.post('/api/generate', async (req, res) => {
  const request: LLMRequest = req.body;
  // Process request
  const response: LLMResponse = {
    content: generatedText,
    usage: tokenUsage,
    modelId: request.modelId,
  };
  res.json({ success: true, data: response });
});
```

## Testing

All interfaces include type guards and validators for testing:

```typescript
import {
  isAgentConfiguration,
  isAgentStatus,
  isMessage,
  validateAgent,
} from '@agentdb9/shared';

describe('Agent Validation', () => {
  it('should validate agent configuration', () => {
    const config = { /* ... */ };
    expect(isAgentConfiguration(config)).toBe(true);
  });
  
  it('should validate message', () => {
    const message = { /* ... */ };
    expect(isMessage(message)).toBe(true);
  });
});
```

## Performance Considerations

1. **Caching:** Use `ConversationCache` for frequently accessed conversations
2. **Batch Updates:** WebSocket bridge batches updates to reduce overhead
3. **Streaming:** Use streaming for long-running operations
4. **Connection Pooling:** WebSocket connections are reused
5. **Message Queue:** Reliable delivery with retry logic

## Security

1. **Authentication:** All WebSocket connections require authentication
2. **Authorization:** Agent permissions control file system access
3. **Validation:** All inputs are validated against schemas
4. **Sanitization:** User inputs are sanitized before processing
5. **Rate Limiting:** Built-in rate limiting for API calls

## Monitoring

Track these metrics for production readiness:

1. **Agent Metrics:**
   - Success rate
   - Average response time
   - Token usage
   - Error rate

2. **Conversation Metrics:**
   - Active conversations
   - Message throughput
   - Streaming performance

3. **WebSocket Metrics:**
   - Connection count
   - Message latency
   - Reconnection rate
   - Error rate

## Next Steps

1. ✅ Standard interfaces defined
2. ✅ WebSocket/RPC bridge implemented
3. ✅ Shared schema package created
4. ✅ Integration across all layers
5. ✅ Documentation completed

### Recommended Enhancements

1. **Add unit tests** for all interfaces
2. **Implement integration tests** for WebSocket bridge
3. **Add performance benchmarks** for critical paths
4. **Create migration guide** for existing code
5. **Add OpenAPI/Swagger** documentation for REST endpoints
6. **Implement monitoring dashboards** for production metrics

## Support

For questions or issues:
- Check the inline documentation in type files
- Review the schema validators
- Examine the usage examples in this document
- Refer to the integration tests (when available)
