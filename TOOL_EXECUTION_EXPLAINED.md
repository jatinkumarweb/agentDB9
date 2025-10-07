# Tool Execution Architecture Explained

## Where Do Tools Execute?

### The Answer: MCP Server Container

**All MCP tools execute in the MCP server container**, not in the VSCode container.

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌───────────┐  │
│  │   VSCode     │    │  MCP Server  │   │  Backend  │  │
│  │  Container   │    │  Container   │   │ Container │  │
│  │              │    │              │   │           │  │
│  │  /home/coder/│◄───┤  /workspace  │◄──┤  Calls    │  │
│  │  workspace/  │    │              │   │  MCP API  │  │
│  │              │    │  ✅ Tools    │   │           │  │
│  │  (View only) │    │  Execute     │   │           │  │
│  │              │    │  Here!       │   │           │  │
│  └──────────────┘    └──────────────┘   └───────────┘  │
│         │                    │                          │
│         └────────────────────┴──────────────────────────┤
│                              │                          │
│                    ┌─────────▼─────────┐                │
│                    │   Host Machine    │                │
│                    │   ./workspace/    │                │
│                    │   (Shared Volume) │                │
│                    └───────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

## Why This Architecture?

### 1. MCP Server is the Tool Execution Engine

The MCP (Model Context Protocol) server is designed to:
- Execute file operations
- Run terminal commands
- Manage git operations
- Handle project scaffolding

It's the **central tool execution hub** for the entire system.

### 2. VSCode Container is for Viewing/Editing

The VSCode container is for:
- Viewing files in the browser
- Editing code
- Using VSCode extensions
- Providing a development interface

It's **not meant to execute agent tools**.

### 3. Shared Workspace Volume

All three containers share the same workspace:

| Container | Mount Point | Purpose |
|-----------|-------------|---------|
| Host | `./workspace/` | Persistent storage |
| MCP Server | `/workspace` | Tool execution |
| VSCode | `/home/coder/workspace/` | Viewing/editing |

**Result**: Files created by MCP server appear instantly in VSCode and on the host.

## How It Works

### Example: Agent Creates a Project

1. **User asks agent**: "Create a new React project"

2. **Backend receives request** from frontend

3. **Backend calls MCP server**:
   ```bash
   POST http://mcp-server:9001/api/tools/execute
   {
     "tool": "fs_create_directory",
     "parameters": {"path": "/workspace/my-react-app"}
   }
   ```

4. **MCP server executes tool**:
   - Runs in MCP server container
   - Creates folder at `/workspace/my-react-app`
   - Returns success

5. **Files appear everywhere**:
   - Host: `./workspace/my-react-app/`
   - VSCode: `/home/coder/workspace/my-react-app/`
   - MCP: `/workspace/my-react-app/`

6. **User sees it in VSCode** immediately

## Shell Environment

### MCP Server Container

- **Base Image**: Node.js on Alpine Linux
- **Shell**: `/bin/sh` (BusyBox)
- **Package Manager**: npm (available)
- **Tools**: node, npm, git, basic Unix tools

### Why Not Bash?

Alpine Linux uses BusyBox which provides `/bin/sh` but not `/bin/bash`:
- Smaller image size
- Faster startup
- Sufficient for most commands

**Fix Applied**: Changed default shell from `/bin/bash` to `/bin/sh`

## Testing Tool Execution

### Test File Operations

```bash
# Create directory
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_directory","parameters":{"path":"/workspace/test-project"}}'

# Verify in VSCode container
docker-compose exec vscode ls -la /home/coder/workspace/
# Should show: test-project/

# Verify on host
ls -la workspace/
# Should show: test-project/
```

### Test Terminal Commands

```bash
# Run command
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"terminal_execute","parameters":{"command":"pwd","cwd":"/workspace"}}'

# Response shows execution in MCP container:
# {"success":true,"result":{"output":"/workspace"}}
```

### Test npm Commands

```bash
# Create directory first
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_directory","parameters":{"path":"/workspace/my-app"}}'

# Initialize npm project
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"terminal_execute","parameters":{"command":"npm init -y","cwd":"/workspace/my-app"}}'

# Check result on host
cat workspace/my-app/package.json
```

## Common Misconceptions

### ❌ "Tools should execute in VSCode container"

**Why not**: VSCode container is for viewing/editing, not execution. It doesn't have the MCP server tools infrastructure.

### ❌ "Files aren't showing up in VSCode"

**Reality**: They are! The workspace is shared. If you don't see them:
1. Check if MCP server is running: `npm run status:mcp`
2. Verify the file exists on host: `ls -la workspace/`
3. Refresh VSCode file explorer

### ❌ "Terminal commands don't work"

**Fixed**: Changed default shell from bash to sh. Now they work.

## Debugging Tool Execution

### Check Where Files Are Created

```bash
# Create a test file
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_file","parameters":{"path":"/workspace/test.txt","content":"Hello"}}'

# Check in MCP container
docker-compose exec mcp-server cat /workspace/test.txt

# Check in VSCode container
docker-compose exec vscode cat /home/coder/workspace/test.txt

# Check on host
cat workspace/test.txt

# All three should show: Hello
```

### Watch Tool Execution

```bash
# Terminal 1: Watch MCP logs
docker logs -f agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]"

# Terminal 2: Execute a tool
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_directory","parameters":{"path":"/workspace/demo"}}'

# Terminal 1 shows:
# [INFO] [API] Tool execution request: fs_create_directory
# [INFO] [HANDLER] fs_create_directory called with path: /workspace/demo
# [INFO] [API] Tool execution completed: success: true
```

## Benefits of This Architecture

### ✅ Separation of Concerns

- **MCP Server**: Tool execution engine
- **VSCode**: Development interface
- **Backend**: Business logic and orchestration

### ✅ Shared Workspace

- Files created anywhere appear everywhere
- No need to sync between containers
- Single source of truth

### ✅ Scalability

- Can add more tool containers
- Can scale MCP server independently
- VSCode container is lightweight

### ✅ Security

- Tool execution is isolated
- VSCode doesn't need execution permissions
- Clear boundaries between components

## Summary

| Question | Answer |
|----------|--------|
| Where do tools execute? | MCP server container |
| Where are files created? | `/workspace` in MCP container |
| Where do files appear? | Host, VSCode, and MCP (shared volume) |
| What shell is used? | `/bin/sh` (BusyBox on Alpine) |
| Can VSCode execute tools? | No, it's for viewing/editing only |
| Are files synced? | No sync needed - shared volume |
| How to verify execution? | Check MCP logs with `npm run logs:mcp:show` |

## Key Takeaway

**Tools execute in MCP server container, but files appear everywhere due to shared volume mounting.**

This is by design and works correctly. The confusion comes from expecting tools to execute in VSCode, but that's not the architecture. VSCode is just a viewer/editor - MCP server is the execution engine.
