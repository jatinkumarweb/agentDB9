# Workspace Path Mapping Guide

## The Critical Fix

**Problem**: Agent couldn't create files - "ENOENT: no such file or directory"

**Root Cause**: Frontend was using VSCode's path (`/home/coder/workspace`) instead of MCP server's path (`/workspace`)

**Solution**: Changed WorkspaceContext to use `/workspace`

## Path Mapping Across Containers

### The Shared Workspace Volume

All containers share the same workspace, but mount it at different paths:

| Container | Mount Path | Purpose |
|-----------|------------|---------|
| **Host** | `./workspace/` | Persistent storage on disk |
| **MCP Server** | `/workspace` | Tool execution (CREATE files here) |
| **VSCode** | `/home/coder/workspace/` | Viewing/editing (VIEW files here) |
| **Backend** | `/workspace` | File operations |

### Visual Representation

```
┌─────────────────────────────────────────────────────────┐
│                    Host Machine                          │
│                  ./workspace/                            │
│                  (Persistent Storage)                    │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬──────────────┐
        │                         │              │
        ▼                         ▼              ▼
┌──────────────┐         ┌──────────────┐  ┌──────────────┐
│  MCP Server  │         │   VSCode     │  │   Backend    │
│              │         │              │  │              │
│  /workspace  │◄────────┤ /home/coder/ │  │  /workspace  │
│              │         │  workspace/  │  │              │
│  ✅ CREATE   │         │  👁️ VIEW     │  │  📝 MANAGE   │
│  FILES HERE  │         │  FILES HERE  │  │  FILES HERE  │
└──────────────┘         └──────────────┘  └──────────────┘
```

## Why Different Paths?

### Historical Reasons

- **VSCode**: Uses `/home/coder/workspace/` because code-server expects user home directory structure
- **MCP Server**: Uses `/workspace` for simplicity and clarity
- **Backend**: Uses `/workspace` to match MCP server

### The Problem This Caused

When frontend sent requests to MCP server:

```javascript
// ❌ WRONG (before fix)
path: '/home/coder/workspace'

// MCP server tried to access:
// /home/coder/workspace  ← Doesn't exist in MCP container!
// Result: ENOENT error
```

```javascript
// ✅ CORRECT (after fix)
path: '/workspace'

// MCP server accesses:
// /workspace  ← Exists! Mounted volume
// Result: Success
```

## What Was Fixed

### File: `frontend/src/contexts/WorkspaceContext.tsx`

**Before**:
```typescript
const defaultWorkspace = {
  id: 'default',
  name: 'AgentDB9 Workspace',
  path: '/home/coder/workspace',  // ❌ VSCode path
  description: 'Main development workspace'
};
```

**After**:
```typescript
const defaultWorkspace = {
  id: 'default',
  name: 'AgentDB9 Workspace',
  path: '/workspace',  // ✅ MCP server path
  description: 'Main development workspace'
};
```

## How to Use Paths Correctly

### In Frontend Code

Always use `/workspace` when calling MCP server:

```typescript
// ✅ CORRECT
const response = await fetch('/api/workspace/files', {
  method: 'POST',
  body: JSON.stringify({ path: '/workspace' })
});
```

### In Backend Code

Use `/workspace` for MCP operations:

```typescript
// ✅ CORRECT
const mcpResponse = await fetch('http://mcp-server:9001/api/tools/execute', {
  method: 'POST',
  body: JSON.stringify({
    tool: 'fs_create_directory',
    parameters: { path: '/workspace/my-project' }
  })
});
```

### In MCP Server Code

Paths are already correct - they use `/workspace`:

```typescript
// ✅ Already correct
public async createDirectory(dirPath: string): Promise<void> {
  // dirPath should be like: /workspace/my-folder
  await fs.mkdir(dirPath, { recursive: true });
}
```

## Testing Path Mapping

### Test 1: Create File via MCP Server

```bash
# Create file in MCP server
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fs_create_file","parameters":{"path":"/workspace/test.txt","content":"Hello"}}'

# Check in MCP container
docker-compose exec mcp-server cat /workspace/test.txt
# Output: Hello

# Check in VSCode container
docker-compose exec vscode cat /home/coder/workspace/test.txt
# Output: Hello

# Check on host
cat workspace/test.txt
# Output: Hello

# All three show the same file!
```

### Test 2: List Files via Frontend API

```bash
# Call frontend API
curl -X POST http://localhost:3000/api/workspace/files \
  -H "Content-Type: application/json" \
  -d '{}'

# Should return files from /workspace
# No ENOENT errors
```

### Test 3: Agent Creates Project

1. Ask agent: "Create a new project called my-app"
2. Agent calls backend
3. Backend calls MCP server with path: `/workspace/my-app`
4. MCP server creates folder at `/workspace/my-app`
5. Folder appears:
   - Host: `./workspace/my-app/`
   - VSCode: `/home/coder/workspace/my-app/`
   - MCP: `/workspace/my-app/`

## Common Mistakes to Avoid

### ❌ Don't Use VSCode Paths in API Calls

```typescript
// ❌ WRONG
fetch('/api/workspace/files', {
  body: JSON.stringify({ path: '/home/coder/workspace' })
});
```

### ❌ Don't Mix Paths

```typescript
// ❌ WRONG
const vscodePath = '/home/coder/workspace/file.txt';
const mcpPath = '/workspace/file.txt';
// These are the SAME file, but use MCP path in API calls
```

### ✅ Always Use MCP Server Paths

```typescript
// ✅ CORRECT
fetch('/api/workspace/files', {
  body: JSON.stringify({ path: '/workspace' })
});

fetch('/api/workspace/files', {
  body: JSON.stringify({ path: '/workspace/my-project' })
});
```

## Debugging Path Issues

### Check Which Path is Being Used

```bash
# Watch MCP logs
docker logs -f agentdb9-mcp-server-1 2>&1 | grep -E "\[API\]|\[HANDLER\]"

# Make a request
curl -X POST http://localhost:3000/api/workspace/files -d '{}'

# Look for:
# [INFO] [API] Tool execution request: fs_list_directory { parameters: { path: '/workspace' } }
#                                                                              ^^^^^^^^^^^
# Should be /workspace, NOT /home/coder/workspace
```

### Check File Existence

```bash
# In MCP container
docker-compose exec mcp-server ls -la /workspace/

# In VSCode container
docker-compose exec vscode ls -la /home/coder/workspace/

# On host
ls -la workspace/

# All three should show the same files
```

## Summary

| Component | Path to Use | Why |
|-----------|-------------|-----|
| Frontend API calls | `/workspace` | MCP server expects this |
| Backend MCP calls | `/workspace` | MCP server mount point |
| MCP Server | `/workspace` | Its own mount point |
| VSCode viewing | `/home/coder/workspace/` | code-server convention |
| Host storage | `./workspace/` | Docker volume mount |

**Key Rule**: When calling MCP server APIs, always use `/workspace` paths, never `/home/coder/workspace` paths.

## Verification Checklist

After pulling latest changes:

- [ ] Frontend uses `/workspace` in WorkspaceContext
- [ ] Workspace API calls succeed without ENOENT errors
- [ ] Files created by agent appear in all containers
- [ ] MCP logs show `/workspace` paths, not `/home/coder/workspace`
- [ ] Agent can create projects successfully

All checks should pass after the fix in commit `9a403c0`.
