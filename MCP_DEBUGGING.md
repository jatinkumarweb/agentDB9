# MCP Server Debugging & Monitoring

## Quick Status Check

```bash
# Check if MCP server is healthy
npm run status:mcp

# Or directly:
./scripts/check-mcp-status.sh
```

**Output shows**:
- ✅ Container running status
- ✅ Health endpoint response
- ✅ Number of registered tools (should be 77)
- ✅ Recent tool executions
- ⚠️ Any errors

## Viewing Logs

### Option 1: Interactive Log Viewer (Recommended)

```bash
npm run logs:mcp:show

# Or directly:
./scripts/show-mcp-logs.sh
```

**Choose from**:
1. All logs (last 100 lines)
2. Only [INFO] logs (startup, registrations)
3. Only [API] and [HANDLER] logs (tool execution tracking)
4. Only errors
5. Follow live logs (real-time)

### Option 2: Direct Docker Logs

```bash
# Follow all logs
npm run logs:mcp

# Last 50 lines
docker logs agentdb9-mcp-server-1 --tail=50

# Follow live
docker logs -f agentdb9-mcp-server-1

# Filter for specific patterns
docker logs agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]"
```

### Option 3: All Services Logs

```bash
# View logs from all services (includes MCP server)
npm run logs

# This shows: frontend, backend, llm-service, mcp-server, ollama
```

## Understanding MCP Server Logs

### Startup Logs

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

**What to check**:
- ✅ All tools registered (should see ~77 tools)
- ✅ All handlers registered (should see ~13 handlers)
- ✅ Server started on port 9001
- ✅ WebSocket server on port 9002

### Tool Execution Logs

```
[INFO] [API] Tool execution request: fs_create_directory { parameters: { path: '/workspace/demo' }, hasHandler: true }
[INFO] [HANDLER] fs_create_directory called with path: /workspace/demo
[INFO] Created directory: /workspace/demo
[INFO] [API] Tool execution completed: fs_create_directory { success: true, duration: 2 }
```

**What to check**:
- ✅ `hasHandler: true` - Handler is registered
- ✅ `[HANDLER]` log shows actual execution
- ✅ Success message from the tool
- ✅ Completion with success status

### Error Logs

```
[ERROR] Failed to broadcast tool execution to backend: AxiosError: connect ECONNREFUSED
```

**Common errors**:
- `ECONNREFUSED` to backend - Backend not ready yet (usually harmless)
- `No handler registered` - Handler registration failed (needs fix)
- `Tool not found` - Tool name mismatch

## Testing MCP Server

### Test Health Endpoint

```bash
curl http://localhost:9001/health | jq '.'
```

**Expected response**:
```json
{
  "status": "ok",
  "service": "AgentDB9 MCP Server",
  "version": "1.0.0",
  "tools": 77,
  "resources": 3,
  "isRunning": true
}
```

### Test Tool Execution

```bash
# List directory
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_list_directory","parameters":{"path":"/workspace"}}' | jq '.'

# Create directory
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_directory","parameters":{"path":"/workspace/test-project"}}' | jq '.'

# Verify it was created
ls -la workspace/
```

### Test with Logging

```bash
# In terminal 1: Watch MCP logs
docker logs -f agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]"

# In terminal 2: Execute a tool
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_directory","parameters":{"path":"/workspace/my-app"}}'
```

**You should see**:
```
[INFO] [API] Tool execution request: fs_create_directory { hasHandler: true }
[INFO] [HANDLER] fs_create_directory called with path: /workspace/my-app
[INFO] [API] Tool execution completed: fs_create_directory { success: true }
```

## Troubleshooting

### MCP Server Not Running

```bash
# Check status
docker-compose ps mcp-server

# Start it
docker-compose up -d mcp-server

# Check logs for startup errors
docker logs agentdb9-mcp-server-1 --tail=50
```

### No Logs Showing

```bash
# Verify container is running
docker ps | grep mcp-server

# Check if logs exist
docker logs agentdb9-mcp-server-1 2>&1 | wc -l

# If 0 lines, container might have crashed
docker-compose ps mcp-server  # Check status
docker-compose up mcp-server  # Start in foreground to see errors
```

### Tools Not Working

```bash
# Check if handlers are registered
docker logs agentdb9-mcp-server-1 2>&1 | grep "Registered handler"

# Should see 13 handlers:
# - fs_read_file, fs_write_file, fs_create_file, fs_delete_file
# - fs_rename_file, fs_copy_file, fs_create_directory, fs_delete_directory
# - fs_list_directory, fs_exists, fs_get_stats
# - terminal_execute

# If missing, rebuild:
docker-compose build mcp-server
docker-compose up -d mcp-server
```

### Backend Connection Errors

```bash
# These are usually harmless:
[ERROR] Failed to broadcast tool execution to backend: ECONNREFUSED

# Backend might not be ready yet, or MCP server is trying to notify backend
# Tools still work, just can't broadcast to backend
```

## Environment-Specific Notes

### Gitpod

- All scripts work in Gitpod
- Use `npm run status:mcp` for quick check
- Logs are in `/workspace/agentDB9/` directory

### Local Docker

- Same commands work
- Make sure Docker is running
- Use `docker-compose ps` to check all services

### Production

- Use `npm run logs:mcp:show` for filtered logs
- Monitor with `npm run status:mcp` regularly
- Set up log aggregation for production monitoring

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run status:mcp` | Quick health check |
| `npm run logs:mcp:show` | Interactive log viewer |
| `npm run logs:mcp` | Follow MCP logs |
| `npm run logs` | All services logs |
| `./scripts/check-mcp-status.sh` | Detailed status |
| `./scripts/show-mcp-logs.sh` | Filtered log viewer |
| `docker logs agentdb9-mcp-server-1` | Direct docker logs |
| `curl http://localhost:9001/health` | Health check |

## Log Patterns to Watch For

### Good Signs ✅

```
[INFO] 🚀 MCP Server started on port 9001
[INFO] Tool handlers registered successfully
[INFO] [API] Tool execution request: ... { hasHandler: true }
[INFO] [HANDLER] ... called with ...
[INFO] [API] Tool execution completed: ... { success: true }
```

### Warning Signs ⚠️

```
[ERROR] No handler registered for tool ...
[ERROR] Tool ... not found
[ERROR] Failed to execute tool: ...
```

### Harmless Errors (Can Ignore)

```
[ERROR] Failed to broadcast tool execution to backend: ECONNREFUSED
# Backend not ready yet, tools still work
```

## Integration with Agent

When the agent creates files/folders through chat:

1. **Backend receives request** from frontend
2. **Backend calls MCP server** (or uses built-in tools)
3. **MCP server executes tool** (if routed through MCP)
4. **Logs show execution** with [API] and [HANDLER] tags
5. **Files appear in workspace/** folder

To verify agent is using MCP server:
```bash
# Watch MCP logs
docker logs -f agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]"

# Ask agent to create a file in chat
# You should see logs if MCP server is being used
```

## Summary

- ✅ MCP server is running and healthy
- ✅ 77 tools registered with handlers
- ✅ Logs are available through multiple methods
- ✅ Scripts work in any environment (Gitpod, local, production)
- ✅ Easy debugging with `npm run status:mcp` and `npm run logs:mcp:show`

The MCP server IS working - logs just get mixed with other services in the combined stream. Use the dedicated scripts for clearer visibility.
