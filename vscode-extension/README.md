# AgentDB9 Terminal Integration

VSCode extension that shows AI agent commands in real-time, just like GitHub Copilot!

## Features

- 🤖 **Auto-opens terminal** when agent executes commands
- 📺 **Real-time output** - see commands as they run
- 🎨 **Color-coded** - success (green), failure (red)
- ⏱️ **Timestamps** - know when commands executed
- 📁 **Working directory** - see where commands run

## Installation

### Option 1: Install from VSIX (Recommended)
1. Build the extension: `npm install && npm run compile`
2. Package it: `vsce package`
3. Install in VSCode: Extensions → Install from VSIX

### Option 2: Development Mode
1. Open this folder in VSCode
2. Press F5 to launch Extension Development Host
3. The extension will be active in the new window

### Option 3: Manual Installation
1. Copy this folder to `~/.vscode/extensions/agentdb9-terminal-1.0.0/`
2. Reload VSCode

## Usage

The extension automatically:
- Creates a terminal named "🤖 Agent Terminal"
- Watches `/home/coder/workspace/.agent-terminal.log`
- Shows new commands as they execute

### Commands

- **AgentDB9: Show Agent Terminal** - Open/focus the agent terminal
- **AgentDB9: Clear Agent Terminal** - Clear and restart the terminal

### Settings

- `agentdb9.terminal.autoShow` - Auto-show terminal when agent runs commands (default: true)
- `agentdb9.terminal.logFile` - Path to agent log file (default: `/home/coder/workspace/.agent-terminal.log`)

## How It Works

1. Agent executes commands via MCP server
2. Commands are logged to `.agent-terminal.log`
3. Extension watches the log file
4. Terminal automatically shows new output
5. You see everything in real-time!

## Example Output

```
════════════════════════════════════════════════════════════════════════════════
[2025-10-08T21:29:17.755Z] Agent Terminal
Command: npm run dev
Directory: /workspace/next-demo
════════════════════════════════════════════════════════════════════════════════

> next-demo@0.1.0 dev
> next dev --turbopack

   ▲ Next.js 15.5.4 (Turbopack)
   - Local:        http://localhost:3000

 ✓ Ready in 12.2s

────────────────────────────────────────────────────────────────────────────────
✓ SUCCESS (30203ms)
────────────────────────────────────────────────────────────────────────────────
```

## Requirements

- VSCode 1.80.0 or higher
- AgentDB9 backend running
- Access to `/home/coder/workspace/.agent-terminal.log`

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
vsce package
```

## License

MIT
