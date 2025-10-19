# Proxy Testing Guide

## Understanding the Error

```json
{
  "error": "Bad Gateway",
  "message": "Could not reach service on port 5173",
  "details": "connect ECONNREFUSED 127.0.0.1:5173"
}
```

This error means:
- ✅ **Proxy is working correctly**
- ❌ **No dev server running on port 5173**

The proxy successfully received your request, but there's nothing listening on port 5173.

## Solution: Start Your Dev Server

### Option 1: Use Test Server (Quick Verification)

```bash
# Start test server on port 5173
python3 test-server.py 5173

# Or on port 3000
python3 test-server.py 3000
```

Then access via proxy:
- Direct: `http://localhost:5173/`
- Proxy: `http://localhost:8000/proxy/5173/`

### Option 2: Start Your Actual Project

#### For Vite Projects:
```bash
cd your-project
npm run dev
# Usually starts on port 5173
```

Access via: `http://localhost:8000/proxy/5173/`

#### For Create React App:
```bash
cd your-project
npm start
# Usually starts on port 3000
```

Access via: `http://localhost:8000/proxy/3000/`

#### For Next.js:
```bash
cd your-project
npm run dev
# Usually starts on port 3000
```

Access via: `http://localhost:8000/proxy/3000/`

## Testing the Proxy

### Step 1: Start Dev Server

```bash
# Example: Start test server
python3 test-server.py 5173
```

You should see:
```
🚀 Test Server Started
======================
Port: 5173
Direct URL: http://localhost:5173/
Proxy URL: http://localhost:8000/proxy/5173/
```

### Step 2: Test Direct Access

```bash
curl http://localhost:5173/
```

Should return HTML content.

### Step 3: Test Proxy Access

```bash
curl http://localhost:8000/proxy/5173/
```

Should return the same HTML content.

### Step 4: Test in Browser

Open: `http://localhost:8000/proxy/5173/`

You should see the test page with "✅ Proxy is working correctly!"

## Common Ports

| Framework | Default Port | Proxy URL |
|-----------|--------------|-----------|
| Vite | 5173 | `http://localhost:8000/proxy/5173/` |
| Create React App | 3000 | `http://localhost:8000/proxy/3000/` |
| Next.js | 3000 | `http://localhost:8000/proxy/3000/` |
| Angular | 4200 | `http://localhost:8000/proxy/4200/` |
| Vue CLI | 8080 | `http://localhost:8000/proxy/8080/` |

## Troubleshooting

### Error: "Could not reach service on port X"

**Cause:** No dev server running on that port

**Solution:**
1. Check if dev server is running: `curl http://localhost:X/`
2. If not, start it: `npm run dev` or `npm start`
3. Verify the port number matches

### Error: "localhost is blocked"

**Cause:** CORS issue (should be fixed now)

**Solution:** Already fixed! CORS headers are set automatically.

### Error: 401 Unauthorized

**Cause:** JWT authentication enabled (currently disabled)

**Solution:** Authentication is currently disabled for development. No action needed.

## Proxy Architecture

```
Browser Request
    ↓
http://localhost:8000/proxy/5173/
    ↓
Backend Proxy Controller
    ↓
http://localhost:5173/
    ↓
Your Dev Server
    ↓
Response back through proxy
    ↓
Browser
```

## Files Created

- `test-server.py` - Simple Python HTTP server for testing
- `test-server.js` - Simple Node.js HTTP server for testing (requires Node)
- `test-proxy-auth.sh` - Automated testing script
- `get-proxy-token.sh` - JWT token helper (not needed with auth disabled)

## Quick Commands

```bash
# Start test server
python3 test-server.py 5173

# Test direct access
curl http://localhost:5173/

# Test proxy access
curl http://localhost:8000/proxy/5173/

# Test in browser
# Open: http://localhost:8000/proxy/5173/
```

## Next Steps

1. ✅ Proxy is working (you got the "Bad Gateway" error, which proves it)
2. ⏳ Start your dev server on the desired port
3. ✅ Access via `http://localhost:8000/proxy/[PORT]/`
4. 🎉 Enjoy proxied dev server access!
