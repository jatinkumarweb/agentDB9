# VSCode Dev Server Setup Guide

## Problem: Static Files 404 When Accessing Through VSCode

When running dev servers (Next.js, React, Vite, etc.) inside VSCode and accessing them through VSCode's web interface, static files fail to load.

### Root Cause

VSCode (code-server) automatically proxies dev server ports at:
```
http://localhost:8080/proxy/<port>/
```

But dev servers generate URLs without this prefix:
- Generated: `/next.svg`
- Needed: `/proxy/3000/next.svg`

Result: Browser tries to load from `http://localhost:8080/next.svg` → 404

## Solution for Next.js

### 1. Configure next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.BASE_PATH || '',
  assetPrefix: process.env.ASSET_PREFIX || '',
};

export default nextConfig;
```

### 2. Update package.json dev script

```json
{
  "scripts": {
    "dev": "BASE_PATH=/proxy/3000 ASSET_PREFIX=/proxy/3000 next dev -H 0.0.0.0"
  }
}
```

### 3. Run and Access

```bash
npm run dev
```

Access at: **http://localhost:8080/proxy/3000/**

## Solution for Other Frameworks

### React (Create React App)

CRA doesn't support basePath easily. Use direct port access instead:
1. Expose port in docker-compose.yml
2. Access directly at `http://localhost:3000`

### Vite

```javascript
// vite.config.js
export default {
  base: process.env.BASE_PATH || '/',
}
```

```json
{
  "scripts": {
    "dev": "BASE_PATH=/proxy/5173 vite --host 0.0.0.0"
  }
}
```

### Angular

```json
{
  "scripts": {
    "start": "ng serve --host 0.0.0.0 --base-href /proxy/4200/ --deploy-url /proxy/4200/"
  }
}
```

## Alternative: Direct Port Access

If configuring basePath is too complex, expose the port directly:

### 1. Update docker-compose.yml

```yaml
vscode:
  ports:
    - "8080:8080"
    - "3000:3000"  # Add your dev server port
```

### 2. Restart container

```bash
docker-compose up -d vscode
```

### 3. Access directly

```
http://localhost:3000
```

No proxy prefix needed!

## Which Approach to Use?

### Use VSCode Proxy (basePath) when:
- ✅ You want everything through VSCode interface
- ✅ You're using Gitpod or similar cloud IDE
- ✅ You need authentication/security from VSCode

### Use Direct Port Access when:
- ✅ Framework doesn't support basePath easily
- ✅ You want simpler configuration
- ✅ You're developing locally

## Current Configuration

The workspace is configured for **direct port access**:
- Port 3000 exposed through VSCode container
- Access dev servers at `http://localhost:3000`
- No proxy prefix needed

To switch to proxy mode, update the dev server's configuration with basePath as shown above.

## Troubleshooting

### Static files still 404?

1. **Check the URL pattern:**
   - Proxy mode: Must access `/proxy/3000/` (with trailing slash)
   - Direct mode: Access `http://localhost:3000`

2. **Verify dev server is running:**
   ```bash
   ps aux | grep next  # or your framework
   ```

3. **Check browser console:**
   - Look for the exact failing URL
   - Verify it matches your configuration

4. **Clear cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Port already in use?

```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Can't access from browser?

1. **Check port is exposed:**
   ```bash
   docker ps | grep vscode
   ```
   Should show: `0.0.0.0:3000->3000/tcp`

2. **Check firewall:**
   - Ensure port 3000 is not blocked
   - Try accessing from localhost first

3. **Check dev server binding:**
   - Must use `-H 0.0.0.0` or `--host 0.0.0.0`
   - Not just `localhost`
