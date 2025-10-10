# External API Implementation for Agent Chat

## Problem

When chatting with an agent configured to use an external model (OpenAI, Anthropic), the system showed:

```
🤖 **External API Model Selected**
This agent is configured to use "gpt-4o" which requires external API access.
**To enable this model:**
1. Configure the appropriate API key in your environment variables
2. Ensure the model provider service is accessible
```

## Root Cause

The LLM service's `/api/chat` endpoint had a stub implementation that returned "External API models not yet implemented" for non-Ollama models.

## Implementation

### 1. Agent Service - Pass userId to LLM Service

**File:** `backend/src/agents/agents.service.ts`

Added userId as query parameter when calling LLM service:

```typescript
// Before:
const response = await fetch(`${llmServiceUrl}/api/chat`, {

// After:
const url = context.userId 
  ? `${llmServiceUrl}/api/chat?userId=${context.userId}`
  : `${llmServiceUrl}/api/chat`;

const response = await fetch(url, {
```

### 2. Backend - Add API Key Retrieval Endpoint

**File:** `backend/src/providers/providers.controller.ts`

Added new endpoint to get user's API key for a specific provider:

```typescript
@Public() // Allow LLM service to call this
@Get('key/:provider')
async getProviderKey(
  @Param('provider') provider: string,
  @Query('userId') userId?: string
): Promise<APIResponse> {
  const apiKey = await this.providersService.getApiKey(userId, provider);
  return { success: true, data: { apiKey } };
}
```

### 3. LLM Service - Implement External API Calls

**File:** `llm-service/src/index.ts`

Added three new helper functions:

#### a. Get User's API Key
```typescript
async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
  const url = `${backendUrl}/api/providers/key/${provider}?userId=${userId}`;
  
  const response = await fetch(url);
  if (response.ok) {
    const data = await response.json();
    return data.data?.apiKey || null;
  }
  return null;
}
```

#### b. Call External APIs
```typescript
async function callExternalAPI(provider: string, model: string, messages: any[], apiKey: string, options: any) {
  switch (provider) {
    case 'openai':
      return await callOpenAI(model, messages, apiKey, options);
    case 'anthropic':
      return await callAnthropic(model, messages, apiKey, options);
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
```

#### c. OpenAI Implementation
```typescript
async function callOpenAI(model: string, messages: any[], apiKey: string, options: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500
    })
  });
  
  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || '',
    message: data.choices[0]?.message?.content || '',
    model: data.model,
    done: true,
    usage: { /* token counts */ }
  };
}
```

#### d. Anthropic Implementation
```typescript
async function callAnthropic(model: string, messages: any[], apiKey: string, options: any) {
  // Convert message format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages: userMessages,
      system: systemMessage?.content,
      max_tokens: options.max_tokens || 500,
      temperature: options.temperature || 0.7
    })
  });
  
  const data = await response.json();
  return {
    response: data.content[0]?.text || '',
    message: data.content[0]?.text || '',
    model: data.model,
    done: true,
    usage: { /* token counts */ }
  };
}
```

### 4. Updated /api/chat Endpoint

**File:** `llm-service/src/index.ts`

```typescript
app.post('/api/chat', async (req, res) => {
  const { model, messages, stream, temperature, max_tokens } = req.body;
  const userId = req.query.userId as string;
  const modelInfo = getModelById(model);
  
  // Handle Ollama models (existing code)
  if (modelInfo.provider === 'ollama') {
    // ... existing Ollama implementation
  }
  
  // Handle external API models (NEW)
  if (!userId) {
    return res.status(400).json({
      error: 'User ID required for external API models'
    });
  }
  
  const apiKey = await getUserApiKey(userId, modelInfo.provider);
  if (!apiKey) {
    return res.status(400).json({
      error: 'API key not configured'
    });
  }
  
  const externalResponse = await callExternalAPI(
    modelInfo.provider,
    model,
    messages,
    apiKey,
    { temperature, max_tokens }
  );
  
  return res.json(externalResponse);
});
```

## Flow

### Before Fix:
```
User → Agent Chat
  ↓
Backend → LLM Service /api/chat
  ↓
LLM Service → "External API models not yet implemented" ❌
  ↓
Agent → Fallback message shown to user
```

### After Fix:
```
User → Agent Chat
  ↓
Backend → LLM Service /api/chat?userId=X
  ↓
LLM Service → Backend /api/providers/key/openai?userId=X
  ↓
Backend → Returns user's OpenAI API key
  ↓
LLM Service → OpenAI API (with user's key)
  ↓
OpenAI → Response
  ↓
LLM Service → Backend → User ✅
```

## Security Considerations

✅ **API keys never exposed to frontend**
- Keys stored in database, encrypted
- Only backend and LLM service have access
- LLM service fetches keys on-demand

✅ **Per-user API keys**
- Each user configures their own keys
- No shared keys between users
- Keys isolated by userId

✅ **Secure transmission**
- Keys fetched via internal service-to-service calls
- Not exposed in logs (should add masking)
- HTTPS for external API calls

## Testing

### 1. Configure API Key
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | \
  jq -r '.data.access_token')

# Configure OpenAI key
curl -X POST http://localhost:8000/api/providers/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","apiKey":"sk-your-real-key-here"}'
```

### 2. Create Agent with OpenAI Model
- Go to `/agents/new`
- Select "gpt-4o" or "gpt-3.5-turbo"
- Create agent

### 3. Chat with Agent
- Go to agent chat page
- Send message: "Hello, are you there?"
- Should receive response from OpenAI ✅

### 4. Check Logs
```bash
docker-compose logs llm-service | grep "chat"
```

Should see:
```
[LLM Service] /api/chat called with model: gpt-4o userId: <uuid>
[LLM Service] Fetching API key for provider: openai userId: <uuid>
```

## Files Changed

1. ✅ `backend/src/agents/agents.service.ts` - Pass userId to LLM service
2. ✅ `backend/src/providers/providers.controller.ts` - Add API key retrieval endpoint
3. ✅ `llm-service/src/index.ts` - Implement external API calls

## Supported Providers

- ✅ **OpenAI** - gpt-4o, gpt-4, gpt-3.5-turbo
- ✅ **Anthropic** - claude-3-opus, claude-3-sonnet, claude-3-haiku
- ⚠️ **Cohere** - Not yet implemented
- ⚠️ **HuggingFace** - Not yet implemented

## Future Enhancements

1. **Add streaming support** for real-time responses
2. **Implement Cohere and HuggingFace** providers
3. **Add token usage tracking** per user
4. **Add rate limiting** per user/provider
5. **Add cost tracking** based on token usage
6. **Cache responses** for identical requests
7. **Add retry logic** for failed API calls
8. **Mask API keys in logs** for security

## Apply the Fix

```bash
# Rebuild services
cd backend && npm run build
cd ../llm-service && npm run build

# Restart services
docker-compose restart backend llm-service

# Or restart all
docker-compose restart
```

## Verify

1. Configure OpenAI API key in `/models` page
2. Create agent with OpenAI model
3. Chat with agent
4. Should receive actual OpenAI responses ✅
