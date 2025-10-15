# Architecture Clarification: Services and Modes

## Service Responsibilities

### ConversationsService (`/api/conversations`)
**Purpose:** Manages conversation threads and messages

**Responsibilities:**
- Create/read/update/delete conversations
- Add messages to conversations
- Generate agent responses to user messages
- Maintain conversation history
- Handle both workspace chat and regular chat

**Response Modes:**
- **ReAct Mode**: Multi-step reasoning with tool execution (when `shouldUseReAct()` returns true)
- **Streaming Mode**: Direct LLM streaming response (when `shouldUseReAct()` returns false)

**Key Point:** Both modes are available in ConversationsService. The choice depends on the user's message content, NOT on which service is being used.

### AgentsService (`/api/agents`)
**Purpose:** Manages agent entities and direct task execution

**Responsibilities:**
- Create/read/update/delete agents
- Execute tasks with specific agents
- Process chat messages with agent context
- Manage agent status (idle, coding, error)

**Response Modes:**
- Can also use ReAct mode for task execution
- Can use streaming for chat responses

## Common Misconception ❌

**WRONG:** 
- "ConversationsService is for chat, AgentsService is for execution"
- "Streaming is for conversations, non-streaming is for agents"
- "Project context only applies to AgentsService"

**CORRECT:** ✅
- Both services can execute tasks and handle chat
- Both services can use ReAct mode or streaming mode
- Streaming vs non-streaming is about response delivery, not service type
- Project context applies to conversations (both workspace and regular chat)

## Response Mode Selection

### When ReAct Mode is Used:
```typescript
private shouldUseReAct(userMessage: string): boolean {
  // Checks if message contains keywords indicating tool usage needed
  const keywords = [
    'create a', 'build a', 'modify the', 'update the',
    'read the file', 'list files', 'run the', 'install', ...
  ];
  return keywords.some(keyword => message.includes(keyword));
}
```

**ReAct Mode Flow:**
1. User message → `shouldUseReAct()` → true
2. Call `buildSystemPrompt()` → includes project context
3. Execute ReAct loop (Reason → Act → Observe)
4. Use MCP tools with working directory
5. Return final answer

### When Streaming Mode is Used:
```typescript
// If shouldUseReAct() returns false
await this.callOllamaAPIStreaming(userMessage, model, conversation);
```

**Streaming Mode Flow:**
1. User message → `shouldUseReAct()` → false
2. Build messages array (system + history + user)
3. Stream response from LLM
4. No tool execution
5. Return streamed response

## Project Context Flow

### Where Project Context is Added:
```typescript
// In ConversationsService.buildSystemPrompt()
if (conversation?.projectId) {
  const project = await this.projectsRepository.findOne({ 
    where: { id: conversation.projectId } 
  });
  if (project) {
    systemPrompt += `\n\n## Current Project Context\n`;
    systemPrompt += `- Project Name: ${project.name}\n`;
    systemPrompt += `- Project Directory: ${project.localPath}\n`;
    // ... more context
  }
}
```

### When Project Context is Used:
- ✅ Workspace chat with projectId + ReAct mode triggered
- ❌ Workspace chat with projectId + ReAct mode NOT triggered (streaming mode)
- ❌ Regular chat without projectId (regardless of mode)

**This is why the issue occurred:**
1. User said "create a React app"
2. `shouldUseReAct()` didn't match keywords
3. Used streaming mode
4. `buildSystemPrompt()` was never called
5. No project context was added
6. LLM used default behavior

## Correct Understanding

### ConversationsService:
```
User Message
    ↓
shouldUseReAct()?
    ↓
  YES → ReAct Mode
    ↓
  buildSystemPrompt() ← Project context added here
    ↓
  ReAct Loop
    ↓
  MCP Tools (with working directory)
    ↓
  Final Answer

  NO → Streaming Mode
    ↓
  Build messages (system + history + user)
    ↓
  Stream from LLM
    ↓
  No tools, no project context
```

### AgentsService:
```
Task Execution
    ↓
executeTask()
    ↓
Can use ReAct mode or direct execution
    ↓
Similar flow to ConversationsService
```

## Key Takeaways

1. **Both services can use ReAct mode**
   - Not exclusive to one service

2. **Streaming vs non-streaming is about response delivery**
   - Not about which service is used
   - Both are fallback options for each other

3. **Project context is added in buildSystemPrompt()**
   - Only called in ReAct mode
   - Not called in streaming mode

4. **shouldUseReAct() determines the mode**
   - Based on message content keywords
   - Not based on which service is handling the request

5. **The fix was to ensure ReAct mode triggers**
   - Added more keywords to `shouldUseReAct()`
   - Now "create a React app" triggers ReAct mode
   - ReAct mode calls `buildSystemPrompt()`
   - Project context is included

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Request                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                    ┌────────▼────────┐
│ Conversations  │                    │     Agents      │
│   Service      │                    │    Service      │
│                │                    │                 │
│ - Manage chats │                    │ - Manage agents │
│ - Add messages │                    │ - Execute tasks │
│ - Generate     │                    │ - Process chat  │
│   responses    │                    │                 │
└────────┬───────┘                    └────────┬────────┘
         │                                     │
         └──────────┬──────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │  shouldUseReAct()?   │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    ┌────▼─────┐         ┌────▼────────┐
    │  ReAct   │         │  Streaming  │
    │   Mode   │         │    Mode     │
    │          │         │             │
    │ - Build  │         │ - Build     │
    │   system │         │   messages  │
    │   prompt │         │ - Stream    │
    │ - Add    │         │   response  │
    │   project│         │ - No tools  │
    │   context│         │             │
    │ - Execute│         │             │
    │   tools  │         │             │
    └──────────┘         └─────────────┘
```

## Conclusion

The architecture is simpler than initially thought:
- Services are separated by domain (conversations vs agents)
- Both can use ReAct or streaming modes
- Mode selection is based on message content
- Project context is only added in ReAct mode via buildSystemPrompt()

The fix ensures that common phrases like "create a React app" trigger ReAct mode, which then includes project context in the system prompt.
