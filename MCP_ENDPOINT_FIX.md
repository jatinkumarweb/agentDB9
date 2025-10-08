# MCP Server Endpoint Fix

## Issue

Commands were failing with MCP server errors:

```
[ERROR] Agent action execution error: TypeError: Cannot read properties of undefined (reading 'type')
at MCPServer.executeAgentAction (/app/src/server/MCPServer.ts:433:51)
```

Backend was falling back to local execution:
```
warn: MCP Server unavailable, falling back to local execution
```

## Root Cause

**Backend was calling the wrong MCP server endpoint!**

### Wrong Endpoint (Before)
```typescript
const response = await fetch(`${this.mcpServerUrl}/api/execute`, {
  method: 'POST',
  body: JSON.stringify({
    tool: 'terminal_execute',
    parameters: { command, cwd, timeout, shell }
  })
});
```

**Problem:** `/api/execute` expects `{action, context}` format (for agent actions), but backend was sending `{tool, parameters}` format (for tool execution).

### Correct Endpoint (After)
```typescript
const response = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
  method: 'POST',
  body: JSON.stringify({
    tool: 'terminal_execute',
    parameters: { command, cwd, timeout, shell }
  })
});
```

**Solution:** Use `/api/tools/execute` which expects `{tool, parameters}` format.

## MCP Server Endpoints

### `/api/execute` - Agent Actions
**Purpose:** Execute high-level agent actions (create_file, write_code, etc.)

**Request Format:**
```json
{
  "action": {
    "type": "create_file",
    "path": "/path/to/file",
    "content": "..."
  },
  "context": {
    "conversationId": "...",
    "userId": "..."
  }
}
```

**Handler:** `MCPServer.executeAgentAction()`

### `/api/tools/execute` - Tool Execution
**Purpose:** Execute MCP tools (terminal_execute, fs_read_file, etc.)

**Request Format:**
```json
{
  "tool": "terminal_execute",
  "parameters": {
    "command": "npm run dev",
    "cwd": "/workspace",
    "timeout": 60000
  }
}
```

**Handler:** `MCPServer.executeTool()`

## The Fix

**File:** `backend/src/mcp/mcp.service.ts`

**Line 215:**
```diff
- const response = await fetch(`${this.mcpServerUrl}/api/execute`, {
+ const response = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
```

**Impact:**
- ✅ Commands now execute via MCP server correctly
- ✅ No more TypeError crashes
- ✅ No more fallback to backend container
- ✅ Commands logged to agent terminal log
- ✅ Proper workspace directory usage

## Verification

### Before Fix
```bash
$ docker logs agentdb9-mcp-server-1 | grep ERROR
[ERROR] Agent action execution error: TypeError: Cannot read properties of undefined (reading 'type')
[ERROR] Agent action execution error: TypeError: Cannot read properties of undefined (reading 'type')
...
```

```bash
$ docker logs agentdb9-backend-1 | grep fallback
warn: MCP Server unavailable, falling back to local execution
```

### After Fix
```bash
$ docker logs agentdb9-mcp-server-1 | grep "Executing tool"
[INFO] Executing tool: terminal_execute with args: { command: 'cd next-demo && npm run dev' }
```

```bash
$ docker logs agentdb9-backend-1 | grep "Executing command"
log: Executing command in VSCode container: cd next-demo && npm run dev
```

## Testing

### Test Command Execution
```bash
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "terminal_execute",
    "parameters": {
      "command": "echo Hello from MCP",
      "cwd": "/workspace"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "output": "Hello from MCP",
    "exitCode": 0
  }
}
```

### Check Agent Terminal Log
```bash
docker exec agentdb9-vscode-1 tail -20 /home/coder/workspace/.agent-terminal.log
```

**Expected:**
```
════════════════════════════════════════════════════════════════════════════════
[2025-10-08T18:45:00.000Z] Agent Terminal
Command: echo Hello from MCP
Directory: /workspace
════════════════════════════════════════════════════════════════════════════════

Hello from MCP

────────────────────────────────────────────────────────────────────────────────
✓ SUCCESS (5ms)
────────────────────────────────────────────────────────────────────────────────
```

## Impact on User Experience

### Before (Broken)
1. User asks agent to run command
2. Backend calls `/api/execute` with wrong format
3. MCP server crashes with TypeError
4. Backend falls back to local execution
5. Command runs in backend container (wrong environment)
6. No logging to agent terminal log
7. User sees generic error message

### After (Fixed)
1. User asks agent to run command
2. Backend calls `/api/tools/execute` with correct format ✅
3. MCP server executes command successfully ✅
4. Command runs in workspace with proper environment ✅
5. Output logged to agent terminal log ✅
6. User sees clear success/failure with full output ✅

## Related Issues

### Issue 1: next-demo Directory
**Status:** Separate issue - directory doesn't exist

**Solution:** User needs to create the project first:
```
"Create a Next.js app called next-demo"
```

### Issue 2: Agent Terminal Log Visibility
**Status:** Fixed in previous commit

**Solution:** VSCode settings added to show `.agent-terminal.log`

### Issue 3: Ollama Performance
**Status:** Working as designed

**Performance:** 3-4 seconds when model is loaded (30min keep-alive)

## Summary

**Root Cause:** Backend calling wrong MCP server endpoint

**Fix:** Changed `/api/execute` → `/api/tools/execute`

**Result:** 
- ✅ Command execution working
- ✅ MCP server stable
- ✅ Agent terminal log working
- ✅ Proper workspace environment

**Files Changed:**
- `backend/src/mcp/mcp.service.ts` (1 line)

**Commit:** `4dffbeb`

**Status:** ✅ Fixed and pushed to main
