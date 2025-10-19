# Proxy Service Mapping

## The Problem

When you access `http://localhost:8000/proxy/3000/`, the backend needs to know WHERE port 3000 is:

- ❌ `http://localhost:3000/` - Wrong! This is the backend container itself
- ❌ `http://host.docker.internal:3000/` - Wrong! This is the host machine
- ✅ `http://vscode:3000/` - Correct! This is the vscode Docker service

## The Solution

The proxy now maps ports to Docker service names:

```typescript
Port 3000 → vscode service → http://vscode:3000/
Port 5173 → vscode service → http://vscode:5173/
```

## Default Mappings

| Port | Service | Description |
|------|---------|-------------|
| 3000 | vscode | React/Next.js dev server in vscode container |
| 3001 | vscode | Additional dev server port |
| 5173 | vscode | Vite dev server in vscode container |
| 4200 | vscode | Angular dev server in vscode container |
| 8080 | vscode | VSCode itself |

## How It Works

### Request Flow

```
Browser
  ↓
http://localhost:8000/proxy/3000/
  ↓
Backend Container (port 8000)
  ↓
Proxy Controller checks port 3000
  ↓
Finds mapping: 3000 → vscode
  ↓
Tries: http://vscode:3000/
  ↓
VSCode Container (port 3000)
  ↓
Returns: Your React app
  ↓
Proxy forwards response
  ↓
Browser receives app with bundle.js
```

### Host Priority

The proxy tries hosts in this order:

1. **Docker service name** (e.g., `vscode`) - if port is mapped
2. **host.docker.internal** - for services on host machine
3. **localhost** - for local development
4. **0.0.0.0** - for Gitpod/containerized environments
5. **127.0.0.1** - explicit loopback

## Custom Mappings

You can override mappings via environment variable:

```yaml
# docker-compose.yml
backend:
  environment:
    - PROXY_SERVICE_MAP=3000:vscode,5173:devserver,8080:frontend
```

Format: `PORT:SERVICE,PORT:SERVICE,...`

## Examples

### Example 1: VSCode Container Dev Server

**Start dev server in vscode container:**
```bash
# In vscode terminal
cd /home/coder/workspace/my-react-app
npm start  # Starts on port 3000
```

**Access via proxy:**
```
http://localhost:8000/proxy/3000/
```

**What happens:**
1. Backend receives request for port 3000
2. Checks mapping: 3000 → vscode
3. Proxies to: `http://vscode:3000/`
4. VSCode container responds with React app
5. Bundle.js loads correctly!

### Example 2: Vite in VSCode

**Start Vite:**
```bash
cd /home/coder/workspace/my-vite-app
npm run dev  # Starts on port 5173
```

**Access via proxy:**
```
http://localhost:8000/proxy/5173/
```

### Example 3: Multiple Dev Servers

Run multiple apps in vscode container:

```bash
# Terminal 1: React on 3000
cd app1 && npm start

# Terminal 2: Vite on 5173
cd app2 && npm run dev

# Terminal 3: Angular on 4200
cd app3 && ng serve
```

Access each via proxy:
- `http://localhost:8000/proxy/3000/` → React app
- `http://localhost:8000/proxy/5173/` → Vite app
- `http://localhost:8000/proxy/4200/` → Angular app

## Troubleshooting

### Issue: bundle.js not found

**Cause:** Proxy is reaching wrong container (e.g., host instead of vscode)

**Solution:** Check logs to see which host succeeded:
```
Trying: http://vscode:3000/
✅ Success with vscode:3000
```

Should show `vscode`, not `localhost` or `host.docker.internal`.

### Issue: Still getting ECONNREFUSED

**Cause:** Dev server not running in vscode container

**Solution:**
1. Check dev server is running: `ps aux | grep npm` (in vscode terminal)
2. Check it's on correct port: `curl http://localhost:3000/` (in vscode terminal)
3. Restart dev server if needed

### Issue: Wrong app showing

**Cause:** Multiple services on same port, wrong one being proxied

**Solution:** Use custom mapping to specify exact service:
```yaml
PROXY_SERVICE_MAP=3000:my-custom-service
```

## Docker Compose Network

All services in `docker-compose.yml` are on the same network:

```yaml
networks:
  default:
    name: coding-agent-network
```

This allows services to reach each other by name:
- `backend` can reach `vscode`
- `vscode` can reach `backend`
- `frontend` can reach `backend`

## Verification

Test the mapping:

```bash
# From backend container (if you can access it)
curl http://vscode:3000/

# From host machine
curl http://localhost:8000/proxy/3000/

# Both should return the same content
```

## Summary

- ✅ Port 3000 in vscode container → `http://vscode:3000/`
- ✅ Proxy automatically uses service name
- ✅ Bundle.js loads correctly
- ✅ No CORS issues
- ✅ No authentication required (disabled for dev)

The proxy now correctly routes to Docker services by name!
