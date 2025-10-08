# MCP Command Execution Fix

## Root Cause Analysis

### Issue 1: MCP Server Not Running
**Problem:** The MCP server container was not running, causing all command executions to fall back to the backend container.

**Evidence:**
```bash
$ docker-compose ps mcp-server
NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS
# Empty - container not running
```

**Impact:** Commands executed in backend container instead of proper workspace environment.

---

### Issue 2: Port 8000 Conflict
**Problem:** Next.js dev server tried to use port 8000 instead of 3000.

**Root Cause:**
1. Backend container has `PORT=8000` environment variable
2. When MCP server was down, commands fell back to backend container
3. Next.js picked up the `PORT` environment variable from backend
4. Error: `EADDRINUSE: address already in use 0.0.0.0:8000`

**Evidence from error:**
```json
{
  "stderr": "⨯ Failed to start server\nError: listen EADDRINUSE: address already in use 0.0.0.0:8000",
  "command": "cd next-demo && npm run dev",
  "fallback": true
}
```

The `"fallback": true` indicates command was executed in backend container as fallback.

---

### Issue 3: Command Execution Location
**Problem:** Commands need to execute in an environment that:
- Has access to the workspace files
- Doesn't have conflicting environment variables
- Has proper Node.js and development tools

**Current Architecture:**
```
User Chat → Backend → MCP Server → TerminalTools → Execute Command
                ↓ (if MCP down)
            Fallback to Backend Container
```

**Containers:**
- **Backend Container:** Has `PORT=8000`, meant for API server
- **MCP Server Container:** Has `/workspace` volume, meant for tool execution
- **VSCode Container:** Has `/home/coder/workspace`, user's workspace

---

## The Fix

### 1. Ensure MCP Server Runs
**Action:** Start MCP server container
```bash
docker-compose up -d mcp-server
```

**Verification:**
```bash
docker-compose ps mcp-server
# Should show: Up X seconds
```

---

### 2. Remove PORT from Command Environment
**File:** `mcp-server/src/tools/TerminalTools.ts`

**Change:**
```typescript
const options: any = {
  cwd: workingDir,
  shell: true,
  env: {
    ...process.env,
    // Remove PORT to avoid conflicts with Next.js
    PORT: undefined,
    // Set proper Node environment
    NODE_ENV: 'development'
  }
};
```

**Why:** Prevents Next.js and other dev servers from picking up backend's PORT=8000.

---

### 3. Fix Fallback Execution
**File:** `backend/src/mcp/mcp.service.ts`

**Change:**
```typescript
const { stdout, stderr } = await this.execAsync(command, {
  cwd: this.workspaceRoot,
  timeout: 30000,
  env: {
    ...process.env,
    // Remove PORT to avoid conflicts
    PORT: undefined,
    NODE_ENV: 'development'
  }
});
```

**Why:** Even if MCP server is down, fallback execution won't have PORT conflicts.

---

### 4. Use Workspace Directory
**File:** `mcp-server/src/tools/TerminalTools.ts`

**Change:**
```typescript
// Use workspace directory if no cwd specified
const workingDir = cwd || process.env.WORKSPACE_PATH || '/workspace';
```

**Why:** Ensures commands execute in the shared workspace directory.

---

## Verification

### Test 1: MCP Server Running
```bash
docker-compose ps mcp-server
```

Expected:
```
NAME                    STATUS
agentdb9-mcp-server-1   Up X seconds
```

### Test 2: Command Execution
```bash
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "terminal_execute",
    "parameters": {
      "command": "echo $PORT",
      "cwd": "/workspace"
    }
  }'
```

Expected:
```json
{
  "success": true,
  "result": {
    "output": "",  // Empty because PORT is undefined
    "exitCode": 0
  }
}
```

### Test 3: Next.js Dev Server
Create a Next.js project and run dev server:
```bash
# In chat, ask agent to:
# "Create a Next.js app called test-app and run the dev server"
```

Expected:
- Server starts on port 3000 (default)
- No "EADDRINUSE" error
- No "fallback: true" in response

---

## Architecture Improvements

### Current Flow (Fixed)
```
User Request
  ↓
Backend API
  ↓
MCP Server (http://mcp-server:9001/api/tools/execute)
  ↓
TerminalTools.executeCommand()
  ↓
Execute in /workspace (shared with VSCode)
  ↓
Return result to user
```

### Fallback Flow (Fixed)
```
User Request
  ↓
Backend API
  ↓
MCP Server (unavailable)
  ↓
Backend Fallback Execution
  ↓
Execute in /workspace with clean environment
  ↓
Return result with "fallback: true"
```

---

## Static Files Issue

### Problem
Static files not working in Next.js local development.

### Root Cause
Next.js dev server needs to be running and accessible. When commands execute in wrong container or with wrong PORT, the dev server doesn't start properly.

### Solution
With the PORT fix, Next.js will:
1. Start on default port 3000
2. Serve static files from `public/` directory
3. Hot reload on file changes
4. Be accessible at `http://localhost:3000`

### Verification
```bash
# Create Next.js app
npx create-next-app@latest my-app

# Add static file
echo "Hello" > my-app/public/test.txt

# Start dev server
cd my-app && npm run dev

# Access static file
curl http://localhost:3000/test.txt
# Should return: Hello
```

---

## Environment Variables

### Backend Container
```yaml
environment:
  - PORT=8000              # Backend API port
  - NODE_ENV=development
  - DB_HOST=postgres
  # ... other backend vars
```

### MCP Server Container
```yaml
environment:
  - MCP_PORT=9001          # MCP server port
  - NODE_ENV=development
  - WORKSPACE_PATH=/workspace
  - VSCODE_HOST=vscode
  # NO PORT variable
```

### Command Execution Environment
```typescript
{
  NODE_ENV: 'development',
  WORKSPACE_PATH: '/workspace',
  // PORT is explicitly undefined
  // Other vars inherited from MCP server
}
```

---

## Best Practices

### 1. Always Check MCP Server Status
```bash
docker-compose ps mcp-server
docker logs agentdb9-mcp-server-1
```

### 2. Monitor Command Execution
Check for `"fallback": true` in responses - indicates MCP server is down.

### 3. Clean Environment Variables
When executing commands, only pass necessary environment variables.

### 4. Use Workspace Directory
Always execute commands in `/workspace` or `/home/coder/workspace`.

### 5. Restart Services After Changes
```bash
docker-compose restart mcp-server backend
```

---

## Troubleshooting

### Issue: Commands still use port 8000
**Check:**
```bash
docker logs agentdb9-mcp-server-1 | grep "Executing command"
```

**Solution:**
```bash
docker-compose restart mcp-server
```

### Issue: MCP server not starting
**Check:**
```bash
docker logs agentdb9-mcp-server-1
```

**Common causes:**
- Build errors
- Missing dependencies
- Port conflicts

**Solution:**
```bash
docker-compose build mcp-server
docker-compose up -d mcp-server
```

### Issue: Fallback execution still happening
**Check:**
```bash
curl http://localhost:9001/health
```

**If fails:**
```bash
docker-compose restart mcp-server
# Wait 10 seconds
curl http://localhost:9001/health
```

---

## Summary

**Root Causes:**
1. ✅ MCP server was not running
2. ✅ PORT=8000 from backend leaked into command execution
3. ✅ Commands executed in wrong container

**Fixes Applied:**
1. ✅ Started MCP server
2. ✅ Removed PORT from command environment
3. ✅ Set proper working directory (/workspace)
4. ✅ Fixed fallback execution environment

**Result:**
- Commands execute in proper workspace
- No PORT conflicts
- Next.js uses default port 3000
- Static files work correctly
- Dev servers start properly

**Files Modified:**
- `mcp-server/src/tools/TerminalTools.ts`
- `backend/src/mcp/mcp.service.ts`
- `MCP_COMMAND_EXECUTION_FIX.md` (this file)
