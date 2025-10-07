# Gitpod Workspace Setup

## Understanding the Setup

You're in **Gitpod**, which has TWO different VSCode instances:

1. **Gitpod IDE** (right side) - The VSCode you're using now
   - This is Gitpod's built-in editor
   - Shows the entire project: `/workspaces/agentDB9`
   - This is normal and expected

2. **Embedded VSCode** (in the app) - A separate code-server container
   - Runs in a Docker container
   - Accessible at `http://localhost:8080`
   - Embedded in your frontend app's workspace page
   - Shows only the `workspace/` folder for user projects
   - **This is what needs to be started**

## The Issue

When you visit `http://localhost:3000/workspace`, the page tries to embed the VSCode container, but:
- ❌ Docker services aren't running yet
- ❌ VSCode container (port 8080) isn't available
- ❌ MCP server (port 9001) isn't available
- ❌ This causes the 500 errors you're seeing

## Solution: Start the Services

### Step 1: Start Docker Compose Services

```bash
# Start all services in the background
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### Step 2: Wait for Services to Start

```bash
# Check service status
docker-compose ps

# Should show these services running:
# - frontend (port 3000)
# - backend (port 8000)
# - vscode (port 8080) ← This is the embedded VSCode
# - mcp-server (port 9001)
# - llm-service (port 9000)
# - postgres (port 5432)
# - redis (port 6379)
# - qdrant (port 6333)
# - ollama (port 11434)
```

### Step 3: Verify VSCode Container

```bash
# Check if VSCode is accessible
curl -I http://localhost:8080

# Should return: HTTP/1.1 200 OK
```

### Step 4: Check Workspace Folder

```bash
# The workspace folder is on your host
ls -la workspace/

# Inside the VSCode container, it's mounted at:
docker-compose exec vscode ls -la /home/coder/workspace
```

## Where Files Are Created

When you create files through the workspace page:

1. **On your host machine**: `/workspaces/agentDB9/workspace/`
2. **Inside VSCode container**: `/home/coder/workspace/`
3. **Inside MCP server**: `/workspace/`

They're all the same folder, just mounted at different paths!

## Testing the Setup

### 1. Create a test file from command line:

```bash
echo "console.log('Hello from workspace');" > workspace/test.js
```

### 2. Check it appears in VSCode container:

```bash
docker-compose exec vscode cat /home/coder/workspace/test.js
```

### 3. Open the workspace page:

Visit: `http://localhost:3000/workspace`

You should see:
- ✅ No console errors
- ✅ VSCode embedded in the page
- ✅ Only `workspace/` folder visible (not entire project)
- ✅ Your `test.js` file visible

## Troubleshooting

### Services won't start?

```bash
# Check for errors
docker-compose logs

# Rebuild if needed
docker-compose build
docker-compose up -d
```

### Port conflicts?

```bash
# Check what's using ports
sudo lsof -i :3000 -i :8000 -i :8080

# Stop conflicting services or change ports in docker-compose.yml
```

### VSCode shows entire project instead of workspace/?

This means the old container is still running. Fix:

```bash
# Stop and remove old container
docker-compose stop vscode
docker-compose rm -f vscode

# Start with new configuration
docker-compose up -d vscode

# Verify the mount
docker inspect agentdb9-vscode-1 | grep -A 5 Mounts
# Should show: ./workspace:/home/coder/workspace
```

## Summary

- **Gitpod IDE** (right side): Shows entire project - this is correct
- **Embedded VSCode** (in app): Shows only `workspace/` folder - needs docker-compose running
- **Files location**: `/workspaces/agentDB9/workspace/` on host
- **Start command**: `docker-compose up -d`
