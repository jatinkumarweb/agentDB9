# Gitpod Proxy Fix

## The Issue

You're in a **Gitpod environment**, not a local Docker setup. The proxy is trying to connect to `localhost:5173` but in Gitpod:

1. Services run in different containers/contexts
2. `localhost` inside the backend container doesn't see other services
3. Port forwarding is handled by Gitpod, not direct localhost connections

## The Problem

The proxy controller is doing:
```typescript
const targetUrl = `http://localhost:${port}/${path}`;
```

But in Gitpod, the dev server on port 5173 is:
- Running in a different context
- Accessible via Gitpod's port forwarding
- NOT accessible via `localhost:5173` from the backend container

## Solution Options

### Option 1: Use Gitpod's Internal URLs (Recommended)

Update the proxy to use Gitpod's internal networking:

```typescript
// Instead of: http://localhost:5173
// Use: http://0.0.0.0:5173 or the Gitpod internal URL
```

### Option 2: Start Dev Server in Same Container

Run your dev server in the same container as the backend so `localhost` works.

### Option 3: Use Host Network Mode

Configure the backend to use host network mode so it can access other ports.

## Quick Test

Let me check where your backend is actually running:

```bash
# Check what's listening
gitpod environment port list

# Check if backend can reach dev server
# From inside backend container:
curl http://0.0.0.0:5173/
```

## Immediate Fix

Since you're in Gitpod, the easiest solution is to:

1. **Start dev server in the same terminal/container as backend**
2. **Or use Gitpod's port forwarding URLs directly**

Let me update the proxy controller to handle Gitpod environments...
