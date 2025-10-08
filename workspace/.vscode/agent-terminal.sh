#!/bin/bash
# Agent Terminal Viewer
# This script shows what the agent is executing in real-time

echo "🤖 Agent Terminal Viewer"
echo "========================"
echo ""
echo "Watching agent commands in real-time..."
echo "Press Ctrl+C to exit"
echo ""

# Watch the agent terminal log file
tail -f /home/coder/workspace/.agent-terminal.log 2>/dev/null || echo "No agent activity yet. The log will appear when the agent executes commands."
