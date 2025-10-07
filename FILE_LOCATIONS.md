# File Creation Locations

## Where Agent-Created Files Appear

When agents execute tool calls like `execute_command`, `write_file`, or `create_directory`, files are created in the **project root directory** and appear in multiple locations simultaneously.

### File Flow

```
Agent Tool Call
      ↓
Backend MCP Service (/workspace)
      ↓
Project Root (/workspaces/agentDB9)
      ↓
Visible in:
  ├─ Gitpod VSCode (if in Gitpod)
  ├─ Local IDE (if running locally)
  ├─ Embedded VSCode (port 8080/8081)
  └─ Docker containers (via volume mount)
```

## Workspace Mounting

All services share the same workspace directory:

| Service | Container Path | Host Path | Purpose |
|---------|---------------|-----------|---------|
| **backend** | `/workspace` | `.` (project root) | Executes tool calls |
| **vscode** | `/home/coder/workspace` | `.` (project root) | Displays files in IDE |
| **mcp-server** | `/workspace` | `.` (project root) | MCP tool execution |
| **workspace** | `/workspace` | `.` (project root) | Dev container |

## Example: Creating a New Project

When you ask an agent to "create a new React project":

### 1. Agent Generates Tool Call
```xml
<tool_call>
<tool_name>execute_command</tool_name>
<arguments>{"command": "mkdir my-app && cd my-app && npm init -y"}</arguments>
</tool_call>
```

### 2. Backend Executes Command
```bash
# Runs in: /workspace (inside backend container)
mkdir my-app && cd my-app && npm init -y
```

### 3. Files Created At
```
/workspaces/agentDB9/my-app/
  └── package.json
```

### 4. Visible In

**Gitpod (if using Gitpod):**
```
📁 EXPLORER
  📁 agentDB9
    📁 my-app          ← Appears here
      📄 package.json
```

**Local Development:**
```
your-local-machine/
  agentDB9/
    my-app/            ← Appears here
      package.json
```

**Embedded VSCode (http://localhost:8080):**
```
📁 /home/coder/workspace
  📁 my-app            ← Appears here
    📄 package.json
```

## Verification

To verify files are being created correctly:

### Check from Host
```bash
ls -la /workspaces/agentDB9/
# Should show all files including agent-created ones
```

### Check from Backend Container
```bash
docker compose exec backend ls -la /workspace/
# Should show the same files
```

### Check from VSCode Container
```bash
docker compose exec vscode ls -la /home/coder/workspace/
# Should show the same files
```

All three commands should show identical file listings.

## Common Scenarios

### Scenario 1: "Create a new file"
```
Agent: write_file
Path: src/components/Button.tsx
Result: /workspaces/agentDB9/src/components/Button.tsx
```

### Scenario 2: "Initialize npm project"
```
Agent: execute_command
Command: mkdir project && cd project && npm init -y
Result: /workspaces/agentDB9/project/package.json
```

### Scenario 3: "Create directory structure"
```
Agent: create_directory
Path: src/utils
Result: /workspaces/agentDB9/src/utils/
```

## Platform-Specific Behavior

### Gitpod
- Files appear in Gitpod's VSCode file explorer immediately
- No need to refresh
- Full Git integration works
- Can edit files in Gitpod's VSCode or embedded VSCode

### Local Development
- Files appear in your local project directory
- Visible in any IDE you have open (VSCode, IntelliJ, etc.)
- Can edit locally or in embedded VSCode
- Changes sync bidirectionally

### Docker-Only (No Local IDE)
- Files only visible in embedded VSCode
- Access via http://localhost:8080 or through frontend
- Still persisted on host filesystem
- Can access via terminal: `docker compose exec backend ls /workspace`

## Troubleshooting

### Files Not Appearing

**Problem:** Agent says it created files but you don't see them

**Check:**
1. Verify workspace mounts:
   ```bash
   docker compose config | grep -A 5 "volumes:"
   ```
   Should show `. :/workspace` or `. :/home/coder/workspace`

2. Check if files exist in container:
   ```bash
   docker compose exec backend ls -la /workspace/
   ```

3. Check if files exist on host:
   ```bash
   ls -la /workspaces/agentDB9/
   ```

**Solution:** If files are in container but not on host, the volume mount is wrong. Should be:
```yaml
volumes:
  - .:/workspace  # ✅ Correct
  # NOT:
  - vscode-workspace:/workspace  # ❌ Wrong (isolated volume)
```

### Permission Errors

**Problem:** `EACCES: permission denied` when creating files

**Cause:** Files created by root in container may not be accessible

**Solution:**
```bash
# Fix permissions on host
sudo chown -R $USER:$USER /workspaces/agentDB9/

# Or run commands as non-root user in container
docker compose exec -u node backend mkdir test-dir
```

### Files in Wrong Location

**Problem:** Files created in `/app` instead of `/workspace`

**Cause:** MCP service using wrong working directory

**Check:**
```typescript
// backend/src/mcp/mcp.service.ts
private readonly workspaceRoot = process.env.VSCODE_WORKSPACE || '/workspace';
```

**Solution:** Ensure `VSCODE_WORKSPACE` env var is not set, or set to `/workspace`

## Summary

✅ **All files created in project root**: `/workspaces/agentDB9/`  
✅ **Visible everywhere simultaneously**: Gitpod, local IDE, embedded VSCode  
✅ **No synchronization needed**: Direct volume mounts  
✅ **Bidirectional editing**: Edit in any IDE, changes visible everywhere  
✅ **Persistent**: Files remain after container restarts  

The key is that all services mount the same directory (`.` = project root), ensuring files appear everywhere immediately.
