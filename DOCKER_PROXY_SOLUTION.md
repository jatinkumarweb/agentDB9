
# Docker Proxy Solution

## The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Gitpod Environment                                          │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ Dev Container    │         │ Backend Container│        │
│  │ (This shell)     │         │ (Docker Compose) │        │
│  │                  │         │                  │        │
│  │ - No Python      │         │ - NestJS backend │        │
│  │ - No Node        │         │ - Port 8000      │        │
│  │ - Minimal tools  │         │ - Proxy controller│       │
│  └──────────────────┘         └──────────────────┘        │
│                                        │                    │
│                                        │ Tries to reach:    │
│                                        │ host.docker.internal:5173
│                                        ↓                    │
│  ┌──────────────────────────────────────────────┐         │
│  │ Host Machine (Gitpod)                        │         │
│  │ - Port 5173 needs dev server running here    │         │
│  └──────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## The Problem

1. **Backend runs in Docker container** (`backend-1`)
2. **Dev server needs to run on host** (Gitpod machine)
3. **This dev container is minimal** (no Python/Node to run dev server)
4. **Backend uses `host.docker.internal:5173`** to reach host

## Solutions

### Solution 1: Run Dev Server in VSCode Container

The `vscode` container has Node.js and can run dev servers:

```bash
# Access vscode container (if possible)
# Then:
cd /home/coder/workspace/your-project
npm run dev
```

### Solution 2: Add Dev Server to Docker Compose

Add a dev server service to `docker-compose.yml`:

```yaml
  devserver:
    image: node:22
    working_dir: /app
    ports:
      - "5173:5173"
    volumes:
      - ./your-project:/app
    command: npm run dev
    environment:
      - HOST=0.0.0.0
      - PORT=5173
```

Then backend can reach it via service name:
```typescript
const hosts = ['devserver', 'host.docker.internal', 'localhost'];
```

### Solution 3: Use Gitpod Port Forwarding

Start dev server in a Gitpod terminal with proper tools:

```bash
# In a terminal with Node.js available
cd your-project
npm run dev
```

Gitpod will forward port 5173, and backend can reach it via `host.docker.internal:5173`.

### Solution 4: Run Backend Outside Docker

Instead of Docker Compose, run backend directly:

```bash
cd backend
npm install
npm run start:dev
```

Then both backend and dev server run on the same host (localhost works).

## Current Status

- ✅ Backend running in Docker (port 8000)
- ✅ Proxy code updated with `host.docker.internal` fallback
- ❌ No dev server running on port 5173
- ❌ This dev container can't run dev server (no tools)

## Recommended Action

**Option A: Use VSCode Container**

If you have access to the vscode container (port 8080), start your dev server there:

1. Open VSCode terminal
2. Navigate to your project
3. Run `npm run dev`
4. Backend will reach it via `host.docker.internal:5173`

**Option B: Add to Docker Compose**

Add your project as a service in `docker-compose.yml` so it runs alongside the backend.

**Option C: External Dev Server**

Run your dev server on your local machine (outside Gitpod) and use Gitpod's port forwarding.

## Testing

Once dev server is running:

```bash
# Test dev server directly
curl http://localhost:5173/

# Test from backend container (should work with host.docker.internal)
# Backend logs will show:
# Trying: http://host.docker.internal:5173/
# ✅ Success with host.docker.internal:5173

# Test proxy
curl http://localhost:8000/proxy/5173/
```

## Why This Is Complex

Docker networking isolates containers. The backend container sees:
- `localhost` = itself (not the host machine)
- `host.docker.internal` = the host machine (Gitpod)
- Service names = other Docker Compose services

Your dev server must run somewhere the backend can reach it.

## Next Steps

1. Decide where to run your dev server (vscode container, Docker service, or external)
2. Start the dev server there
3. Backend will automatically try multiple hosts and find it
4. Proxy will work end-to-end
