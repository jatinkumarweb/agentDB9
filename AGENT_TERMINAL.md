# Agent Terminal Viewer

See what the AI agent is executing in real-time, just like GitHub Copilot!

## Quick Start

### Option 1: VSCode Task (Automatic)
The agent terminal viewer will automatically open when you open this workspace in VSCode.

To manually start it:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Watch Agent Terminal"

### Option 2: Manual Terminal
Open a new terminal in VSCode and run:
```bash
tail -f /home/coder/workspace/.agent-terminal.log
```

### Option 3: Script
Run the provided script:
```bash
./workspace/.vscode/agent-terminal.sh
```

## What You'll See

The agent terminal shows:
- ✅ Every command the agent executes
- 📁 The working directory for each command
- ⏱️ Execution time and status (SUCCESS/FAILED)
- 📝 Real-time output from commands
- 🎨 Color-coded for easy reading

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

## Features

- **Real-time Updates**: See commands as they execute
- **Full Output**: Complete stdout and stderr
- **Color Coding**: Success (green), Failure (red), Info (cyan)
- **Timestamps**: Know exactly when commands ran
- **Working Directory**: See where commands execute
- **Exit Codes**: Understand command results

## Tips

- Keep the terminal open while working with the agent
- Use `Ctrl+C` to stop watching (doesn't stop the agent)
- The log file persists across sessions
- Clear the log with: `> /home/coder/workspace/.agent-terminal.log`

## Troubleshooting

**Terminal shows "No such file"**
- The agent hasn't executed any commands yet
- The log file will be created on first command execution

**Terminal not updating**
- Make sure you're using `tail -f` (follow mode)
- Check if the agent is actually executing commands

**Want to see past commands?**
```bash
cat /home/coder/workspace/.agent-terminal.log
```

## Integration with Agent

The agent automatically logs all commands to this file. No configuration needed!

When the agent runs dev servers (like `npm run dev`), it creates a persistent terminal session that you can monitor in real-time.
