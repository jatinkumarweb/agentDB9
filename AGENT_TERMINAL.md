# Agent Terminal - Real-Time Command Visibility

## Overview

The Agent Terminal provides real-time visibility into all commands executed by the AI agent. Commands are logged to a file that you can view in VSCode to see exactly what the agent is doing.

## Features

✅ **Real-Time Streaming** - See command output as it happens
✅ **Color-Coded Output** - ANSI colors for better readability
✅ **Command History** - All commands logged with timestamps
✅ **Error Highlighting** - Stderr shown in red
✅ **Success/Failure Status** - Clear indicators for command results
✅ **Execution Time** - Duration shown for each command

## Location

**Terminal Log File:**
```
/workspace/.agent-terminal.log
```

**In VSCode:**
```
.agent-terminal.log (in workspace root)
```

## How to View

### Method 1: Open in VSCode (Recommended)

1. Open VSCode at [http://localhost:8080](http://localhost:8080)
2. Look for `.agent-terminal.log` in the file explorer
3. Click to open - it will auto-refresh as commands execute
4. Enable "Auto Scroll" in VSCode to follow output

### Method 2: Tail the Log

```bash
# From host machine
docker exec agentdb9-vscode-1 tail -f /home/coder/workspace/.agent-terminal.log

# Or from workspace container
tail -f /workspace/.agent-terminal.log
```

### Method 3: View in Chat

The agent will provide a link to the terminal log in command responses:
```
Command executed. View real-time output in VSCode: /workspace/.agent-terminal.log
```

## Log Format

### Header
```
╔════════════════════════════════════════════════════════════════════════════════╗
║                           🤖 AGENT TERMINAL LOG                               ║
║                                                                                ║
║  This file shows all commands executed by the AI agent.                       ║
║  Commands are executed in the MCP server container with access to workspace.  ║
║  Output is streamed in real-time as commands execute.                         ║
╚════════════════════════════════════════════════════════════════════════════════╝

Log started: 2025-10-08T17:40:00.000Z
```

### Command Entry
```
════════════════════════════════════════════════════════════════════════════════
[2025-10-08T17:40:15.123Z] Agent Terminal
Command: npm run dev
Directory: /workspace/my-app
════════════════════════════════════════════════════════════════════════════════

> my-app@0.1.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Network:      http://0.0.0.0:3000

 ✓ Ready in 2.3s

────────────────────────────────────────────────────────────────────────────────
✓ SUCCESS (2345ms)
────────────────────────────────────────────────────────────────────────────────
```

### Error Example
```
════════════════════════════════════════════════════════════════════════════════
[2025-10-08T17:41:00.456Z] Agent Terminal
Command: npm install nonexistent-package
Directory: /workspace/my-app
════════════════════════════════════════════════════════════════════════════════

npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package

────────────────────────────────────────────────────────────────────────────────
✗ FAILED (exit code: 1) (1234ms)
────────────────────────────────────────────────────────────────────────────────
```

## Color Codes

The terminal log uses ANSI color codes for better readability:

| Color | Usage |
|-------|-------|
| 🔵 Cyan | Timestamps |
| 🟢 Green | Success status, command labels |
| 🟡 Yellow | Command text, directory |
| 🔴 Red | Errors (stderr), failure status |
| ⚪ Gray | Metadata (duration, separators) |
| 🟣 Purple | Header box |

## VSCode Setup

### Enable ANSI Colors

VSCode should display ANSI colors by default. If not:

1. Install extension: "ANSI Colors" by `iliazeus`
2. Or use built-in terminal preview

### Auto-Refresh

VSCode automatically refreshes files when they change. If not working:

1. Check: `File > Preferences > Settings`
2. Search: "files.autoSave"
3. Set to: "afterDelay"

### Split View

For best experience:

1. Open `.agent-terminal.log` in VSCode
2. Split editor (Ctrl+\\ or Cmd+\\)
3. Keep terminal log on one side
4. Work on other files on the other side

## Architecture

```
User Chat Request
  ↓
Backend API
  ↓
MCP Server
  ↓
TerminalTools.executeCommand()
  ↓
┌─────────────────────────────────────┐
│  1. Write command header to log     │
│  2. Execute command                 │
│  3. Stream stdout to log (real-time)│
│  4. Stream stderr to log (red)      │
│  5. Write footer with status        │
└─────────────────────────────────────┘
  ↓
Log File: /workspace/.agent-terminal.log
  ↓
VSCode displays file (auto-refresh)
```

## File Lifecycle

### Initialization
- Created when MCP server starts
- Header written with timestamp
- Ready to receive command output

### During Execution
- Command header written
- Output streamed line-by-line
- Errors highlighted in red
- Footer written with status

### Persistence
- File persists across container restarts
- Located in workspace volume
- Can be cleared manually if needed

## Clearing the Log

### Manual Clear
```bash
# From host
docker exec agentdb9-mcp-server-1 rm /workspace/.agent-terminal.log

# MCP server will recreate it on next command
```

### Automatic Clear
The log file is NOT automatically cleared. It grows over time to maintain history.

### Rotation (Optional)
To implement log rotation, add to your workflow:

```bash
# Keep last 1000 lines
tail -n 1000 /workspace/.agent-terminal.log > /tmp/terminal.log
mv /tmp/terminal.log /workspace/.agent-terminal.log
```

## Troubleshooting

### Log File Not Created

**Check MCP server is running:**
```bash
docker-compose ps mcp-server
```

**Check logs:**
```bash
docker logs agentdb9-mcp-server-1 | grep "terminal log"
```

**Expected:**
```
[INFO] Initialized agent terminal log at /workspace/.agent-terminal.log
```

### No Output Appearing

**Check command is executing:**
```bash
docker logs agentdb9-mcp-server-1 | grep "Executing command"
```

**Check file permissions:**
```bash
docker exec agentdb9-mcp-server-1 ls -la /workspace/.agent-terminal.log
```

**Should be writable by MCP server**

### Colors Not Showing

**VSCode:**
- Install "ANSI Colors" extension
- Or view in terminal: `cat /workspace/.agent-terminal.log`

**Terminal:**
```bash
# Use cat to see colors
cat /workspace/.agent-terminal.log

# Or less with color support
less -R /workspace/.agent-terminal.log
```

### File Too Large

**Check size:**
```bash
docker exec agentdb9-mcp-server-1 du -h /workspace/.agent-terminal.log
```

**Clear if needed:**
```bash
docker exec agentdb9-mcp-server-1 sh -c 'echo "" > /workspace/.agent-terminal.log'
```

## Integration with Chat

### Command Response Format

When agent executes a command, the response includes:

```json
{
  "stdout": "command output...",
  "stderr": "",
  "exitCode": 0,
  "command": "npm run dev",
  "terminalLog": "/workspace/.agent-terminal.log",
  "message": "Command executed. View real-time output in VSCode: /workspace/.agent-terminal.log"
}
```

### Frontend Display

The frontend can:
1. Show the terminal log path
2. Provide a link to open in VSCode
3. Display recent output inline
4. Stream updates via WebSocket

## Best Practices

### 1. Keep Terminal Log Open
- Open `.agent-terminal.log` in VSCode
- Pin the tab so it doesn't close
- Enable auto-scroll to follow output

### 2. Monitor Long-Running Commands
- Dev servers (npm run dev)
- Build processes (npm run build)
- Test suites (npm test)

### 3. Debug Failures
- Check terminal log for full error output
- Look for red text (stderr)
- Check exit codes in footer

### 4. Share Logs
- Terminal log is in workspace
- Can be committed to git if needed
- Or shared via copy/paste

## Comparison with Other Logs

| Log File | Purpose | Location | Format |
|----------|---------|----------|--------|
| `.agent-terminal.log` | Real-time command output | `/workspace/` | ANSI colored, streaming |
| `.agent-commands.log` | Command history | `/home/coder/workspace/` | Plain text, structured |
| MCP server logs | Server diagnostics | Docker logs | JSON structured |
| Backend logs | API requests | Docker logs | NestJS format |

## Future Enhancements

### Planned Features
- [ ] WebSocket streaming to frontend
- [ ] Terminal UI component in chat
- [ ] Command filtering/search
- [ ] Log rotation
- [ ] Export to file
- [ ] Syntax highlighting for code output

### Possible Improvements
- [ ] Multiple terminal sessions
- [ ] Interactive terminal (input)
- [ ] Terminal recording/playback
- [ ] Integration with VSCode terminal API

## Examples

### Example 1: Creating Next.js App

**Command:**
```
Create a Next.js app called my-app
```

**Terminal Log:**
```
════════════════════════════════════════════════════════════════════════════════
[2025-10-08T17:45:00.000Z] Agent Terminal
Command: npx create-next-app@latest my-app --typescript --tailwind --app --no-git
Directory: /workspace
════════════════════════════════════════════════════════════════════════════════

Creating a new Next.js app in /workspace/my-app.

Using npm.

Installing dependencies:
- react
- react-dom
- next

Installing devDependencies:
- typescript
- @types/react
- @types/node
- @types/react-dom
- tailwindcss
- postcss
- autoprefixer

added 342 packages in 45s

Initialized a git repository.

Success! Created my-app at /workspace/my-app

────────────────────────────────────────────────────────────────────────────────
✓ SUCCESS (45678ms)
────────────────────────────────────────────────────────────────────────────────
```

### Example 2: Running Dev Server

**Command:**
```
Start the dev server for my-app
```

**Terminal Log:**
```
════════════════════════════════════════════════════════════════════════════════
[2025-10-08T17:46:00.000Z] Agent Terminal
Command: npm run dev
Directory: /workspace/my-app
════════════════════════════════════════════════════════════════════════════════

> my-app@0.1.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.1s
 ○ Compiling / ...
 ✓ Compiled / in 1.2s (502 modules)

(Server keeps running - log stays open)
```

### Example 3: Build Error

**Command:**
```
Build the app
```

**Terminal Log:**
```
════════════════════════════════════════════════════════════════════════════════
[2025-10-08T17:47:00.000Z] Agent Terminal
Command: npm run build
Directory: /workspace/my-app
════════════════════════════════════════════════════════════════════════════════

> my-app@0.1.0 build
> next build

 ✓ Creating an optimized production build
 ✓ Compiled successfully
 ✓ Linting and checking validity of types
   Collecting page data  .
Type error: Property 'title' does not exist on type '{}'.

  5 | export default function Home() {
  6 |   const data = {};
> 7 |   return <h1>{data.title}</h1>;
    |                    ^
  8 | }

────────────────────────────────────────────────────────────────────────────────
✗ FAILED (exit code: 1) (8234ms)
────────────────────────────────────────────────────────────────────────────────
```

## Summary

The Agent Terminal provides:
- ✅ Real-time visibility into agent commands
- ✅ Color-coded output for easy reading
- ✅ Persistent log file in workspace
- ✅ Integration with VSCode
- ✅ Success/failure indicators
- ✅ Execution time tracking

**To use:**
1. Open `.agent-terminal.log` in VSCode
2. Watch commands execute in real-time
3. Debug issues with full output
4. Keep history of all agent actions

**Location:** `/workspace/.agent-terminal.log`

**View in VSCode:** [http://localhost:8080](http://localhost:8080)
