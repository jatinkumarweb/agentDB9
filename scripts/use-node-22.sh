#!/bin/bash
# Simple script to switch to Node 22
# Works even if nvm is not in current PATH

set -e

echo "🔄 Switching to Node.js 22..."

# Source nvm directly
export NVM_DIR="/usr/local/share/nvm"
source "$NVM_DIR/nvm.sh" 2>/dev/null || {
    echo "❌ Error: Could not load nvm from $NVM_DIR"
    exit 1
}

# Install and use Node 22
nvm install 22 2>/dev/null || echo "Node 22 already installed"
nvm alias default 22
nvm use 22

# Show version
echo "✅ Active Node version: $(node --version)"
echo "✅ Active npm version: $(npm --version)"
echo ""
echo "💡 To make this permanent, run: .devcontainer/switch-to-node-22.sh"
