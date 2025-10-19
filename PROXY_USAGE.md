# Universal Proxy Usage Guide

## Overview

The backend now includes a universal proxy that can forward requests to any dev server running on localhost. This works for all project types without additional configuration.

## How It Works

```
Browser → Backend (port 8000) → /proxy/{PORT}/ → Dev Server (localhost:{PORT})
```

**Examples:**
- `http://localhost:8000/proxy/3000/` → React app on port 3000
- `http://localhost:8000/proxy/5173/` → Vite app on port 5173
- `http://localhost:8000/proxy/4200/` → Angular app on port 4200
- `http://localhost:8000/proxy/8080/` → Any service on port 8080

## Usage

### Step 1: Start Backend

```bash
docker compose up -d backend
```

Backend runs on port 8000.

### Step 2: Start Your Dev Server with PUBLIC_URL

**For React (Create React App):**
```bash
cd workspace/my-react-app
PUBLIC_URL=/proxy/3000 npm start
```

**For Vite:**
```bash
cd workspace/my-vite-app
PUBLIC_URL=/proxy/5173 npm run dev
```

**For Next.js:**
```bash
cd workspace/my-next-app
PUBLIC_URL=/proxy/3000 npm run dev
```

### Step 3: Access via Proxy

```
http://localhost:8000/proxy/3000/
```

## Configuration

### React (Create React App)

Create `.env` file:
```bash
HOST=0.0.0.0
PUBLIC_URL=/proxy/3000
```

Then just run:
```bash
npm start
```

### Vite

Update `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  base: process.env.PUBLIC_URL || '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
```

Then run:
```bash
PUBLIC_URL=/proxy/5173 npm run dev
```

### Next.js

Update `next.config.js`:
```javascript
module.exports = {
  basePath: process.env.PUBLIC_URL || '',
  assetPrefix: process.env.PUBLIC_URL || '',
}
```

Then run:
```bash
PUBLIC_URL=/proxy/3000 npm run dev
```

## Benefits

✅ **Universal** - Works for any framework
✅ **No extra services** - Uses existing backend
✅ **No authentication** - Proxy routes are public
✅ **Simple** - Just set PUBLIC_URL and go

## Verification

### Check Backend is Running

```bash
curl http://localhost:8000/health
```

### Check Proxy Works

```bash
# Start a dev server on port 3000
cd workspace/my-app
npm start

# Test proxy
curl http://localhost:8000/proxy/3000/
```

Should return the HTML of your app.

### Check Assets Load

```bash
curl http://localhost:8000/proxy/3000/static/js/bundle.js | head -20
```

Should return JavaScript code, not HTML.

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause:** Dev server not running on the specified port

**Fix:**
```bash
# Check if dev server is running
ps aux | grep "react-scripts\|vite\|next"

# Check if port is listening
curl http://localhost:3000
```

### Issue: "You need to enable JavaScript"

**Cause:** PUBLIC_URL not set when starting dev server

**Fix:**
```bash
# Stop server (Ctrl+C)
# Restart with PUBLIC_URL
PUBLIC_URL=/proxy/3000 npm start
```

### Issue: Assets return 404

**Cause:** Dev server not binding to 0.0.0.0

**Fix:**
```bash
HOST=0.0.0.0 PUBLIC_URL=/proxy/3000 npm start
```

## Environment Variables

### VSCode Container

The `REQUIRE_AUTH=false` flag has been added to the vscode service in docker-compose.yml to disable authentication for local development.

```yaml
environment:
  - REQUIRE_AUTH=false  # Disable authentication for local development
```

## Examples

### Example 1: React App

```bash
# Start backend
docker compose up -d backend

# Create React app
cd workspace
npx create-react-app my-app
cd my-app

# Create .env
echo "HOST=0.0.0.0" > .env
echo "PUBLIC_URL=/proxy/3000" >> .env

# Start
npm start

# Access
http://localhost:8000/proxy/3000/
```

### Example 2: Vite App

```bash
# Start backend
docker compose up -d backend

# Create Vite app
cd workspace
npm create vite@latest my-app -- --template react
cd my-app
npm install

# Configure vite.config.js (add base: process.env.PUBLIC_URL || '/')

# Start
PUBLIC_URL=/proxy/5173 npm run dev

# Access
http://localhost:8000/proxy/5173/
```

### Example 3: Multiple Apps

```bash
# Start backend
docker compose up -d backend

# Terminal 1: React on 3000
cd workspace/react-app
PUBLIC_URL=/proxy/3000 npm start

# Terminal 2: Vite on 5173
cd workspace/vite-app
PUBLIC_URL=/proxy/5173 npm run dev

# Access
http://localhost:8000/proxy/3000/  # React
http://localhost:8000/proxy/5173/  # Vite
```

## Summary

**Setup:**
1. Backend runs on port 8000 with universal proxy
2. Start any dev server with `PUBLIC_URL=/proxy/{PORT}`
3. Access via `http://localhost:8000/proxy/{PORT}/`

**Works for:**
- React (Create React App)
- Vite
- Next.js
- Angular
- Vue
- Any dev server on localhost

**No additional configuration needed!** 🎉
