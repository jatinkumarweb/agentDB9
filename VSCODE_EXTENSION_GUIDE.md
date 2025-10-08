# VSCode Extension Options for Agent Terminal Visibility

## Option 1: Use Built-in VSCode Tasks (✅ Recommended - No Extension Needed)

Already configured in `workspace/.vscode/tasks.json`:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Watch Agent Terminal"

**Pros:**
- No extension installation needed
- Works out of the box
- Lightweight

**Cons:**
- Manual activation required
- Not as seamless as Copilot

## Option 2: Install Existing Extensions

### A. **Terminal Manager** Extension
- **Extension ID**: `fabiospampinato.vscode-terminals`
- **Install**: Search "Terminal Manager" in VSCode Extensions
- **Configuration**:
  ```json
  {
    "terminals.terminals": [
      {
        "name": "Agent Terminal",
        "open": true,
        "focus": false,
        "command": "tail -f /home/coder/workspace/.agent-terminal.log"
      }
    ]
  }
  ```

### B. **Task Runner** Extension
- **Extension ID**: `stkb.rewrap`
- **Install**: Search "Task Runner" in VSCode Extensions
- **Benefit**: Auto-run tasks on workspace open

### C. **Terminal Tabs** Extension
- **Extension ID**: `Tyriar.terminal-tabs`
- **Install**: Search "Terminal Tabs" in VSCode Extensions
- **Benefit**: Better terminal organization

### D. **Auto Run Command** Extension
- **Extension ID**: `gabrielgrinberg.auto-run-command`
- **Install**: Search "Auto Run Command" in VSCode Extensions
- **Configuration**:
  ```json
  {
    "auto-run-command.rules": [
      {
        "command": "workbench.action.terminal.new",
        "message": "Opening Agent Terminal..."
      }
    ]
  }
  ```

## Option 3: Custom Extension (Included)

We've created a custom extension in `vscode-extension/` folder.

### Installation Steps:

1. **Install dependencies:**
   ```bash
   cd vscode-extension
   npm install
   ```

2. **Compile the extension:**
   ```bash
   npm run compile
   ```

3. **Install vsce (if not installed):**
   ```bash
   npm install -g @vscode/vsce
   ```

4. **Package the extension:**
   ```bash
   vsce package
   ```

5. **Install in VSCode:**
   - Open VSCode
   - Go to Extensions (Ctrl+Shift+X)
   - Click "..." menu → "Install from VSIX"
   - Select `agentdb9-terminal-1.0.0.vsix`

### Features:
- ✅ Auto-opens terminal when agent runs commands
- ✅ Watches log file for changes
- ✅ Color-coded output
- ✅ Commands to show/clear terminal
- ✅ Configurable settings

## Option 4: Use code-server Extensions API

Since you're using code-server, you can install extensions via CLI:

```bash
# Install Terminal Manager
code-server --install-extension fabiospampinato.vscode-terminals

# Install Auto Run Command
code-server --install-extension gabrielgrinberg.auto-run-command
```

## Comparison

| Option | Setup Effort | Auto-Open | Real-time | Copilot-like |
|--------|-------------|-----------|-----------|--------------|
| Built-in Tasks | ⭐ Easy | ❌ Manual | ✅ Yes | ⭐⭐ |
| Terminal Manager | ⭐⭐ Medium | ✅ Yes | ✅ Yes | ⭐⭐⭐ |
| Custom Extension | ⭐⭐⭐ Hard | ✅ Yes | ✅ Yes | ⭐⭐⭐⭐ |
| Auto Run Command | ⭐⭐ Medium | ✅ Yes | ✅ Yes | ⭐⭐⭐ |

## Recommended Approach

**For immediate use:** Use Option 1 (Built-in Tasks) - already configured!

**For better UX:** Install **Terminal Manager** extension (Option 2A)

**For full Copilot-like experience:** Use our custom extension (Option 3)

## Quick Start (Right Now)

1. Open VSCode in the workspace
2. Press `Ctrl+Shift+P`
3. Type "Tasks: Run Task"
4. Select "Watch Agent Terminal"
5. Done! You'll see agent commands in real-time

## Future Enhancement

For the ultimate Copilot-like experience, we could:
1. Create a WebSocket connection between backend and VSCode
2. Send commands directly to VSCode terminal API
3. Show inline notifications when agent executes commands
4. Add terminal decorations and highlights

This would require a more sophisticated extension with backend integration.
