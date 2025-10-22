# Fix: External API Models Tool Execution in Workspace Chat

## Issue
When using external API models (OpenAI, Anthropic, etc.) in the workspace chat (`/workspace`), the agent would execute a tool (like `list_files`) and then stop, never continuing the conversation or providing a final answer to the user's prompt.

Example behavior:
```
User: "What files are in the workspace?"
Agent: **Tool Executed: list_files**
```json
{
  "files": ["App.css", "App.jsx", "index.css", "main.jsx"],
  "directories": ["assets", "components"],
  "directory": "src",
  "total": 6
}
```
[Agent stops here - no follow-up response]
```

## Root Cause
The workspace chat was using a streaming endpoint that:
1. ✅ Sent the prompt to the LLM with tool calling instructions
2. ✅ Received a tool call from the LLM
3. ✅ Executed the tool and appended results to the message
4. ❌ **Did not send the tool results back to the LLM for a follow-up response**

This is different from the ReAct agent loop which iterates: Reason → Act → Observe → Repeat.

The streaming endpoint had no mechanism to continue the conversation after tool execution.

## Solution
Modified the ReAct agent service to support external API models by:

1. **Detecting external API models** in the `callLLM` method
2. **Routing to LLM service** instead of calling Ollama directly
3. **Passing userId** to enable API key lookup for external providers
4. **Implementing external API support** in the LLM service's `/api/generate` endpoint

This allows external API models to use the full ReAct loop with tool execution iterations.

## Changes Made

### 1. ReAct Agent Service (`backend/src/conversations/react-agent.service.ts`)

**Added external API model detection:**
```typescript
const isExternalModel = !model.includes('llama') && 
                       !model.includes('mistral') && 
                       !model.includes('codellama') &&
                       // ... other Ollama models
```

**Route external models to LLM service:**
```typescript
if (isExternalModel) {
  const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://llm-service:9000';
  const url = `${llmServiceUrl}/api/generate?userId=${userId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      modelId: model,
      messages: messages,
      temperature: 0.3,
      maxTokens: 1024
    })
  });
  // ...
}
```

**Added userId parameter:**
- `executeReActLoop(..., userId?: string)`
- `generateTaskPlan(..., userId?: string)`
- `callLLM(..., userId?: string)`

### 2. LLM Service (`llm-service/src/index.ts`)

**Implemented external API support in `/api/generate`:**
```typescript
// Get user's API key for this provider
const apiKey = await getUserApiKey(userId, model.provider);

// Build messages array
const messages = request.messages || [
  { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
  { role: 'user', content: request.prompt }
];

// Call external API
const result = await callExternalAPI(
  model.provider,
  model.id,
  messages,
  apiKey,
  {
    temperature: request.temperature || 0.7,
    max_tokens: request.maxTokens || 1024
  }
);
```

### 3. Shared Types (`shared/src/types/index.ts`)

**Added messages field to LLMRequest:**
```typescript
export interface LLMRequest {
  // ... existing fields
  messages?: Array<{ role: string; content: string }>; // For multi-turn conversations
}
```

### 4. Conversations Service (`backend/src/conversations/conversations.service.ts`)

**Pass userId to ReAct agent:**
```typescript
const result = await this.reactAgentService.executeReActLoop(
  // ... other parameters
  conversation.userId // Pass userId for external API models
);
```

## How It Works Now

### For Ollama Models (Local)
1. ReAct agent calls Ollama directly via `/api/chat`
2. Iterates through Reason → Act → Observe loop
3. Executes tools and continues until final answer

### For External API Models (OpenAI, Anthropic, etc.)
1. ReAct agent detects external model
2. Calls LLM service `/api/generate?userId=...`
3. LLM service fetches user's API key from backend
4. LLM service calls external API (OpenAI, Anthropic, etc.)
5. Returns response to ReAct agent
6. ReAct agent continues iteration loop
7. Executes tools and sends results back to LLM
8. Continues until final answer

## Complete Flow Example

```
User: "What files are in the workspace?"

Iteration 1:
  Thought: "I need to list the files"
  Action: list_files
  Observation: {"files": ["App.jsx", ...], "total": 6}

Iteration 2:
  Thought: "I have the file list, now I can answer"
  Answer: "The workspace contains 6 items: 4 files (App.css, App.jsx, 
          index.css, main.jsx) and 2 directories (assets, components)."
```

## Files Changed
1. `backend/src/conversations/react-agent.service.ts` - Added external API support
2. `llm-service/src/index.ts` - Implemented external API in /api/generate
3. `shared/src/types/index.ts` - Added messages field to LLMRequest
4. `backend/src/conversations/conversations.service.ts` - Pass userId to ReAct agent

## Testing
1. Configure an external API key (OpenAI or Anthropic) in `/models` page
2. Create an agent with an external API model
3. Navigate to `/workspace` and select the agent
4. Ask: "What files are in the workspace?"
5. Verify: Agent executes `list_files` AND provides a complete answer
6. Ask: "Create a React component called Button.jsx"
7. Verify: Agent executes `write_file` AND confirms completion

## Benefits
- ✅ External API models now work properly in workspace chat
- ✅ Full ReAct loop with tool execution iterations
- ✅ Consistent behavior between Ollama and external API models
- ✅ Proper tool result handling and follow-up responses
- ✅ No more "tool executed and stopped" issues
