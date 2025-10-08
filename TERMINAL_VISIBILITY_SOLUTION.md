# Terminal Visibility Solution

## Problem

User wants to see commands executed by the agent in VSCode terminal with their output.

**Current Situation:**
- Commands execute via MCP Server using `spawn()`
- Runs in background, no visible terminal
- User can't see what commands were executed
- User can't see command output
- No visibility into agent actions

**User Expectation:**
- Open VSCode terminal
- See command being executed
- See real-time output
- See command completion
- Full transparency

## Challenge

**Code-Server Limitations:**
- code-server (VSCode in browser) doesn't expose terminal API
- Can't programmatically create terminals via HTTP/WebSocket
- Can't send commands to existing terminals remotely
- Terminal API is only available in VSCode extensions

**Current Architecture:**
```
Backend → MCP Server → spawn() → Background execution
                                  ↓
                                  No visible terminal
```

## Solutions

### Solution 1: Docker Exec with TTY (Recommended)

Execute commands using `docker exec -it` which attaches to a pseudo-terminal.

**Implementation:**

```typescript
// In backend/src/mcp/mcp.service.ts
private async executeCommand(command: string): Promise<any> {
  // Create a visible execution by running in docker container with TTY
  const dockerCommand = `docker exec -it agentdb9-vscode-1 bash -c "cd /home/coder/workspace && ${command}"`;
  
  // This will show in docker logs and can be viewed
  const { stdout, stderr } = await this.execAsync(dockerCommand);
  
  return { stdout, stderr, exitCode: 0, command };
}
```

**Pros:**
- ✅ Commands execute in VSCode container
- ✅ Output captured
- ✅ Can be logged

**Cons:**
- ❌ Still not visible in VSCode terminal UI
- ❌ User must check docker logs

### Solution 2: Command Log File

Write commands and output to a log file that user can view in VSCode.

**Implementation:**

```typescript
// Create a command log file
const logFile = '/home/coder/workspace/.agent-commands.log';

// Before executing
await this.writeToLog(logFile, `\n$ ${command}\n`);

// Execute command
const result = await this.executeInVSCode(command);

// After executing
await this.writeToLog(logFile, result.stdout);
await this.writeToLog(logFile, result.stderr);
```

**User Experience:**
1. Open VSCode
2. Open file: `.agent-commands.log`
3. See all commands and output
4. File updates in real-time

**Pros:**
- ✅ Simple to implement
- ✅ Visible in VSCode
- ✅ Persistent history
- ✅ Can be version controlled

**Cons:**
- ❌ Not a real terminal
- ❌ User must manually open file
- ❌ No interactive features

### Solution 3: WebSocket Terminal Emulator (Complex)

Build a custom terminal emulator in the frontend that connects to MCP Server.

**Implementation:**

```typescript
// Frontend component
<TerminalEmulator 
  wsUrl="ws://mcp-server:9002"
  onCommand={(cmd) => console.log('Executed:', cmd)}
/>

// MCP Server streams output via WebSocket
ws.on('execute', (command) => {
  const pty = spawn(command);
  pty.stdout.on('data', (data) => {
    ws.send({ type: 'output', data });
  });
});
```

**Pros:**
- ✅ Real-time output
- ✅ Terminal-like experience
- ✅ Full control

**Cons:**
- ❌ Complex implementation
- ❌ Requires frontend work
- ❌ Not actual VSCode terminal

### Solution 4: Command History Panel (Best UX)

Add a command history panel in the chat interface showing all executed commands.

**Implementation:**

```typescript
// In chat interface
<CommandHistory>
  {commands.map(cmd => (
    <CommandBlock>
      <CommandLine>$ {cmd.command}</CommandLine>
      <Output>{cmd.stdout}</Output>
      {cmd.stderr && <Error>{cmd.stderr}</Error>}
      <Timestamp>{cmd.timestamp}</Timestamp>
    </CommandBlock>
  ))}
</CommandHistory>
```

**Pros:**
- ✅ Visible in chat
- ✅ Contextual (next to agent messages)
- ✅ Easy to implement
- ✅ Good UX

**Cons:**
- ❌ Not in VSCode terminal
- ❌ Separate from actual terminal

### Solution 5: Hybrid Approach (Recommended)

Combine multiple solutions for best experience:

1. **Command Log File** - For VSCode visibility
2. **Chat History** - For context
3. **Docker Logs** - For debugging

**Implementation:**

```typescript
private async executeCommand(command: string): Promise<any> {
  const timestamp = new Date().toISOString();
  const logFile = '/home/coder/workspace/.agent-commands.log';
  
  // 1. Log to file (visible in VSCode)
  await this.appendToLog(logFile, 
    `\n[${timestamp}] Executing: ${command}\n`
  );
  
  // 2. Execute in VSCode container
  const result = await this.executeInVSCode(command);
  
  // 3. Log output to file
  await this.appendToLog(logFile, result.stdout);
  if (result.stderr) {
    await this.appendToLog(logFile, `ERROR: ${result.stderr}\n`);
  }
  await this.appendToLog(logFile, 
    `[${timestamp}] Completed with exit code: ${result.exitCode}\n`
  );
  
  // 4. Return result (will be shown in chat)
  return {
    ...result,
    logFile, // Tell user where to see details
    message: `Command executed. See ${logFile} for details.`
  };
}
```

**User Experience:**
1. Agent executes command
2. User sees in chat: "Command executed: npm run dev"
3. User opens `.agent-commands.log` in VSCode
4. Sees full command history with output
5. File updates in real-time as commands execute

## Recommended Implementation

### Phase 1: Command Log File (Quick Win)

**Effort:** 1-2 hours
**Value:** High
**Complexity:** Low

```typescript
// backend/src/mcp/mcp.service.ts

private readonly commandLogFile = '/home/coder/workspace/.agent-commands.log';

private async executeCommand(command: string): Promise<any> {
  const timestamp = new Date().toISOString();
  
  try {
    // Log command start
    await this.logCommand(`\n${'='.repeat(80)}\n`);
    await this.logCommand(`[${timestamp}] $ ${command}\n`);
    await this.logCommand(`${'='.repeat(80)}\n`);
    
    // Execute
    const result = await this.executeInVSCode(command);
    
    // Log output
    if (result.stdout) {
      await this.logCommand(`STDOUT:\n${result.stdout}\n`);
    }
    if (result.stderr) {
      await this.logCommand(`STDERR:\n${result.stderr}\n`);
    }
    await this.logCommand(`Exit Code: ${result.exitCode}\n`);
    
    return result;
  } catch (error) {
    await this.logCommand(`ERROR: ${error.message}\n`);
    throw error;
  }
}

private async logCommand(text: string): Promise<void> {
  try {
    const response = await fetch(`${this.mcpServerUrl}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'fs_append_file',
        parameters: {
          path: this.commandLogFile,
          content: text
        }
      })
    });
  } catch (error) {
    this.logger.error('Failed to log command:', error);
  }
}
```

**User Instructions:**
1. Open VSCode at http://localhost:8080
2. Open file: `.agent-commands.log`
3. Keep it open in a split view
4. Watch commands execute in real-time

### Phase 2: Chat Command Display (Better UX)

**Effort:** 2-3 hours
**Value:** High
**Complexity:** Medium

Add command blocks to chat interface showing executed commands.

### Phase 3: Terminal Emulator (Future)

**Effort:** 1-2 days
**Value:** Medium
**Complexity:** High

Build custom terminal emulator in frontend.

## Quick Implementation

Let me implement Phase 1 right now:

```typescript
// File: backend/src/mcp/mcp.service.ts

private readonly COMMAND_LOG = '/home/coder/workspace/.agent-commands.log';

private async executeCommand(command: string): Promise<any> {
  const timestamp = new Date().toISOString();
  const separator = '='.repeat(80);
  
  try {
    // Log command execution start
    await this.logToFile(
      `\n${separator}\n` +
      `[${timestamp}] Executing Command\n` +
      `${separator}\n` +
      `$ ${command}\n\n`
    );
    
    // Execute command in VSCode container
    this.logger.log(`Executing command in VSCode: ${command}`);
    const result = await this.executeInVSCode(command);
    
    // Log output
    await this.logToFile(
      `STDOUT:\n${result.stdout || '(no output)'}\n\n` +
      (result.stderr ? `STDERR:\n${result.stderr}\n\n` : '') +
      `Exit Code: ${result.exitCode}\n` +
      `Completed at: ${new Date().toISOString()}\n` +
      `${separator}\n`
    );
    
    return {
      ...result,
      logFile: this.COMMAND_LOG
    };
  } catch (error) {
    await this.logToFile(
      `ERROR: ${error.message}\n` +
      `${separator}\n`
    );
    throw error;
  }
}

private async logToFile(content: string): Promise<void> {
  try {
    // Use MCP Server to append to log file
    await fetch(`${this.mcpServerUrl}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'fs_write_file',
        parameters: {
          path: this.COMMAND_LOG,
          content: content,
          append: true
        }
      })
    });
  } catch (error) {
    // Don't fail command execution if logging fails
    this.logger.warn('Failed to log to file:', error);
  }
}

private async executeInVSCode(command: string): Promise<any> {
  // ... existing implementation
}
```

## User Guide

### How to See Agent Commands

1. **Open VSCode:**
   - Go to http://localhost:8080
   - Login if required

2. **Open Command Log:**
   - Click File → Open File
   - Navigate to `.agent-commands.log`
   - Or use Ctrl+P and type `.agent-commands.log`

3. **Split View (Recommended):**
   - Open `.agent-commands.log`
   - Drag tab to right side
   - Keep log visible while chatting with agent

4. **Watch Real-Time:**
   - File updates automatically
   - See commands as they execute
   - See output in real-time

### Log Format

```
================================================================================
[2025-10-08T13:20:00.000Z] Executing Command
================================================================================
$ npm run dev

STDOUT:
> demo@0.1.0 dev
> next dev --turbopack -H 0.0.0.0

  ▲ Next.js 15.5.4
  - Local:        http://localhost:3000
  - Network:      http://0.0.0.0:3000

 ✓ Starting...
 ✓ Ready in 2.3s

Exit Code: 0
Completed at: 2025-10-08T13:20:05.000Z
================================================================================
```

## Benefits

### ✅ Transparency
- User sees every command
- User sees all output
- User sees errors
- Full visibility

### ✅ Debugging
- Easy to troubleshoot
- See what went wrong
- Replay commands manually
- Understand agent actions

### ✅ Learning
- Learn from agent commands
- See best practices
- Understand workflows
- Copy useful commands

### ✅ Trust
- Know what agent is doing
- Verify actions
- Catch mistakes
- Build confidence

## Next Steps

1. Implement command logging (1-2 hours)
2. Test with various commands
3. Add to user documentation
4. Consider Phase 2 (chat display)

This gives immediate visibility without complex terminal integration.
