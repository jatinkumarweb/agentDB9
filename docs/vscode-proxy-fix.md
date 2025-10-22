# VS Code Proxy Fix Documentation

## Overview
This document explains the VS Code proxy fix, how to test it, and how to rollback if needed.

## Problem Statement

### Original Issue
When using VS Code in the `/workspace` page, dev server preview URLs (e.g., Vite on port 5173) were showing "localhost is blocked" error.

### Root Cause
- Frontend loaded VS Code iframe from: `http://localhost:8080` (direct)
- VS Code generated preview URLs to: `http://localhost:8000/proxy/5173/` (backend proxy)
- Different origins = Browser blocks cross-origin navigation
- Browser security prevents iframe from navigating to different origin

## Solution

### Approach
Load VS Code through the backend proxy so everything is on the same origin (`http://localhost:8000`).

### Changes Made

#### 1. Frontend (`frontend/src/components/VSCodeContainer.tsx`)
```typescript
// Before
const baseUrl = process.env.NEXT_PUBLIC_VSCODE_URL || 'http://localhost:8080';

// After
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const baseUrl = `${backendUrl}/proxy/8080`;
```

**Impact:** Frontend now loads VS Code through backend proxy instead of directly.

#### 2. VS Code Config (`vscode/init-workspace.sh`)
- Removed absolute `proxyUrl` configuration
- Let code-server use default relative URLs
- Relative URLs work correctly when accessed through proxy

**Impact:** VS Code generates relative preview URLs that work with same-origin policy.

#### 3. Docker Compose (`docker-compose.yml`)
- Removed `PROXY_BASE_URL` environment variable (no longer needed)

**Impact:** Simplified configuration, no custom environment variables needed.

## Testing

### Prerequisites
```bash
# Start all services
docker-compose up -d

# Wait for services to be ready (30-60 seconds)
docker-compose ps
```

### Quick Test
```bash
# Run automated test suite
./tests/vscode-proxy-test.sh
```

### Manual Testing

#### Test 1: VS Code Loads Through Proxy
1. Open browser to `http://localhost:3000/workspace`
2. Open DevTools → Network tab
3. Look for iframe request
4. **Expected:** Iframe src is `http://localhost:8000/proxy/8080/?folder=...`
5. **Expected:** VS Code loads successfully

#### Test 2: Dev Server Preview Works
1. In VS Code terminal, create a Vite app:
   ```bash
   npm create vite@latest test-app -- --template react
   cd test-app
   npm install
   npm run dev
   ```
2. VS Code should detect port 5173
3. Click "Open in Browser" or preview icon
4. **Expected:** URL is `http://localhost:8000/proxy/5173/`
5. **Expected:** Preview loads without "blocked" error

#### Test 3: Same-Origin Verification
1. Open `/workspace` page
2. Open DevTools → Console
3. Run:
   ```javascript
   const iframe = document.querySelector('iframe[title="VS Code"]');
   console.log('Iframe origin:', new URL(iframe.src).origin);
   console.log('Page origin:', window.location.origin);
   ```
4. **Expected:** Both show `http://localhost:8000`

### Test Results

Run the test suite and document results:

```bash
./tests/vscode-proxy-test.sh > test-results.txt 2>&1
```

Expected output:
```
========================================
Test Results Summary
========================================

Total Tests: 11
Passed: 11
Failed: 0

Success Rate: 100%

✅ Test suite PASSED (>= 80% success rate)
```

## Rollback Procedure

If the changes cause issues, use the rollback script:

```bash
./scripts/rollback-vscode-proxy.sh
```

### Manual Rollback

If the script doesn't work, manually revert:

#### Step 1: Revert Git Commits
```bash
git revert 5aac846 2573f08
```

#### Step 2: Rebuild Services
```bash
docker-compose build frontend vscode
docker-compose up -d frontend vscode
```

#### Step 3: Verify
```bash
curl -I http://localhost:8080  # Should return 200
curl -I http://localhost:3000  # Should return 200
```

## Troubleshooting

### Issue: "Refused to connect"

**Symptoms:**
- VS Code iframe shows "refused to connect"
- Browser console shows connection error

**Diagnosis:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if VS Code is running
curl http://localhost:8080

# Check if proxy works
curl http://localhost:8000/proxy/8080/
```

**Solutions:**
1. **Backend not running:**
   ```bash
   docker-compose up -d backend
   docker-compose logs backend
   ```

2. **VS Code not running:**
   ```bash
   docker-compose up -d vscode
   docker-compose logs vscode
   ```

3. **Proxy not working:**
   ```bash
   # Check proxy controller logs
   docker-compose logs backend | grep proxy
   
   # Restart backend
   docker-compose restart backend
   ```

### Issue: "localhost is blocked"

**Symptoms:**
- Preview URLs show "localhost is blocked"
- Different origin error in console

**Diagnosis:**
```bash
# Check iframe src in browser DevTools
# Should be: http://localhost:8000/proxy/8080/
# NOT: http://localhost:8080
```

**Solutions:**
1. **Frontend not updated:**
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

2. **Browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Clear browser cache
   - Try incognito/private window

3. **Environment variable issue:**
   ```bash
   # Check frontend environment
   docker-compose exec frontend env | grep NEXT_PUBLIC_BACKEND_URL
   
   # Should show: NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

### Issue: Proxy timeout

**Symptoms:**
- Requests hang or timeout
- 502 Bad Gateway errors

**Diagnosis:**
```bash
# Check if VS Code container is healthy
docker-compose ps vscode

# Check network connectivity
docker-compose exec backend curl http://vscode:8080
```

**Solutions:**
1. **VS Code container unhealthy:**
   ```bash
   docker-compose restart vscode
   docker-compose logs vscode
   ```

2. **Network issues:**
   ```bash
   # Recreate network
   docker-compose down
   docker-compose up -d
   ```

3. **Increase timeout:**
   Edit `backend/src/proxy/proxy.controller.ts`:
   ```typescript
   timeout: 5000, // Increase from 2000 to 5000
   ```

## Performance Considerations

### Proxy Overhead
- Expected latency: < 50ms
- Minimal impact on user experience
- Backend proxy is lightweight (simple forwarding)

### Monitoring
```bash
# Check proxy performance
time curl -s http://localhost:8000/proxy/8080/ > /dev/null

# Compare with direct access
time curl -s http://localhost:8080 > /dev/null
```

## Security Considerations

### CORS Configuration
- Proxy controller sets permissive CORS headers for development
- **Production:** Review and restrict CORS origins

### Authentication
- Proxy controller currently has authentication disabled (`@Public()`)
- **Production:** Re-enable JWT authentication

### Network Isolation
- All traffic goes through backend (single entry point)
- VS Code not directly exposed to browser
- Better control over access and monitoring

## Future Improvements

### 1. Dynamic Port Detection
- Auto-detect dev server ports
- Generate proxy URLs dynamically
- No manual configuration needed

### 2. WebSocket Support
- Ensure WebSocket connections work through proxy
- Test with HMR (Hot Module Replacement)
- Verify Vite/React dev server WebSockets

### 3. SSL/TLS Support
- Add HTTPS support for proxy
- Handle SSL certificates
- Secure WebSocket (WSS) support

### 4. Performance Optimization
- Add caching for static assets
- Implement connection pooling
- Optimize proxy middleware

## References

### Related Files
- `frontend/src/components/VSCodeContainer.tsx` - Frontend VS Code component
- `backend/src/proxy/proxy.controller.ts` - Backend proxy controller
- `vscode/init-workspace.sh` - VS Code initialization script
- `docker-compose.yml` - Docker services configuration

### Related Commits
- `5aac846` - Fix VS Code preview URLs by proxying through backend
- `2573f08` - Fix VS Code port proxy URLs to use backend proxy

### Test Files
- `tests/vscode-proxy.test.md` - Manual test cases
- `tests/vscode-proxy-test.sh` - Automated test script
- `scripts/rollback-vscode-proxy.sh` - Rollback script

## Support

### Getting Help
1. Check this documentation
2. Run test suite: `./tests/vscode-proxy-test.sh`
3. Check logs: `docker-compose logs backend vscode frontend`
4. Review browser console for errors
5. Try rollback: `./scripts/rollback-vscode-proxy.sh`

### Reporting Issues
When reporting issues, include:
1. Test suite output
2. Browser console errors
3. Docker logs
4. Steps to reproduce
5. Expected vs actual behavior

## Changelog

### 2025-10-22
- Initial implementation of VS Code proxy fix
- Added test suite and rollback script
- Documented troubleshooting procedures
