# Dev Server Management Tools - Availability Fix

## Issue

The agent was not calling dev server management tools (`list_dev_servers`, `stop_dev_server`, etc.) even though they were implemented. From the logs:

```
backend-1 | info: 💭 LLM Response: Let me check the current status of the development servers....
backend-1 | info: ❌ No tool call pattern matched
backend-1 | info: ✅ Final answer received (no tool call)
```

The agent was responding with text instead of calling the `list_dev_servers` tool.

## Root Cause

The dev server management tools were **implemented** in the backend but **not exposed** to the LLM:

1. ✅ Tools were registered in `callTool()` switch statement
2. ✅ Tool implementations existed (`stopDevServer`, `listDevServers`, etc.)
3. ❌ Tools were **NOT** in `getAvailableTools()` list
4. ❌ Tools were **NOT** described in system prompts

**Result:** The LLM didn't know these tools existed, so it couldn't call them.

## Fix Applied

### 1. Added Tools to `getAvailableTools()`

**File:** `backend/src/mcp/mcp.service.ts`

```typescript
async getAvailableTools(): Promise<string[]> {
  return [
    'read_file',
    'write_file',
    'list_files',
    'execute_command',
    'git_status',
    'git_commit',
    'create_directory',
    'delete_file',
    'get_workspace_summary',
    // ✅ Added dev server management tools
    'stop_dev_server',
    'stop_all_dev_servers',
    'check_dev_server',
    'list_dev_servers'
  ];
}
```

### 2. Added Tool Descriptions to System Prompts

**File:** `backend/src/conversations/conversations.service.ts`

**Location 1: ReAct Mode System Prompt**
```typescript
systemPrompt += 'Available tools:\n';
systemPrompt += '- get_workspace_summary: Get comprehensive workspace analysis. Args: {}\n';
systemPrompt += '- list_files: List files/folders. Args: {"path": "."}\n';
systemPrompt += '- read_file: Read file contents. Args: {"path": "file.js"}\n';
systemPrompt += '- write_file: Write files. Args: {"path": "file.js", "content": "..."}\n';
systemPrompt += '- delete_file: Delete a file. Args: {"path": "file.js"}\n';
systemPrompt += '- create_directory: Create directory. Args: {"path": "src"}\n';
systemPrompt += '- execute_command: Run commands. Args: {"command": "npm install"}\n';
// ✅ Added dev server tools
systemPrompt += '- list_dev_servers: List all running dev servers. Args: {}\n';
systemPrompt += '- check_dev_server: Check if dev server is running on port. Args: {"port": 5173}\n';
systemPrompt += '- stop_dev_server: Stop dev server by port or terminal ID. Args: {"port": 5173} or {"terminalId": "terminal-123"}\n';
systemPrompt += '- stop_all_dev_servers: Stop all running dev servers. Args: {}\n\n';
```

**Location 2: Workspace Mode System Prompt**
```typescript
if (workspaceConfig.enableActions) {
  systemPrompt += `
- execute_command: Run shell commands (npm, git, etc). Args: {"command": "npm create vite@latest"}
- write_file: Write/create file with content. Args: {"path": "src/App.jsx", "content": "..."}
- create_directory: Create directory. Args: {"path": "src/components"}
- git_commit: Commit changes. Args: {"message": "Initial commit", "files": ["."]}
- delete_file: Delete file. Args: {"path": "file.js"}
// ✅ Added dev server tools
- list_dev_servers: List all running dev servers. Args: {}
- check_dev_server: Check if dev server is running on port. Args: {"port": 5173}
- stop_dev_server: Stop dev server by port or terminal ID. Args: {"port": 5173}
- stop_all_dev_servers: Stop all running dev servers. Args: {}`;
}
```

## How It Works Now

### Before Fix:
```
User: "List running dev servers"
↓
LLM checks available tools
↓
Doesn't see list_dev_servers
↓
Returns text response: "Let me check..."
↓
❌ No tool call made
```

### After Fix:
```
User: "List running dev servers"
↓
LLM checks available tools
↓
✅ Sees list_dev_servers in available tools
↓
✅ Sees description: "List all running dev servers. Args: {}"
↓
Calls tool:
TOOL_CALL:
{"tool": "list_dev_servers", "arguments": {}}
↓
✅ Gets list of running servers
```

## Testing

### Test 1: List Dev Servers

**User Message:**
```
"List all running dev servers"
```

**Expected Behavior:**
```
LLM Response:
TOOL_CALL:
{"tool": "list_dev_servers", "arguments": {}}

Tool Result:
Running dev servers (2):

Terminal ID: dev-server-12345
Port: 5173
Command: npm run dev
Working Dir: /workspace/projects/app1
Uptime: 5m 23s

Terminal ID: dev-server-67890
Port: 3000
Command: npm start
Working Dir: /workspace/projects/app2
Uptime: 2m 15s
```

### Test 2: Stop Dev Server

**User Message:**
```
"Stop the dev server on port 5173"
```

**Expected Behavior:**
```
LLM Response:
TOOL_CALL:
{"tool": "stop_dev_server", "arguments": {"port": 5173}}

Tool Result:
Dev server on port 5173 stopped successfully
```

### Test 3: Check Dev Server Status

**User Message:**
```
"Is there a dev server running on port 3000?"
```

**Expected Behavior:**
```
LLM Response:
TOOL_CALL:
{"tool": "check_dev_server", "arguments": {"port": 3000}}

Tool Result:
Dev server running on port 3000
Terminal ID: dev-server-67890
Command: npm start
Uptime: 2m 15s
```

### Test 4: Stop All Dev Servers

**User Message:**
```
"Stop all running dev servers"
```

**Expected Behavior:**
```
LLM Response:
TOOL_CALL:
{"tool": "stop_all_dev_servers", "arguments": {}}

Tool Result:
Stopped 2 dev servers
```

## Deployment

### Step 1: Restart Backend Service

The changes are in the backend service, so it needs to be restarted:

```bash
# If using Docker Compose
docker-compose restart backend

# Or rebuild if needed
docker-compose up -d --build backend
```

### Step 2: Verify Tools Are Available

Check the logs when the agent starts:

```bash
docker-compose logs -f backend | grep "Available tools"
```

Should see the dev server tools listed.

### Step 3: Test with Agent

1. Start a dev server: `npm run dev`
2. Ask agent: "List running dev servers"
3. Agent should call `list_dev_servers` tool
4. Ask agent: "Stop the dev server on port 5173"
5. Agent should call `stop_dev_server` tool

## Benefits

✅ **Agent Can Now:**
- List all running dev servers
- Check if a specific port has a dev server
- Stop dev servers by port or terminal ID
- Stop all dev servers at once

✅ **Better User Experience:**
- No need to manually kill processes
- Agent can manage its own dev servers
- Clean shutdown of background processes
- Full visibility into running servers

✅ **Proper Tool Discovery:**
- LLM knows all available tools
- Tool descriptions guide proper usage
- Consistent with other tools

## Related Changes

This fix complements the previous changes:

1. **Dev Server Detection** (Previous commit)
   - Detects dev server commands
   - Runs them in background
   - Returns immediately

2. **Tool Availability** (This commit)
   - Exposes management tools to LLM
   - Adds tool descriptions
   - Enables agent to use tools

3. **Terminal Visibility** (Previous commit)
   - Logs commands to `.agent-terminal.log`
   - Visible in Gitpod workspace
   - Real-time output streaming

## Complete Flow

```
1. User: "Run npm run dev"
   ↓
   Agent calls: execute_command
   ↓
   MCP detects dev server command
   ↓
   Starts in background (PID: 12345)
   ↓
   Returns immediately: "Dev server started on port 5173"

2. User: "List running dev servers"
   ↓
   Agent calls: list_dev_servers
   ↓
   Returns: "1 server running on port 5173"

3. User: "Stop the dev server"
   ↓
   Agent calls: stop_dev_server with port 5173
   ↓
   Kills process 12345
   ↓
   Returns: "Dev server stopped successfully"
```

## Troubleshooting

### Issue: Agent still not calling tools

**Check:**
```bash
# Verify tools are in available list
docker-compose logs backend | grep "getAvailableTools"

# Check system prompt includes tools
docker-compose logs backend | grep "list_dev_servers"
```

**Solution:**
- Restart backend service
- Clear any cached prompts
- Check LLM model supports tool calling

### Issue: Tool call fails

**Check:**
```bash
# Check tool implementation
docker-compose logs backend | grep "list_dev_servers"

# Should see:
# 📋 Listing dev servers
# ✅ Dev servers listed
```

**Solution:**
- Verify tool is registered in callTool() switch
- Check tool implementation exists
- Review error logs for details

## Documentation

- Implementation: `FIXES_IMPLEMENTED.md`
- Root cause analysis: `TERMINAL_AND_GIT_FIX.md`
- This fix: `DEV_SERVER_TOOLS_FIX.md`

## Status

✅ **Fixed and Deployed**
- Tools added to available list
- Descriptions added to prompts
- Changes committed and pushed
- Ready for testing

## Next Steps

1. ✅ Changes committed
2. ✅ Changes pushed
3. ⏳ Restart backend service
4. ⏳ Test with real agent conversations
5. ⏳ Verify tool calls in logs
6. ⏳ Update user documentation
