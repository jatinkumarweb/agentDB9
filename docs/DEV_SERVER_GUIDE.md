# Dev Server Guide for VSCode Container

## Problem
When running dev servers (React, Vite, etc.) inside the VSCode container, assets may fail to load due to path issues.

## Solutions

### Option 1: Direct Port Access (Recommended)

The VSCode container forwards common dev server ports directly to your host machine.

**Available Ports:**
- `3001` → Container port `3000` (React/Next.js)
- `3002` → Container port `3001` (Additional)
- `5173` → Container port `5173` (Vite)
- `4200` → Container port `4200` (Angular)

**Usage:**
```bash
# In VSCode terminal
cd /home/coder/workspace/projects/your-project
npm start  # Starts on port 3000 inside container

# Access from your browser
http://localhost:3001  # NOT 3000!
```

### Option 2: Configure Dev Server Host

Make sure your dev server binds to `0.0.0.0` (not just `localhost`):

**For Create React App:**
```bash
HOST=0.0.0.0 npm start
```

Or add to `.env`:
```
HOST=0.0.0.0
```

**For Vite:**
```javascript
// vite.config.js
export default {
  server: {
    host: '0.0.0.0',
    port: 3000
  }
}
```

**For Next.js:**
```bash
next dev -H 0.0.0.0
```

### Option 3: Using VSCode Proxy (Advanced)

If you must use `http://localhost:8080/proxy/3000/`:

**For Create React App:**
```bash
# Create .env file
echo "PUBLIC_URL=/proxy/3000" > .env
echo "HOST=0.0.0.0" >> .env

# Start server
npm start
```

**For Vite:**
```javascript
// vite.config.js
export default {
  base: '/proxy/5173/',
  server: {
    host: '0.0.0.0',
    port: 5173
  }
}
```

## Troubleshooting

### "Unexpected token '<'" Error

This means the browser is receiving HTML instead of JavaScript.

**Causes:**
1. Dev server not running
2. Wrong port
3. Server not binding to 0.0.0.0

**Fix:**
```bash
# Check if server is running
ps aux | grep -E "react-scripts|vite|next"

# Check what port it's on
netstat -tuln | grep -E "3000|5173"

# Restart with correct host
HOST=0.0.0.0 npm start
```

### Assets Load but Page is Blank

**Check browser console for errors:**
```
F12 → Console tab
```

**Common issues:**
- CORS errors → Add proxy configuration
- WebSocket errors → Dev server not accessible
- Module errors → Dependencies not installed

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### Can't Access from Browser

**Verify port forwarding:**
```bash
# On host machine
docker ps | grep vscode

# Should show: 0.0.0.0:3001->3000/tcp
```

**Test from inside container:**
```bash
# In VSCode terminal
curl http://localhost:3000
```

**Test from host:**
```bash
# On your Mac/Windows
curl http://localhost:3001
```

## Best Practices

### 1. Always Use HOST=0.0.0.0

Create `.env` in your project:
```
HOST=0.0.0.0
PORT=3000
```

### 2. Use Direct Port Access

Instead of VSCode proxy, use forwarded ports:
- ✅ `http://localhost:3001` (direct)
- ❌ `http://localhost:8080/proxy/3000/` (proxy)

### 3. Check Port Mappings

Remember the port mapping:
- Container port `3000` → Host port `3001`
- Container port `5173` → Host port `5173`

### 4. Hot Reload Configuration

For hot reload to work through Docker:

**Create React App:**
```
# .env
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true
```

**Vite:**
```javascript
// vite.config.js
export default {
  server: {
    watch: {
      usePolling: true
    }
  }
}
```

## Quick Reference

| Framework | Container Port | Host Port | Command |
|-----------|---------------|-----------|---------|
| React (CRA) | 3000 | 3001 | `HOST=0.0.0.0 npm start` |
| Next.js | 3000 | 3001 | `next dev -H 0.0.0.0` |
| Vite | 5173 | 5173 | `npm run dev` |
| Angular | 4200 | 4200 | `ng serve --host 0.0.0.0` |

## Example: React App Setup

```bash
# 1. Create .env file
cat > .env << EOF
HOST=0.0.0.0
PORT=3000
WATCHPACK_POLLING=true
EOF

# 2. Start dev server
npm start

# 3. Access from browser
# http://localhost:3001
```

## Example: Vite App Setup

```bash
# 1. Update vite.config.js
cat > vite.config.js << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true
    }
  }
})
EOF

# 2. Start dev server
npm run dev

# 3. Access from browser
# http://localhost:5173
```
