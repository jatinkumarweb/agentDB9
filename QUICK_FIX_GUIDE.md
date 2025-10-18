# Quick Fix Guide: React App Proxy Error

## Problem
Browser shows: `Uncaught SyntaxError: Unexpected token '<'` when accessing React app via proxy on port 3000.

## Root Cause
1. Dev container build failed
2. Node.js/npm not installed
3. No React dev server running on port 3000
4. Proxy returns HTML error pages instead of JavaScript files

## Solution

### Step 1: Rebuild Dev Container

The dev container configuration has been fixed. Rebuild it:

```bash
gitpod env devcontainer rebuild
```

**What was fixed:**
- Removed failing `postStartCommand` that tried to use non-existent NVM
- Added proper port attributes for better forwarding
- Enabled Yarn installation via apt

### Step 2: Verify Node.js Installation

After rebuild completes, verify:

```bash
node --version  # Should show v22.x.x
npm --version   # Should show npm version
```

If Node.js is still not available, the container rebuild may have failed again. Check logs.

### Step 3: Create React App

Navigate to workspace and create a React app:

**Option A: Create React App (Traditional)**
```bash
cd /workspaces/agentDB9/workspace
npx create-react-app my-app
cd my-app
npm start
```

**Option B: Vite (Faster, Recommended)**
```bash
cd /workspaces/agentDB9/workspace
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run dev -- --host 0.0.0.0
```

### Step 4: Access the App

**Via Gitpod URL:**
```
https://3000-<workspace-id>.gitpod.io
```

**Via VSCode Proxy:**
```
http://localhost:8081/proxy/3000
```

The port should be automatically forwarded once the dev server starts.

## Verification Checklist

- [ ] Dev container rebuilt successfully
- [ ] `node --version` works
- [ ] `npm --version` works
- [ ] React app created
- [ ] Dev server running (check with `lsof -i :3000` or `curl http://localhost:3000`)
- [ ] Browser shows React app (no syntax errors)
- [ ] Hot reload works

## If Still Not Working

### Check 1: Is the dev server actually running?
```bash
curl http://localhost:3000
```
Should return HTML with React app, not an error page.

### Check 2: Is port 3000 in use?
```bash
lsof -i :3000
```
Should show a node process.

### Check 3: Check browser network tab
- Open browser DevTools → Network tab
- Refresh the page
- Check what's being returned for JS files
- If you see HTML instead of JavaScript, the proxy or server is misconfigured

### Check 4: Clear browser cache
```
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

### Check 5: Try direct access
If using Gitpod, try accessing the port directly:
```
https://3000-<workspace-id>.gitpod.io
```

## Alternative: Manual Node.js Installation

If the dev container rebuild keeps failing, you can manually install Node.js:

```bash
# Download and install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Verify
node --version
npm --version
```

**Note:** This requires apt-get to be working. If apt-get is missing, the environment is severely broken and needs a full reset.

## Understanding the Error

**`Uncaught SyntaxError: Unexpected token '<'`**

This happens when:
1. Browser requests: `http://proxy/3000/static/js/main.js`
2. No server on port 3000 → proxy returns HTML error page
3. Browser tries to execute HTML as JavaScript
4. HTML starts with `<` → syntax error

**`manifest.json:1 Manifest: Line: 1, column: 1, Syntax error`**

Same issue:
1. Browser requests: `http://proxy/3000/manifest.json`
2. Expects JSON, gets HTML error page
3. HTML is not valid JSON → parse error

## Prevention

To avoid this in the future:

1. **Always verify Node.js is installed** before creating React apps
2. **Check dev server is running** before accessing via browser
3. **Use `curl` to test** the endpoint before opening in browser
4. **Monitor dev container build** logs for errors
5. **Keep dev container config simple** - avoid complex postStartCommand

## Need Help?

If you're still stuck:
1. Check the full diagnosis in `PROXY_ERROR_DIAGNOSIS.md`
2. Review dev container logs
3. Try creating a minimal test app first
4. Verify the proxy service is running and configured correctly
