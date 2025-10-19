# Proxy Authentication Documentation

## Overview

The backend proxy (`/proxy/{port}/*`) now requires JWT authentication to access workspace dev servers. This ensures only authenticated users can access their workspace resources.

## Architecture

```
Browser → Backend (Port 8000) → Dev Server (Port 3000)
          ↑ JWT Auth Required
```

## Authentication Flow

### 1. User Login
```bash
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 2. Access Proxy with Token
```bash
GET http://localhost:8000/proxy/3000/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Implementation Details

### Backend Changes

**File:** `backend/src/proxy/proxy.controller.ts`

- **Removed:** `@Public()` decorator
- **Added:** `@UseGuards(JwtAuthGuard)` - Enforces JWT authentication
- **Added:** `@CurrentUser()` decorator - Injects authenticated user info
- **Logging:** Logs user ID and email for audit trail

### Security Features

1. **JWT Validation:** All proxy requests validate JWT token
2. **User Context:** Each request logs authenticated user
3. **CORS Headers:** Set only for authenticated proxy routes
4. **Rate Limiting:** Can be added per-user basis
5. **Audit Trail:** User actions logged for security monitoring

## Frontend Integration

The frontend automatically includes JWT tokens in requests:

```typescript
// frontend/src/lib/backend-client.ts
if (token) {
  requestHeaders['Authorization'] = `Bearer ${token}`;
}
```

## Testing

### Without Authentication (Should Fail)
```bash
curl -i http://localhost:8000/proxy/3000/
# Expected: 401 Unauthorized
```

### With Authentication (Should Succeed)
```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.token')

# 2. Access proxy with token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/proxy/3000/
# Expected: 200 OK with proxied content
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Causes:**
- Missing Authorization header
- Invalid JWT token
- Expired JWT token

### 502 Bad Gateway
```json
{
  "error": "Bad Gateway",
  "message": "Could not reach service on port 3000",
  "details": "connect ECONNREFUSED 127.0.0.1:3000"
}
```

**Causes:**
- Dev server not running on target port
- Network connectivity issues

## Logs

When a proxy request is made, the backend logs:

```
=== PROXY REQUEST START ===
Authenticated User: 123 user@example.com
Method: GET
Original URL: /proxy/3000/
Port param: 3000
Origin: http://localhost:3000
Referer: http://localhost:3000/
Setting CORS headers...
Extracted path: 
Target URL: http://localhost:3000/
Forwarding request to target...
Response status: 200
Response content-type: text/html
=== PROXY REQUEST END ===
```

## Security Considerations

### ✅ Implemented
- JWT authentication required
- User context logging
- CORS headers only for authenticated routes
- Proper error handling

### 🔄 Recommended Additions
- Rate limiting per user
- Workspace ownership validation (verify user owns the workspace)
- Port whitelist (only allow specific ports)
- Request size limits
- Timeout configuration

## Future Enhancements

### Workspace Ownership Validation
```typescript
// Verify user owns the workspace before proxying
const workspace = await this.workspacesService.findByPort(port);
if (workspace.userId !== user.id) {
  throw new ForbiddenException('Access denied to this workspace');
}
```

### Port Whitelist
```typescript
const ALLOWED_PORTS = [3000, 3001, 5173, 4200, 8080];
if (!ALLOWED_PORTS.includes(parseInt(port))) {
  throw new BadRequestException('Port not allowed');
}
```

## Migration Notes

**Before:** Proxy was public (`@Public()` decorator)
**After:** Proxy requires authentication (`@UseGuards(JwtAuthGuard)`)

**Impact:**
- Unauthenticated requests will receive 401 Unauthorized
- Frontend must include JWT token in Authorization header
- Better security and audit trail
