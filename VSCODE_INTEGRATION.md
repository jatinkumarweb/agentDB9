# VSCode Integration

## Overview

AgentDB9 includes an embedded VSCode instance that allows agents to create and modify files directly in a browser-based IDE. This works across all platforms: local development, Docker, and cloud environments like Gitpod.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│ VSCode Proxy │─────▶│   VSCode    │
│  (Port 3000)│      │  (Port 8081) │      │ (Port 8080) │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            │                      │
                     Authentication           Workspace
                      JWT Tokens              /workspace
```

### Components

1. **VSCode Service** (Port 8080)
   - Runs code-server (browser-based VSCode)
   - Mounts project directory at `/home/coder/workspace`
   - No authentication (protected by proxy)

2. **VSCode Proxy** (Port 8081)
   - Authenticates users via JWT tokens
   - Proxies requests to VSCode service
   - Handles WebSocket connections
   - Adds security headers for iframe embedding

3. **Backend Service** (Port 8000)
   - Executes tool calls (mkdir, write_file, etc.)
   - Shares same workspace mount at `/workspace`
   - Files created by agents appear in VSCode

## Workspace Mounting

All services that need file access share the same workspace:

```yaml
# docker-compose.yml
services:
  vscode:
    volumes:
      - .:/home/coder/workspace  # Project root
      
  backend:
    volumes:
      - .:/workspace  # Same project root
      
  mcp-server:
    volumes:
      - .:/workspace  # Same project root
```

This ensures:
- Files created by agents appear in VSCode immediately
- Changes in VSCode are visible to agents
- No file synchronization needed

## Platform-Specific Setup

### Local Development

1. Start all services:
   ```bash
   docker compose up -d
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - VSCode (direct): http://localhost:8080
   - VSCode (proxied): http://localhost:8081

3. Files created by agents will appear in:
   - Your local project directory
   - VSCode file explorer
   - Your IDE (if you have the project open)

### Gitpod

Gitpod provides its own VSCode instance, so you have two options:

**Option A: Use Gitpod's VSCode** (Recommended)
- Files created by agents appear in Gitpod's file explorer automatically
- No need to run vscode/vscode-proxy services
- Better integration with Gitpod features

**Option B: Use Embedded VSCode**
- Start vscode services: `docker compose up -d vscode vscode-proxy`
- Access via frontend at http://localhost:3000
- Useful for testing the embedded experience

### Docker-Only Environments

For environments without a native IDE:

1. Start all services including VSCode:
   ```bash
   docker compose up -d
   ```

2. Access VSCode through the frontend:
   - Login at http://localhost:3000
   - VSCode will be embedded in the UI
   - All agent-created files appear immediately

## Tool Execution and File Visibility

When an agent executes a tool like `execute_command` or `write_file`:

1. **Backend receives tool call** from LLM
2. **MCP service executes** the command in `/workspace`
3. **File is created** on the shared volume
4. **VSCode detects change** via file watcher
5. **File appears** in VSCode file explorer

### Example Flow

```
User: "Create a new React component"

Agent generates tool call:
<tool_call>
<tool_name>write_file</tool_name>
<arguments>{"path": "src/components/Button.tsx", "content": "..."}</arguments>
</tool_call>

Backend executes:
/workspace/src/components/Button.tsx created

VSCode shows:
📁 src
  📁 components
    📄 Button.tsx  ← New file appears
```

## Troubleshooting

### Files Not Appearing in VSCode

**Problem:** Agent creates files but they don't show in VSCode

**Solution:**
1. Check workspace mounts are correct:
   ```bash
   docker compose exec vscode ls -la /home/coder/workspace
   docker compose exec backend ls -la /workspace
   ```
   Both should show the same files.

2. Verify services are using actual directory, not Docker volumes:
   ```yaml
   # ✅ Correct
   volumes:
     - .:/workspace
   
   # ❌ Wrong
   volumes:
     - vscode-workspace:/workspace
   ```

### VSCode Connection Errors

**Problem:** `Unable to resolve resource vscode-remote://localhost:8081`

**Solutions:**
1. Check vscode-proxy is running:
   ```bash
   docker compose ps vscode-proxy
   curl http://localhost:8081/health
   ```

2. Verify authentication token is being passed
3. Check browser console for detailed errors

## Environment Variables

### Frontend
```env
NEXT_PUBLIC_VSCODE_PROXY_URL=http://localhost:8081
```

### VSCode Proxy
```env
VSCODE_PROXY_PORT=8081
VSCODE_URL=http://vscode:8080
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3000
```

### Backend
```env
VSCODE_WORKSPACE=/workspace
```

## Summary

✅ **Works on all platforms**: Local, Docker, Gitpod, cloud  
✅ **Real-time file sync**: Changes appear immediately  
✅ **Secure**: JWT authentication and CORS protection  
✅ **Flexible**: Use embedded VSCode or native IDE  

The integration ensures that agents can create and modify files that are immediately visible to users, regardless of the platform they're using.
