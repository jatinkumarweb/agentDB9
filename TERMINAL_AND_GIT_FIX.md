# Terminal Visibility and Git Stuck Issue - Root Cause and Fix

## Issues Identified

### Issue 1: Git/Commands Getting Stuck ❌

**Symptom:**
```
mcp-server-1   | [INFO] 2025-10-22T19:52:22.723Z - Executing command: npm run dev
```
Command starts but never completes, hangs indefinitely.

**Root Cause:**
1. `terminal_execute` uses `spawn()` with a 300-second timeout
2. Dev server commands (`npm run dev`, `npm start`) run indefinitely - they never exit
3. The spawn process waits for the command to complete before returning
4. Result: Command hangs until timeout (5 minutes), blocking the agent

**Why This Happens:**
- Dev servers are designed to run continuously
- `spawn()` waits for process exit
- No exit = no response = stuck agent

### Issue 2: Terminal Visibility Broken ❌

**Symptom:**
Users cannot see agent commands or output in VSCode.

**Root Causes:**

1. **Volume Mapping Mismatch (Gitpod)**
   - MCP server writes to: `/workspace/.agent-terminal.log`
   - Docker volume maps: `./.volumes/agentdb9/workspace:/workspace`
   - Gitpod workspace is at: `/workspaces/agentDB9`
   - Result: Log file is inside Docker container, not visible in Gitpod VSCode

2. **No Terminal Integration**
   - Commands execute via `spawn()` in background
   - No connection to VSCode terminal
   - Output only in log files
   - Users must manually open log files

## Solutions

### Fix 1: Detect and Handle Dev Server Commands

**Implementation:**
```typescript
// In mcp-server/src/tools/TerminalTools.ts

private isDevServerCommand(command: string): boolean {
  const devServerPatterns = [
    /npm\s+(run\s+)?(dev|start|serve)/,
    /yarn\s+(run\s+)?(dev|start|serve)/,
    /pnpm\s+(run\s+)?(dev|start|serve)/,
    /vite(\s|$)/,
    /next\s+dev/,
    /react-scripts\s+start/,
    /ng\s+serve/,
    /vue-cli-service\s+serve/
  ];
  
  return devServerPatterns.some(pattern => pattern.test(command));
}

public async executeCommand(
  command: string,
  cwd?: string,
  timeout: number = 30000,
  shell: string = '/bin/sh'
): Promise<CommandResult> {
  // Check if this is a dev server command
  if (this.isDevServerCommand(command)) {
    return this.executeDevServer(command, cwd, shell);
  }
  
  // Regular command execution
  return this.executeRegularCommand(command, cwd, timeout, shell);
}

private async executeDevServer(
  command: string,
  cwd?: string,
  shell: string = '/bin/sh'
): Promise<CommandResult> {
  // Create a persistent terminal for the dev server
  const terminalId = `dev-server-${Date.now()}`;
  const terminal = this.createTerminal(terminalId, 'Dev Server', cwd || '/workspace');
  
  // Send command to terminal
  terminal.process.write(`${command}\n`);
  
  // Wait a few seconds for startup messages
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Return success with terminal info
  return {
    success: true,
    output: `Dev server started in terminal: ${terminalId}\n` +
            `Command: ${command}\n` +
            `Working directory: ${cwd || '/workspace'}\n\n` +
            `The server is running in a persistent terminal.\n` +
            `Use 'stop_dev_server' tool to stop it.`,
    error: '',
    exitCode: 0,
    duration: 3000
  };
}
```

### Fix 2: Fix Volume Mapping for Gitpod

**Update docker-compose.yml:**
```yaml
mcp-server:
  volumes:
    # Use Gitpod workspace path
    - /workspace:/workspace:cached
    # Or detect environment
    - ${WORKSPACE_PATH:-./.volumes/agentdb9/workspace}:/workspace:cached
```

**Better: Use environment variable:**
```yaml
mcp-server:
  environment:
    - WORKSPACE_PATH=${GITPOD_REPO_ROOT:-/workspace}
  volumes:
    - ${GITPOD_REPO_ROOT:-./.volumes/agentdb9/workspace}:/workspace:cached
```

### Fix 3: Update Terminal Log Path

**In mcp-server/src/tools/TerminalTools.ts:**
```typescript
export class TerminalTools {
  private terminalLogPath: string;
  
  constructor() {
    // Use Gitpod workspace if available, otherwise default
    const workspacePath = process.env.GITPOD_REPO_ROOT || '/workspace';
    this.terminalLogPath = `${workspacePath}/.agent-terminal.log`;
  }
}
```

### Fix 4: Add Terminal Visibility in Frontend

**Create a Terminal Panel Component:**
```typescript
// frontend/src/components/TerminalPanel.tsx

export function TerminalPanel() {
  const [logs, setLogs] = useState<string>('');
  
  useEffect(() => {
    // Poll for log updates
    const interval = setInterval(async () => {
      const response = await fetch('/api/terminal-log');
      const text = await response.text();
      setLogs(text);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="terminal-panel">
      <pre className="terminal-output">{logs}</pre>
    </div>
  );
}
```

## Implementation Plan

### Phase 1: Quick Fix (30 minutes)

1. **Fix dev server detection**
   - Add `isDevServerCommand()` method
   - Return immediately for dev servers
   - Don't wait for process exit

2. **Fix volume mapping**
   - Update docker-compose.yml
   - Use `GITPOD_REPO_ROOT` environment variable
   - Restart containers

### Phase 2: Terminal Integration (1 hour)

1. **Create persistent terminals**
   - Use `node-pty` for real terminals
   - Store terminal references
   - Allow stopping via tool

2. **Add terminal log endpoint**
   - Backend endpoint to read log file
   - Frontend component to display
   - Real-time updates

### Phase 3: Full Solution (2 hours)

1. **WebSocket terminal streaming**
   - Stream output in real-time
   - Interactive terminal in frontend
   - Full terminal emulation

## Testing

### Test Dev Server Commands
```bash
# Should return immediately, not hang
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "terminal_execute",
    "parameters": {
      "command": "npm run dev",
      "cwd": "/workspace/projects/test-app"
    }
  }'
```

### Test Terminal Log Visibility
```bash
# In Gitpod workspace
cat /workspaces/agentDB9/.agent-terminal.log

# Should show agent commands and output
```

### Test Regular Commands
```bash
# Should still work normally
curl -X POST http://localhost:9001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "terminal_execute",
    "parameters": {
      "command": "ls -la",
      "cwd": "/workspace"
    }
  }'
```

## Benefits

✅ **No More Stuck Commands**
- Dev servers return immediately
- Agent can continue working
- No 5-minute timeouts

✅ **Visible Terminal Output**
- Users see all commands
- Real-time output streaming
- Full transparency

✅ **Better Dev Server Management**
- Persistent terminals
- Can stop/restart servers
- Multiple servers supported

✅ **Works in Gitpod**
- Correct volume mapping
- Proper workspace paths
- No container isolation issues

## Next Steps

1. Implement Phase 1 fixes
2. Test with real dev server commands
3. Verify terminal log visibility
4. Add frontend terminal panel
5. Document for users
