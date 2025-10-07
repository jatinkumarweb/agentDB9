# Workspace Configuration Fix

## Issues Identified

1. **VSCode still showing project root**: Services need to be restarted for docker-compose changes to take effect
2. **Workspace API 500 errors**: MCP server URL was using `localhost` instead of docker service name
3. **Missing workspace path**: Frontend API was using old VSCode path `/home/coder/workspace` instead of new `/workspace`

## Fixes Applied

### 1. Updated Workspace API Routes

**File**: `frontend/src/app/api/workspace/files/route.ts`
- Changed MCP server URL from `http://localhost:9001` to `http://mcp-server:9001`
- Changed workspace path from `/home/coder/workspace` to `/workspace`
- Added better error logging

**File**: `frontend/src/app/api/workspace/save-file/route.ts`
- Changed MCP server URL from `http://localhost:9001` to `http://mcp-server:9001`

### 2. Created Restart Script

**File**: `restart-workspace-services.sh`
- Stops and removes affected containers
- Starts services with new configuration
- Shows service status

## How to Apply the Fix

### Option 1: Restart Specific Services (Faster)

```bash
./restart-workspace-services.sh
```

### Option 2: Full Restart (Recommended)

```bash
docker-compose down
docker-compose up -d
```

### Option 3: Manual Restart

```bash
# Stop services
docker-compose stop vscode mcp-server frontend

# Remove containers
docker-compose rm -f vscode mcp-server frontend

# Start services
docker-compose up -d vscode mcp-server frontend
```

## Verify the Fix

1. **Check VSCode workspace**:
   - Open http://localhost:8080
   - Should show only the `workspace/` folder with README.md
   - Should NOT show backend/, frontend/, docker-compose.yml, etc.

2. **Check console errors**:
   - Open http://localhost:3000/workspace
   - Open browser console (F12)
   - Should NOT see 500 errors for `/api/workspace/files`

3. **Check service logs**:
   ```bash
   # VSCode logs
   docker-compose logs vscode | tail -20
   
   # MCP server logs
   docker-compose logs mcp-server | tail -20
   
   # Frontend logs
   docker-compose logs frontend | tail -20
   ```

## What Changed

### Docker Compose Configuration
- VSCode now mounts `./workspace` instead of `.` (entire project)
- MCP server now mounts `./workspace` instead of `.`
- Added `WORKSPACE_PATH=/workspace` environment variable to MCP server

### Workspace Structure
```
workspace/
  └── README.md    # Clean starting point for users
```

### API Configuration
- Frontend APIs now use docker service names instead of localhost
- Workspace path updated to match new mount point

## Expected Behavior

After applying the fix:

1. **VSCode Container**:
   - Opens with clean workspace folder
   - Only shows user projects, not infrastructure files
   - Persistent extensions and settings via docker volumes

2. **Workspace API**:
   - Successfully lists files in workspace
   - No 500 errors in console
   - Can save files through MCP server

3. **Agent Integration**:
   - Agents can create files in workspace
   - LLM service responds properly (not fallback messages)
   - MCP tools work with workspace files

## Troubleshooting

### If VSCode still shows project root:
```bash
# Check if container is using new volume
docker inspect agentdb9-vscode-1 | grep -A 5 Mounts

# Should show: ./workspace:/home/coder/workspace
```

### If workspace API still returns 500:
```bash
# Check MCP server is running
docker-compose ps mcp-server

# Check MCP server logs
docker-compose logs mcp-server --tail=50

# Test MCP server directly
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_list_directory","parameters":{"path":"/workspace"}}'
```

### If services won't start:
```bash
# Check for port conflicts
netstat -tulpn | grep -E ':(3000|8000|8080|9001|9002)'

# Check docker logs
docker-compose logs --tail=100

# Rebuild if needed
docker-compose build vscode mcp-server frontend
docker-compose up -d
```
