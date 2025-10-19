# Start Services Guide

## Current Issue

Both services are NOT running:
- ❌ Backend (port 8000) - Connection refused  
- ❌ Dev server (port 5173) - Connection refused

You need to start BOTH services for the proxy to work.

## Architecture

```
Browser → Backend (8000) → Dev Server (5173)
          ↑ Proxy          ↑ Your App
```

Both must be running!

## Quick Start

### Terminal 1: Start Backend

```bash
cd backend
npm install
npm run start:dev
```

Wait for: `🚀 AgentDB9 v1.0.0 running on port 8000`

### Terminal 2: Start Dev Server

```bash
# Test server
python3 test-server.py 5173

# Or your actual project
cd your-project && npm run dev
```

### Terminal 3: Test

```bash
# Test backend
curl http://localhost:8000/health

# Test dev server
curl http://localhost:5173/

# Test proxy
curl http://localhost:8000/proxy/5173/
```

## Verification

```bash
# Check backend
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# Check dev server  
curl http://localhost:5173/
# Expected: HTML content

# Check proxy
curl http://localhost:8000/proxy/5173/
# Expected: Same HTML as dev server
```

## Access in Browser

Once both services are running:

**Direct dev server:** `http://localhost:5173/`  
**Via proxy:** `http://localhost:8000/proxy/5173/`

Both should show the same content!
