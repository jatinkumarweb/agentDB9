# MCP Server Status & Debugging Guide

## Current Status: ✅ WORKING

The MCP server is running and functional. It just wasn't showing in your log stream.

## Verification

### 1. Check MCP Server is Running
```bash
docker-compose ps mcp-server
# Should show: Up X minutes, ports 9001-9002
```

### 2. Check Health
```bash
curl http://localhost:9001/health
# Should return: {"status":"ok","service":"AgentDB9 MCP Server",...}
```

### 3. View MCP Server Logs
```bash
# Option 1: Direct docker logs
docker logs agentdb9-mcp-server-1 --tail=50

# Option 2: Using npm script
npm run logs:mcp

# Option 3: All services including MCP
npm run logs
# Now includes: frontend, backend, llm-service, mcp-server, ollama
```

### 4. Test Tool Execution
```bash
# Create a directory
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_directory","parameters":{"path":"/workspace/my-test"}}'

# Verify it was created
ls -la workspace/
# Should show: my-test/
```

## What You're Seeing in Runtime Logs

Your runtime logs show:
- ✅ **Ollama**: Loading model, processing requests
- ✅ **Backend**: Broadcasting messages, executing tools
- ✅ **VSCode**: Running (with permission warnings - normal)
- ❌ **MCP Server**: Not visible in combined stream

### Why MCP Server Logs Weren't Showing

1. **Default logs command** didn't include mcp-server
2. **Fixed**: Updated `npm run logs` to include mcp-server
3. **Now**: Run `npm run logs` to see all services including MCP

## MCP Server Logs You Should See

When MCP server is working, you'll see:

```
[INFO] Starting MCP Server for AgentDB9...
[INFO] Registered tool: fs_read_file
[INFO] Registered tool: fs_write_file
...
[INFO] Registering tool handlers...
[INFO] Registered handler for tool: fs_read_file
[INFO] Registered handler for tool: fs_write_file
...
[INFO] Tool handlers registered successfully
[INFO] 🚀 MCP Server started on port 9001
[INFO] 🔗 Connected to VS Code at vscode:8080
```

When tools are executed:
```
[INFO] [API] Tool execution request: fs_create_directory { hasHandler: true }
[INFO] [HANDLER] fs_create_directory called with path: /workspace/demo
[INFO] Created directory: /workspace/demo
[INFO] [API] Tool execution completed: fs_create_directory { success: true, duration: 2 }
```

## Backend vs MCP Server Tool Execution

### Backend's execute_command
Your logs show:
```
backend: Executing tool: execute_command with args: { command: 'mkdir demo && cd demo && npm init -y' }
backend: stderr: "mkdir: cannot create directory 'demo': File exists"
```

This is the **backend's built-in execute_command**, not the MCP server's terminal_execute.

### Two Different Tool Systems

1. **Backend Built-in Tools** (what you're seeing):
   - `execute_command` - Backend's own implementation
   - Executes directly in backend container
   - Used by conversations service

2. **MCP Server Tools** (what we fixed):
   - `terminal_execute` - MCP server's implementation
   - Executes in MCP server container
   - Used when explicitly calling MCP API

### Why Backend Isn't Using MCP Server

The backend has its own tool execution for backward compatibility. To use MCP server tools, the backend needs to be configured to route tool calls through MCP.

## Debugging Commands

### Check if MCP server is receiving requests
```bash
# Watch MCP logs in real-time
docker logs -f agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]"
```

### Test MCP server directly
```bash
# List available tools
curl http://localhost:9001/api/tools | jq '.tools[] | .name' | head -20

# Execute a tool
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_list_directory","parameters":{"path":"/workspace"}}' | jq '.'
```

### Check backend MCP integration
```bash
# Check if backend is configured to use MCP
docker logs agentdb9-backend-1 2>&1 | grep -i "mcp"
```

## Common Issues

### Issue: "mkdir: cannot create directory 'demo': File exists"
**Cause**: Folder already exists from previous test
**Fix**: 
```bash
sudo rm -rf workspace/demo
```

### Issue: MCP server not in logs
**Cause**: Default logs command didn't include mcp-server
**Fix**: Already fixed in latest commit
```bash
git pull origin main
npm run logs  # Now includes MCP server
```

### Issue: Backend not using MCP server
**Cause**: Backend has its own execute_command implementation
**Solution**: This is by design. Backend can use either:
- Its own built-in tools (current)
- MCP server tools (requires configuration)

## Next Steps

### To See MCP Server in Action

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **View logs with MCP included**:
   ```bash
   npm run logs
   # Or specifically:
   npm run logs:mcp
   ```

3. **Test MCP server directly**:
   ```bash
   curl -X POST http://localhost:9001/api/tools/execute \
     -H "Content-Type: application/json" \
     -d '{"tool":"fs_create_directory","parameters":{"path":"/workspace/test-project"}}'
   
   ls -la workspace/  # Verify folder created
   ```

4. **Watch MCP logs during agent interaction**:
   ```bash
   # In one terminal:
   docker logs -f agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]"
   
   # In another terminal or browser:
   # Use the chat interface to ask agent to create files
   ```

## Summary

✅ **MCP Server Status**: Running and functional
✅ **Tool Handlers**: Registered and working
✅ **File Operations**: Creating folders successfully
✅ **Logging**: Comprehensive with [API] and [HANDLER] tags
✅ **Logs Command**: Fixed to include mcp-server

The MCP server is working correctly. It just wasn't visible in your log stream because the default logs command didn't include it. This is now fixed.

## Verification Checklist

- [x] MCP server container is running
- [x] Health endpoint responds
- [x] Tools are registered (77 tools)
- [x] Handlers are registered (fs_*, terminal_execute)
- [x] File operations work (tested fs_create_directory)
- [x] Detailed logging is active
- [x] Logs command includes mcp-server
- [ ] Backend configured to use MCP server (optional)
- [ ] Test with actual agent chat interaction
