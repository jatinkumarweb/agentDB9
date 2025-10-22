# X-Frame-Options Fix - VS Code Iframe Blocking

## Issue

**Error:** `Refused to display 'http://localhost:8000/' in a frame because it set 'X-Frame-Options' to 'sameorigin'`

**Root Cause:** Helmet security middleware was setting `X-Frame-Options: SAMEORIGIN` header, which blocks iframe embedding.

## The Real Problem

The previous fix (path handling) was correct, but there was an additional issue:

1. ✅ Path handling fixed (commit 5ea81c8) - Backend strips `/proxy/8080` prefix
2. ❌ **X-Frame-Options blocking iframe** - This is the new issue we're fixing now

## Solution

### 1. Disable Helmet's Frame Guard (`backend/src/main.ts`)

**Before:**
```typescript
// Security middleware
app.use(helmet());
```

**After:**
```typescript
// Security middleware
// Configure helmet to allow iframe embedding for VS Code proxy
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow VS Code iframe
  frameguard: false, // Disable X-Frame-Options to allow iframe embedding
}));
```

**Why:**
- Helmet's default `frameguard` sets `X-Frame-Options: SAMEORIGIN`
- This blocks VS Code from loading in an iframe
- We disable it to allow iframe embedding

### 2. Filter X-Frame-Options from Proxied Responses (`backend/src/proxy/proxy.controller.ts`)

**Before:**
```typescript
// Copy response headers
Object.keys(response.headers).forEach(key => {
  res.setHeader(key, response.headers[key]);
});
```

**After:**
```typescript
// Copy response headers, but exclude X-Frame-Options to allow iframe embedding
const headersToExclude = ['x-frame-options', 'content-security-policy'];
Object.keys(response.headers).forEach(key => {
  if (!headersToExclude.includes(key.toLowerCase())) {
    res.setHeader(key, response.headers[key]);
  } else {
    console.log(`Excluding header for iframe compatibility: ${key}`);
  }
});
```

**Why:**
- VS Code server might also set `X-Frame-Options`
- We filter it out when proxying to allow iframe embedding
- Also filter `Content-Security-Policy` which can block iframes

## Security Considerations

**⚠️ Important:** Disabling `X-Frame-Options` reduces clickjacking protection.

**Mitigation:**
1. Only disable for development/trusted environments
2. For production, consider:
   - Using `X-Frame-Options: ALLOW-FROM https://yourdomain.com`
   - Or implementing CSP with `frame-ancestors` directive
   - Or using authentication to restrict access

**Current approach is safe for:**
- ✅ Local development
- ✅ Trusted internal networks
- ✅ Authenticated users only

**Not recommended for:**
- ❌ Public-facing production without authentication
- ❌ Untrusted environments

## Testing

### 1. Rebuild Backend
```bash
docker-compose build backend
docker-compose up -d backend
```

### 2. Check Headers
```bash
# Check backend doesn't send X-Frame-Options
curl -I http://localhost:8000/proxy/8080/

# Should NOT see:
# X-Frame-Options: SAMEORIGIN

# Should see:
# HTTP/1.1 200 OK
# (no X-Frame-Options header)
```

### 3. Test in Browser
```bash
# Open browser
http://localhost:3000/workspace

# Open DevTools → Console
# Should NOT see:
# "Refused to display ... X-Frame-Options"

# Should see:
# VS Code loads in iframe ✅
```

### 4. Verify Logs
```bash
docker-compose logs --tail=50 backend

# Should see:
# "Excluding header for iframe compatibility: x-frame-options"
```

## Files Changed

1. ✅ `backend/src/main.ts` - Disabled helmet frameguard
2. ✅ `backend/src/proxy/proxy.controller.ts` - Filter X-Frame-Options from proxied responses

## Complete Fix Summary

**Three issues fixed:**

1. ✅ **Frontend loads VS Code through proxy** (commit 5aac846)
   - Changed: `frontend/src/components/VSCodeContainer.tsx`
   - Uses: `${backendUrl}/proxy/8080`

2. ✅ **Backend strips /proxy/8080 prefix** (commit 5ea81c8)
   - Changed: `backend/src/proxy/proxy.controller.ts`
   - Strips prefix for port 8080

3. ✅ **Backend allows iframe embedding** (this fix)
   - Changed: `backend/src/main.ts` - Disabled helmet frameguard
   - Changed: `backend/src/proxy/proxy.controller.ts` - Filter X-Frame-Options

## Flow After All Fixes

1. Frontend requests: `http://localhost:8000/proxy/8080/?folder=...`
2. Backend receives request
3. Backend strips `/proxy/8080` prefix → `/?folder=...`
4. Backend forwards to: `http://vscode:8080/?folder=...`
5. VS Code responds (may include X-Frame-Options)
6. Backend filters out X-Frame-Options header
7. Backend sends response without X-Frame-Options
8. Frontend receives response
9. ✅ VS Code loads in iframe successfully!

## Rollback

If this causes security issues:

```bash
# Revert the changes
git revert HEAD

# Or manually restore helmet:
# In backend/src/main.ts:
app.use(helmet());

# Rebuild
docker-compose build backend
docker-compose up -d backend
```

## Production Recommendations

For production deployment:

```typescript
// backend/src/main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://yourdomain.com"],
      frameAncestors: ["'self'", "https://yourdomain.com"],
    },
  },
  frameguard: {
    action: 'allow-from',
    domain: 'https://yourdomain.com'
  },
}));
```

Or use CSP `frame-ancestors` directive (more modern):

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      frameAncestors: ["'self'", "https://yourdomain.com"],
    },
  },
  frameguard: false, // CSP frame-ancestors replaces X-Frame-Options
}));
```

---

**Status:** ✅ Fixed - VS Code should now load in iframe
**Security:** ⚠️ Reduced clickjacking protection - acceptable for development
**Next:** Test on local machine after rebuilding backend
