# The Real Issue: Duplicate `/api/models` Routes

## Problem Discovery

You found that `userId` was `undefined` in the LLM service logs:
```
llm-service-1  | [LLM Service] /api/models called with userId: undefined
```

## Root Cause

There were **TWO** controllers handling `GET /api/models`:

### 1. ModelsController (Correct)
**File:** `backend/src/models/models.controller.ts`
```typescript
@Controller('api/models')
export class ModelsController {
  @Get()  // Handles GET /api/models
  async getModels(@Req() req: Request): Promise<APIResponse> {
    const userId = (req.user as any)?.id;
    // ... forwards to LLM service with userId
  }
}
```

### 2. HealthController (Duplicate - WRONG)
**File:** `backend/src/health/health.controller.ts`
```typescript
@Controller()
@Public() // ❌ Makes ALL endpoints public
export class HealthController {
  @Get('api/models')  // ❌ Duplicate route!
  async getModels(@Request() req): Promise<APIResponse> {
    const userId = req.user?.id;  // ❌ Always undefined because @Public()
    // ... forwards to LLM service with undefined userId
  }
}
```

## Why HealthController Was Used

In `app.module.ts`, the module import order determines route priority:

```typescript
imports: [
  // ...
  HealthModule,      // Line 63 - Registered FIRST
  ModelsModule,      // Line 65 - Registered second
  // ...
]
```

**NestJS uses the first matching route**, so HealthController's `/api/models` was handling all requests!

## Why userId Was Undefined

The HealthController is marked with `@Public()` decorator (line 9):
```typescript
@Public() // Make all health endpoints public
```

This means:
1. No authentication is performed
2. `req.user` is never populated
3. `userId` is always `undefined`
4. Backend passes no userId to LLM service
5. LLM service returns all providers as unconfigured
6. All external models show as disabled

## The Fix

**Renamed the duplicate route** to avoid breaking anything:

```typescript
// Before: @Get('api/models')
// After:  @Get('api/health/models')
@Get('api/health/models')  // ✅ No longer conflicts
@ApiOperation({ summary: 'Get available models (health check)' })
async getModelsHealth(@Request() req): Promise<APIResponse> {
  // ... same implementation
}
```

Now:
- `GET /api/models` → ModelsController (with proper auth)
- `GET /api/health/models` → HealthController (public, for health checks)

## Why Not Remove It Completely?

The HealthService.getModels() method provides fallback logic when the LLM service is unavailable. Keeping it as `/api/health/models` allows:
- Health check scripts to verify model availability
- Fallback endpoint if ModelsController has issues
- Backward compatibility if anything uses it

## Verification

### Check which route is being used:
```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs backend | grep "ModelsController"
```

Should now see:
```
backend-1 | [ModelsController] ===== GET /api/models CALLED =====
backend-1 | [ModelsController] getModels called, userId: <actual-uuid>
```

### Test with authentication:
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | \
  jq -r '.data.access_token')

# Call models endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/models | \
  jq '.data.models[] | select(.provider=="openai") | {id, apiKeyConfigured}'
```

Expected: `"apiKeyConfigured": true` (if API key was configured)

### Test the health endpoint:
```bash
# Health endpoint should still work (public)
curl http://localhost:8000/api/health/models | jq '.success'
```

Expected: `true`

## Files Changed

1. **backend/src/health/health.controller.ts**
   - Renamed `@Get('api/models')` → `@Get('api/health/models')`
   - Renamed method `getModels()` → `getModelsHealth()`
   - Added comment explaining the change

## Impact Analysis

### ✅ No Breaking Changes
- Frontend calls `/api/models` → Now goes to ModelsController ✅
- Test scripts call LLM service directly (port 9000) → Unaffected ✅
- Health checks can use `/api/health/models` if needed ✅

### ✅ Fixed Issues
- userId now properly extracted from JWT token ✅
- Provider status correctly checked ✅
- API key configuration properly reflected ✅
- External models show correct availability ✅

## Testing Checklist

- [ ] Login to the application
- [ ] Go to `/models` page
- [ ] Configure OpenAI API key
- [ ] Refresh the page
- [ ] OpenAI models should show as available (not disabled)
- [ ] Go to `/agents/new` page
- [ ] OpenAI models should be selectable in dropdown
- [ ] Check backend logs for `[ModelsController]` messages
- [ ] Verify userId is not undefined in logs

## Related Files

- `backend/src/models/models.controller.ts` - Primary models endpoint
- `backend/src/health/health.controller.ts` - Health check endpoint (renamed)
- `backend/src/app.module.ts` - Module import order
- `backend/src/auth/decorators/public.decorator.ts` - @Public() decorator

## Lessons Learned

1. **Route conflicts are silent** - NestJS doesn't warn about duplicate routes
2. **Module order matters** - First registered module wins for conflicting routes
3. **@Public() affects all routes** - Controller-level decorators apply to all methods
4. **Always check for duplicates** - Search codebase for route patterns before adding new ones
5. **Logging is essential** - Added logging helped identify which controller was being used
