# Proxy Error Diagnosis and Fix

## Problem Summary

**User Story Flow:**
1. User creates project ✅
2. Initialize React app ✅
3. Run development environment through VSCode terminal ✅
4. Access webpage using VSCode container proxy ❌

**Browser Error:**
```
(proxy/3000): Uncaught SyntaxError: Unexpected token '<'
manifest.json:1 Manifest: Line: 1, column: 1, Syntax error.
```

## Root Cause Analysis

### 1. Dev Container Build Failed
- **Status:** `PHASE_FAILED`
- **Config:** `.devcontainer/devcontainer.json`
- **Impact:** Node.js and npm are not properly installed

### 2. No React Dev Server Running
- Port 3000 is not in use
- No React/Vite/webpack processes running
- User cannot start dev server because Node.js is missing

### 3. Browser Error Explanation
The error `Uncaught SyntaxError: Unexpected token '<'` occurs because:
- Browser requests JavaScript files (e.g., `/static/js/main.js`)
- No server is running on port 3000
- Proxy returns an HTML error page (starts with `<html>` or `<!DOCTYPE>`)
- Browser tries to parse HTML as JavaScript → syntax error

The `manifest.json` error is the same issue - expecting JSON, receiving HTML.

## Environment Issues Found

### Missing System Tools
```bash
$ apt-get
sh: 1: apt-get: not found

$ apt
sh: 1: apt: not found
```

Despite being Ubuntu 22.04, the package manager is missing, indicating a severely broken environment.

### Missing Node.js/npm
```bash
$ which node npm
# No output - commands not found

$ node --version
# Command not found
```

The dev container's `postStartCommand` tries to use NVM but it's not available:
```bash
$ ls -la /usr/local/share/nvm/
NVM not found
```

## Solution

### Step 1: Fix Dev Container Configuration

The current `.devcontainer/devcontainer.json` has issues:

**Current postStartCommand:**
```json
"postStartCommand": "bash -c 'source /usr/local/share/nvm/nvm.sh && nvm install 22 && nvm alias default 22 && nvm use 22 && docker-compose up -d postgres'"
```

**Problems:**
- NVM path doesn't exist in the container
- Tries to run docker-compose which may not be available
- Complex command that can fail silently

**Recommended Fix:**

```json
{
  "name": "Coding Agent ONA Environment",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "workspaceFolder": "/workspaces/agentDB9",
  "shutdownAction": "none",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest",
      "enableNonRootDocker": "true"
    },
    "ghcr.io/devcontainers/features/node:1": {
      "version": "22",
      "nodeGypDependencies": true,
      "installYarnUsingApt": true
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-docker",
        "esbenp.prettier-vscode"
      ]
    }
  },
  "postCreateCommand": "npm install",
  "forwardPorts": [3000, 8000, 9000, 6333],
  "portsAttributes": {
    "3000": {
      "label": "React Dev Server",
      "onAutoForward": "notify"
    },
    "8000": {
      "label": "Backend API",
      "onAutoForward": "notify"
    }
  },
  "mounts": [
    "source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind"
  ],
  "remoteEnv": {
    "NODE_PATH": "${containerWorkspaceFolder}/node_modules"
  }
}
```

**Changes Made:**
1. Removed complex `postStartCommand` that was failing
2. Added `portsAttributes` for better port management
3. Simplified to rely on the Node feature for installation

### Step 2: Rebuild Dev Container

```bash
gitpod env devcontainer rebuild
```

### Step 3: Create React App in Workspace

After the container rebuilds successfully:

```bash
cd /workspaces/agentDB9/workspace
npx create-react-app my-app
cd my-app
npm start
```

Or with Vite (faster):

```bash
cd /workspaces/agentDB9/workspace
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run dev -- --host 0.0.0.0
```

### Step 4: Access via Proxy

The dev server will run on port 3000 (or 5173 for Vite). Access it via:

**For Gitpod:**
- The port will be automatically forwarded
- Access via the Gitpod URL: `https://3000-<workspace-id>.gitpod.io`

**For VSCode Container Proxy:**
- Ensure the proxy is configured to forward port 3000
- Access via: `http://localhost:8081/proxy/3000` (or configured proxy URL)

## Port Forwarding Configuration

The `.devcontainer/devcontainer.json` already has:
```json
"forwardPorts": [3000, 8000, 9000, 6333]
```

This should automatically forward port 3000 when a service starts on it.

## Verification Steps

1. **Check Node.js is installed:**
   ```bash
   node --version  # Should show v22.x.x
   npm --version   # Should show npm version
   ```

2. **Check dev server is running:**
   ```bash
   lsof -i :3000  # Should show node process
   # or
   curl http://localhost:3000  # Should return HTML
   ```

3. **Check browser console:**
   - Should see React app loading
   - No syntax errors
   - No manifest.json errors

## Common Issues and Fixes

### Issue: "Cannot find module 'react'"
**Fix:** Run `npm install` in the React app directory

### Issue: "Port 3000 is already in use"
**Fix:** 
```bash
lsof -ti:3000 | xargs kill -9
npm start
```

### Issue: "EACCES: permission denied"
**Fix:** Check file permissions or run as correct user

### Issue: Still getting HTML instead of JS
**Fix:** 
1. Verify dev server is actually running: `curl http://localhost:3000`
2. Check proxy configuration
3. Clear browser cache
4. Check network tab in browser dev tools to see actual responses

## Testing the Fix

1. Rebuild the dev container
2. Verify Node.js is available
3. Create a simple React app
4. Start the dev server
5. Access via browser through the proxy
6. Verify no console errors

## Additional Notes

- The vscode-proxy service (port 8081) is configured to proxy requests
- It requires authentication by default (can be disabled with `REQUIRE_AUTH=false`)
- WebSocket support is enabled for hot module replacement
- The proxy removes X-Frame-Options to allow iframe embedding

## Next Steps

1. Fix the dev container configuration
2. Rebuild the container
3. Install Node.js properly
4. Create and run a React app
5. Test the proxy connection
6. Document the working setup for future users
