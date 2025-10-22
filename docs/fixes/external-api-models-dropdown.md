# Fix: External API Models Not Showing in Create Agent Dropdown

## Issue
External API models (OpenAI, Anthropic, etc.) were configured with API keys and showing in the `/models` page, but were not appearing in the create agent dropdown.

## Root Cause
The LLM service (`llm-service/src/index.ts`) was returning `status: 'unknown'` for external API models when their API keys were configured, instead of `status: 'available'`.

### Code Location
File: `llm-service/src/index.ts`, line 358

**Before (incorrect):**
```typescript
status: requiresApiKey && !apiKeyConfigured ? 'disabled' : 'unknown',
```

**After (fixed):**
```typescript
status: requiresApiKey && !apiKeyConfigured ? 'disabled' : 'available',
```

## Impact
- External API models with configured keys now show `status: 'available'`
- These models now appear in the create agent dropdown
- The `/models` page continues to work correctly
- ModelSelector filtering logic works as expected

## Model Status Logic

### Ollama Models
- `status: 'available'` - Model is downloaded and ready to use
- `status: 'unavailable'` - Model is not downloaded (can be downloaded from /models page)

### External API Models (OpenAI, Anthropic, etc.)
- `status: 'available'` - API key is configured, model is ready to use
- `status: 'disabled'` - API key is NOT configured (needs configuration)

## ModelSelector Filtering
The `ModelSelector` component filters models for the create agent dropdown:

```typescript
const availableModels = filteredModels.filter(m => 
  m && (
    // Ollama: Only show downloaded models
    (m.provider === 'ollama' && m.status === 'available') ||
    
    // External APIs: Show if status is 'available' OR if key is configured
    (m.provider !== 'ollama' && (
      m.status === 'available' ||
      (m.status === 'unknown' && (!m.requiresApiKey || m.apiKeyConfigured)) ||
      (m.requiresApiKey && m.apiKeyConfigured)
    ))
  )
);
```

The filtering logic handles both:
1. New behavior: `status: 'available'` when key is configured
2. Backward compatibility: `status: 'unknown'` with `apiKeyConfigured: true`

## Testing
Created test suite: `llm-service/src/__tests__/models-api.test.ts`

Tests verify:
1. ✅ External API models return `status: 'available'` when API key is configured
2. ✅ External API models return `status: 'disabled'` when API key is NOT configured
3. ✅ Ollama models return `status: 'available'` only when downloaded
4. ✅ ModelSelector filtering includes external API models with configured keys
5. ✅ Backward compatibility with `status: 'unknown'`

All tests pass.

## Files Changed
1. `llm-service/src/index.ts` - Fixed status logic (line 358)
2. `llm-service/src/__tests__/models-api.test.ts` - Added test suite
3. `llm-service/tsconfig.json` - Excluded test files from build

## Verification Steps
1. Configure an external API key (OpenAI, Anthropic, etc.) in `/models` page
2. Navigate to create agent flow
3. Select the external API provider from dropdown
4. Verify external API models appear in the model dropdown
5. Verify models show with ✅ icon indicating they're available
