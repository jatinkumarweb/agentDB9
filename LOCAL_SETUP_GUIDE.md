# Local Machine Setup Guide

Complete step-by-step guide to run AgentDB9 with proxy on your local machine.

## Prerequisites

- **Docker Desktop** installed and running
- **Git** installed
- **Ports available:** 3000, 5173, 8000, 8080, 5432, 6379, 6333, 9000, 11434

## Quick Start (5 Steps)

### 1. Clone Repository
```bash
git clone https://github.com/jatinkumarweb/agentDB9.git
cd agentDB9
```

### 2. Start All Services
```bash
docker compose up -d
```

Wait 1-2 minutes for all services to start.

### 3. Verify Services
```bash
# Check all services are running
docker compose ps

# Test backend
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

### 4. Start Dev Server in VSCode Container
```bash
# Access vscode container
docker compose exec vscode bash

# Inside container:
cd /home/coder/workspace/your-project
PUBLIC_URL="/proxy/3000" npm start
```

### 5. Access Your App
```
http://localhost:8000/proxy/3000/
```

Done! Your app is running through the proxy. ✅

---

## Detailed Setup

### Step 1: Clone and Configure

```bash
# Clone repository
git clone https://github.com/jatinkumarweb/agentDB9.git
cd agentDB9

# Create .env file (optional - has defaults)
cat > .env << 'EOF'
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure
SESSION_SECRET=your_session_secret_key_here_make_it_long_and_secure
LOG_LEVEL=info
EOF
```

### Step 2: Start Docker Services

```bash
# Start all services in background
docker compose up -d

# View logs (optional)
docker compose logs -f
```

**Services started:**
- `backend` (port 8000) - NestJS API with proxy
- `frontend` (port 3000) - Next.js frontend
- `vscode` (port 8080) - VSCode container for workspaces
- `postgres` (port 5432) - Database
- `redis` (port 6379) - Cache
- `qdrant` (port 6333) - Vector DB
- `ollama` (port 11434) - Local LLM
- `llm-service` (port 9000) - LLM wrapper

### Step 3: Wait for Services

```bash
# Wait for backend (30-60 seconds)
until curl -f http://localhost:8000/health 2>/dev/null; do
  echo "Waiting for backend..."
  sleep 3
done
echo "✅ Backend ready!"

# Wait for vscode (30-60 seconds)
until curl -f http://localhost:8080 2>/dev/null; do
  echo "Waiting for vscode..."
  sleep 3
done
echo "✅ VSCode ready!"
```

### Step 4: Access VSCode Container

**Option A: Via Docker Exec (Recommended)**
```bash
docker compose exec vscode bash
```

**Option B: Via Browser**
1. Open `http://localhost:8080`
2. Use integrated terminal

### Step 5: Start Your Dev Server

Inside the vscode container:

```bash
# Navigate to your project
cd /home/coder/workspace/your-project

# Install dependencies (first time only)
npm install

# Start dev server with PUBLIC_URL
PUBLIC_URL="/proxy/3000" npm start
```

**For different frameworks:**
```bash
# React (CRA)
PUBLIC_URL="/proxy/3000" npm start

# Vite
PUBLIC_URL="/proxy/5173" npm run dev

# Next.js
PUBLIC_URL="/proxy/3000" npm run dev

# Angular
ng serve --base-href=/proxy/4200/
```

### Step 6: Access Your App

**Via Proxy (Correct):**
```
http://localhost:8000/proxy/3000/
```

**Direct (Won't work from browser):**
```
http://localhost:3000  # Only works inside vscode container
```

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Your Local Machine (Docker)                     │
│                                                  │
│  Browser                                        │
│    ↓                                            │
│  http://localhost:8000/proxy/3000/             │
│    ↓                                            │
│  ┌────────────────┐      ┌──────────────────┐  │
│  │ Backend        │      │ VSCode Container │  │
│  │ Container      │─────→│                  │  │
│  │ Port 8000      │Proxy │ Port 3000        │  │
│  │                │      │ (Dev Server)     │  │
│  │ - Proxy routes │      │ - Your React App │  │
│  └────────────────┘      └──────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Key Points:**
- Backend and vscode are separate Docker containers
- They communicate via Docker network (service names)
- Backend proxies `http://localhost:8000/proxy/3000/` → `http://vscode:3000/proxy/3000/`
- Dev server in vscode handles `/proxy/3000/` prefix

---

## Common Tasks

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f vscode
```

### Restart Service
```bash
docker compose restart backend
docker compose restart vscode
```

### Stop All Services
```bash
docker compose down
```

### Rebuild After Code Changes
```bash
# Rebuild backend
docker compose up -d --build backend

# Rebuild all
docker compose up -d --build
```

### Access Container Shell
```bash
# VSCode container
docker compose exec vscode bash

# Backend container
docker compose exec backend bash
```

---

## Troubleshooting

### ❌ Port Already in Use

**Error:** `port is already allocated`

**Solution:**
```bash
# Find what's using the port (example: 8000)
# Linux/Mac:
lsof -i :8000

# Windows:
netstat -ano | findstr :8000

# Kill the process or change port in docker-compose.yml
```

### ❌ Backend Not Starting

**Check logs:**
```bash
docker compose logs backend
```

**Common causes:**
- Database not ready (wait 30 seconds)
- Port conflict
- Missing dependencies

**Solution:**
```bash
docker compose restart backend
```

### ❌ Bad Gateway Error

**Error:** `{"error":"Bad Gateway","message":"Could not reach service on port 3000"}`

**Cause:** Dev server not running in vscode container

**Solution:**
```bash
# Check if dev server is running
docker compose exec vscode ps aux | grep npm

# If not, start it
docker compose exec vscode bash
cd /home/coder/workspace/your-project
PUBLIC_URL="/proxy/3000" npm start
```

### ❌ bundle.js MIME Type Error

**Error:** `Refused to execute script... MIME type ('text/html') is not executable`

**Cause:** Wrong PUBLIC_URL

**Solution:**
```bash
# Stop dev server (Ctrl+C)
# Restart with correct PUBLIC_URL
PUBLIC_URL="/proxy/3000" npm start
```

### ❌ 404 on bundle.js

**Cause:** PUBLIC_URL mismatch or dev server not configured correctly

**Solution:**
1. Ensure `PUBLIC_URL="/proxy/3000"` when starting dev server
2. Check backend logs: `docker compose logs backend | grep proxy`
3. Should see: `Trying: http://vscode:3000/proxy/3000/...`

---

## Testing

### Quick Test
```bash
# Test backend
curl http://localhost:8000/health

# Test proxy (after starting dev server)
curl http://localhost:8000/proxy/3000/

# Test bundle.js
curl -I http://localhost:8000/proxy/3000/static/js/bundle.js
# Should show: Content-Type: application/javascript
```

### Using Test Scripts
```bash
# Diagnostic
./diagnose.sh

# Test vscode proxy
./test-vscode-proxy.sh

# Test bundle loading
./test-bundle-loading.sh 3000
```

---

## Daily Workflow

### Morning (Start Work)
```bash
# 1. Start services
docker compose up -d

# 2. Wait for services (30-60 seconds)
sleep 60

# 3. Start dev server
docker compose exec vscode bash -c "cd /home/coder/workspace/your-project && PUBLIC_URL=/proxy/3000 npm start"

# 4. Open browser
# http://localhost:8000/proxy/3000/
```

### Evening (End Work)
```bash
# Stop services
docker compose down
```

---

## Creating New Project

### In VSCode Container

```bash
# 1. Access vscode
docker compose exec vscode bash

# 2. Create React app
cd /home/coder/workspace
npx create-react-app my-new-app
cd my-new-app

# 3. Start with proxy
PUBLIC_URL="/proxy/3000" npm start

# 4. Access
# http://localhost:8000/proxy/3000/
```

### For Vite

```bash
cd /home/coder/workspace
npm create vite@latest my-vite-app -- --template react
cd my-vite-app
npm install

# Start with proxy
PUBLIC_URL="/proxy/5173" npm run dev

# Access
# http://localhost:8000/proxy/5173/
```

---

## Default Credentials

**Admin User:**
- Email: `admin@agentdb9.com`
- Password: `admin123`

**Login at:** `http://localhost:3000`

---

## Important URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main UI |
| Backend | http://localhost:8000 | API |
| VSCode | http://localhost:8080 | Workspace IDE |
| Proxy | http://localhost:8000/proxy/3000/ | Dev server via proxy |
| API Docs | http://localhost:8000/api/docs | Swagger |
| Qdrant | http://localhost:6333 | Vector DB |

---

## Production Notes

⚠️ **Before deploying to production:**

1. **Enable authentication** in proxy controller
2. **Change secrets** in `.env`
3. **Configure CORS** properly
4. **Use production builds**
5. **Set up SSL/TLS**
6. **Use managed database**

---

## Summary

✅ **Clone repo**  
✅ **Run `docker compose up -d`**  
✅ **Wait for services to start**  
✅ **Start dev server: `PUBLIC_URL="/proxy/3000" npm start`**  
✅ **Access: `http://localhost:8000/proxy/3000/`**  

That's it! Your local setup is complete. 🎉

---

## Need Help?

- Check logs: `docker compose logs -f`
- Run diagnostics: `./diagnose.sh`
- Review: `DOCKER_PROXY_SOLUTION.md`
- Review: `PUBLIC_URL_FIX.md`
