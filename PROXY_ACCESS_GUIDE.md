# Proxy Access Guide

## Quick Start

### 1. Get JWT Token

Use the default admin credentials:

```bash
./get-proxy-token.sh admin@agentdb9.com admin123
```

This will output your JWT token. Copy it.

### 2. Access Proxy

**Option A: Using curl**
```bash
export PROXY_TOKEN='your-token-here'
curl -H "Authorization: Bearer $PROXY_TOKEN" http://localhost:8000/proxy/3000/
```

**Option B: Using browser**

Open browser console and set the token:
```javascript
localStorage.setItem('token', 'your-token-here');
```

Then access: `http://localhost:8000/proxy/3000/`

The frontend will automatically include the token from localStorage in requests.

## Default Credentials

- **Email:** `admin@agentdb9.com`
- **Password:** `admin123`

## How It Works

1. **Login** → Get JWT token
2. **Store token** → In localStorage or environment variable
3. **Access proxy** → Include `Authorization: Bearer {token}` header
4. **Backend validates** → Checks JWT, proxies to dev server

## Troubleshooting

### Getting 401 Unauthorized

**Cause:** Missing or invalid JWT token

**Solution:**
1. Login to get a fresh token
2. Ensure token is included in Authorization header
3. Check token hasn't expired

```bash
# Test login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agentdb9.com","password":"admin123"}'
```

### Getting "localhost is blocked"

**Cause:** CORS issue

**Solution:** Already fixed! CORS headers are set before authentication.

### Getting 502 Bad Gateway

**Cause:** Dev server not running on target port

**Solution:**
1. Start your dev server: `npm run dev` or `npm start`
2. Verify it's running: `curl http://localhost:3000/`
3. Then access via proxy: `http://localhost:8000/proxy/3000/`

## Frontend Integration

The frontend automatically handles authentication:

```typescript
// frontend/src/lib/backend-client.ts
const token = localStorage.getItem('token');
if (token) {
  requestHeaders['Authorization'] = `Bearer ${token}`;
}
```

When you login through the frontend UI, the token is automatically stored and used for all requests, including proxy requests.

## Security Notes

- ✅ JWT authentication required for all proxy requests
- ✅ OPTIONS preflight requests allowed (no auth needed)
- ✅ CORS headers set for any origin (proxy routes only)
- ✅ User actions logged for audit trail
- ⚠️  Default admin password should be changed in production

## Complete Example

```bash
# 1. Get token
TOKEN=$(./get-proxy-token.sh admin@agentdb9.com admin123 | grep "JWT Token:" -A1 | tail -1)

# 2. Start dev server (in your project directory)
cd /path/to/your/project
npm run dev  # Starts on port 3000

# 3. Access via proxy
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/proxy/3000/

# 4. Or export and use
export PROXY_TOKEN="$TOKEN"
curl -H "Authorization: Bearer $PROXY_TOKEN" \
  http://localhost:8000/proxy/3000/
```

## Browser Access

1. **Login via frontend UI** at `http://localhost:3000`
2. Token is automatically stored in localStorage
3. Access proxy: `http://localhost:8000/proxy/3000/`
4. Frontend automatically includes token in requests

No manual token management needed when using the frontend!
