# PUBLIC_URL Quick Start Guide

## TL;DR - Fix Vite 404 Errors

If you're getting 404 errors with Vite, run this in your project directory:

```bash
cd /workspaces/agentDB9/workspace/my-vite-app
bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh .
PUBLIC_URL=/proxy/5173 npm run dev
```

Access at: `http://localhost:8080/proxy/5173/`

## What is PUBLIC_URL?

`PUBLIC_URL` is an environment variable that tells your React app where it's being served from. When running through a proxy (like VSCode's code-server), you need to set this so assets load from the correct path.

## Why Do I Need This?

**Without PUBLIC_URL:**
- Browser requests: `http://localhost:8080/vite.svg` → 404 ❌
- Browser requests: `http://localhost:8080/@vite/client` → 404 ❌

**With PUBLIC_URL=/proxy/5173:**
- Browser requests: `http://localhost:8080/proxy/5173/vite.svg` → 200 ✅
- Browser requests: `http://localhost:8080/proxy/5173/@vite/client` → 200 ✅

## Universal Solution

This approach works for **all React frameworks** using a single environment variable:

| Framework | Native Support | Auto-Config | Command |
|-----------|---------------|-------------|---------|
| Create React App | ✅ Yes | Not needed | `PUBLIC_URL=/proxy/3000 npm start` |
| Vite | ⚠️ Via config | ✅ Yes | `PUBLIC_URL=/proxy/5173 npm run dev` |
| Next.js | ⚠️ Via config | ⚠️ Manual | `PUBLIC_URL=/proxy/3000 npm run dev` |

## Quick Start

### Step 1: Auto-Configure Your Project

Run the auto-configuration script in your project directory:

```bash
cd /workspaces/agentDB9/workspace/my-app
bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh .
```

This will:
- Detect your framework (Vite, CRA, Next.js)
- Update configuration files to support `PUBLIC_URL`
- Backup original configs

### Step 2: Start Dev Server with PUBLIC_URL

**For Vite (port 5173):**
```bash
PUBLIC_URL=/proxy/5173 npm run dev
```

**For Create React App (port 3000):**
```bash
PUBLIC_URL=/proxy/3000 npm start
```

**For Next.js (port 3000):**
```bash
PUBLIC_URL=/proxy/3000 npm run dev
```

### Step 3: Access Your App

Open in browser:
```
http://localhost:8080/proxy/<port>/
```

Examples:
- Vite: `http://localhost:8080/proxy/5173/`
- CRA: `http://localhost:8080/proxy/3000/`

## Convenience Commands (Coming Soon)

Once the dev container is updated, you'll be able to use:

```bash
# Automatically configures and starts on the right port
vite-dev    # Starts Vite with PUBLIC_URL=/proxy/5173
react-start # Starts CRA with PUBLIC_URL=/proxy/3000
next-dev    # Starts Next.js with PUBLIC_URL=/proxy/3000

# Or use the universal command
dev 5173    # Starts any framework on port 5173
dev 3000    # Starts any framework on port 3000
```

## What Gets Changed?

### For Vite Projects

**Before (vite.config.js):**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
```

**After (vite.config.js):**
```javascript
export default defineConfig({
  plugins: [react()],
  base: process.env.PUBLIC_URL || '/',  // ← Added this line
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
```

### For Create React App

No changes needed! CRA natively supports `PUBLIC_URL`.

### For Next.js

You need to manually add to `next.config.js`:

```javascript
module.exports = {
  basePath: process.env.PUBLIC_URL || '',
  assetPrefix: process.env.PUBLIC_URL || '',
  // ... rest of your config
}
```

## Manual Configuration

If you prefer to configure manually:

### Vite

Edit `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.PUBLIC_URL || '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
```

### Next.js

Edit `next.config.js`:

```javascript
module.exports = {
  basePath: process.env.PUBLIC_URL || '',
  assetPrefix: process.env.PUBLIC_URL || '',
}
```

### Create React App

No configuration needed - just set the environment variable!

## Troubleshooting

### Still Getting 404 Errors?

**1. Check PUBLIC_URL is set:**
```bash
echo $PUBLIC_URL
# Should show: /proxy/5173 (or your port)
```

**2. Check the config was updated:**
```bash
grep "PUBLIC_URL" vite.config.js
# Should show: base: process.env.PUBLIC_URL || '/',
```

**3. Restart the dev server:**
```bash
# Stop with Ctrl+C, then restart
PUBLIC_URL=/proxy/5173 npm run dev
```

**4. Clear browser cache:**
```
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

### Config Not Applied?

If auto-configuration didn't work:

```bash
# Check if backup exists
ls -la *.backup

# Restore if needed
mv vite.config.js.backup vite.config.js

# Try manual configuration
```

### Wrong Port?

Make sure PUBLIC_URL matches your dev server port:

```bash
# Vite runs on 5173
PUBLIC_URL=/proxy/5173 npm run dev

# CRA runs on 3000
PUBLIC_URL=/proxy/3000 npm start
```

## Examples

### Example 1: New Vite Project

```bash
# Create project
cd /workspaces/agentDB9/workspace
npm create vite@latest my-app -- --template react
cd my-app
npm install

# Auto-configure
bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh .

# Start with PUBLIC_URL
PUBLIC_URL=/proxy/5173 npm run dev

# Access at: http://localhost:8080/proxy/5173/
```

### Example 2: Existing Vite Project

```bash
# Navigate to project
cd /workspaces/agentDB9/workspace/existing-app

# Auto-configure
bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh .

# Start with PUBLIC_URL
PUBLIC_URL=/proxy/5173 npm run dev
```

### Example 3: Create React App

```bash
# Create project
cd /workspaces/agentDB9/workspace
npx create-react-app my-app
cd my-app

# No configuration needed!
PUBLIC_URL=/proxy/3000 npm start

# Access at: http://localhost:8080/proxy/3000/
```

## Why This Approach?

### ✅ Advantages

1. **Universal** - One environment variable for all frameworks
2. **Non-invasive** - Doesn't break existing configs
3. **Automatic** - Auto-detects and configures
4. **Standard** - Uses the same variable as Create React App
5. **Flexible** - Easy to change ports

### ❌ Alternative Approaches (Not Recommended)

**Hardcoding in config:**
```javascript
// ❌ Don't do this
base: '/proxy/5173/'  // Hard to change, not flexible
```

**Framework-specific variables:**
```bash
# ❌ Different for each framework
VITE_BASE_PATH=/proxy/5173 npm run dev
NEXT_PUBLIC_BASE_PATH=/proxy/3000 npm run dev
```

**Our approach:**
```bash
# ✅ Same for all frameworks
PUBLIC_URL=/proxy/5173 npm run dev
PUBLIC_URL=/proxy/3000 npm start
```

## Next Steps

1. ✅ Auto-configure your project
2. ✅ Start dev server with PUBLIC_URL
3. ✅ Access via proxy URL
4. ✅ Verify no 404 errors in console

## Related Documentation

- [UNIVERSAL_PUBLIC_URL_SOLUTION.md](./UNIVERSAL_PUBLIC_URL_SOLUTION.md) - Complete technical details
- [VITE_PROXY_FIX.md](./VITE_PROXY_FIX.md) - Vite-specific solution
- [PROXY_ERROR_DIAGNOSIS.md](./PROXY_ERROR_DIAGNOSIS.md) - Error diagnosis
- [docs/CONTAINER_DEV_ENV.md](./docs/CONTAINER_DEV_ENV.md) - Container configuration

## Summary

**The Problem:**
- Vite (and other frameworks) generate absolute URLs
- These don't work through proxies
- Results in 404 errors for assets

**The Solution:**
- Use `PUBLIC_URL` environment variable (universal standard)
- Auto-configure projects to read this variable
- Works for all React frameworks

**Quick Fix:**
```bash
bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh .
PUBLIC_URL=/proxy/5173 npm run dev
```

🎉 That's it! Your app should now work through the proxy without 404 errors.
