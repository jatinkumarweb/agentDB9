# Final Fix: Duplicate Route Causing userId Undefined

## The Real Problem

**HealthController** had a duplicate `GET /api/models` endpoint that was being used instead of **ModelsController**.

The HealthController is marked as `@Public()`, so `req.user` was always undefined, causing userId to be undefined.

## The Fix

Renamed the duplicate route in HealthController:

```typescript
// backend/src/health/health.controller.ts

// Before:
@Get('api/models')

// After:
@Get('api/health/models')
```

## Why This Fixes It

1. **Before**: HealthModule registered before ModelsModule → HealthController handled `/api/models`
2. **HealthController** has `@Public()` → No authentication → `req.user` undefined
3. **After**: Only ModelsController handles `/api/models` → Proper authentication → userId extracted

## Apply the Fix

```bash
# Rebuild backend
cd backend
npm run build

# Restart services
docker-compose restart backend

# Or restart all
docker-compose restart
```

## Verify

```bash
# Check logs - should see ModelsController now
docker-compose logs backend | grep "ModelsController"

# Should show:
# [ModelsController] ===== GET /api/models CALLED =====
# [ModelsController] getModels called, userId: <actual-uuid>
```

## Test

1. Login to application
2. Go to `/models` page
3. Configure OpenAI API key
4. Refresh page
5. OpenAI models should now show as available ✅

## Files Changed

- ✅ `backend/src/health/health.controller.ts` - Renamed route to avoid conflict
- ✅ `backend/src/models/models.controller.ts` - Added logging (already done)

## Root Cause

Two controllers had the same route:
- `ModelsController` at `@Controller('api/models')` + `@Get()`
- `HealthController` at `@Controller()` + `@Get('api/models')`

HealthModule was imported first in app.module.ts, so its route took precedence.

## Documentation

See `DUPLICATE_ROUTE_FIX.md` for detailed explanation.
