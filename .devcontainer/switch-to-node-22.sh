#!/bin/bash
# Switch to Node.js 22 in current devcontainer
# Run this if your terminal still shows Node 18/20 after updating devcontainer.json

set -e

echo "🔄 Switching to Node.js 22..."

# Load nvm
export NVM_DIR="/usr/local/share/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node 22 if not already installed
if ! nvm ls 22 &>/dev/null; then
    echo "📦 Installing Node.js 22..."
    nvm install 22
else
    echo "✅ Node.js 22 already installed"
fi

# Set as default
echo "🔧 Setting Node.js 22 as default..."
nvm alias default 22
nvm use 22

# Verify
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Update shell profiles
echo "📝 Updating shell profiles..."
for profile in ~/.bashrc ~/.zshrc; do
    if [ -f "$profile" ]; then
        # Remove old Node setup if exists
        sed -i '/# Ensure Node 22 is used by default/,+3d' "$profile" 2>/dev/null || true
        
        # Add new setup
        cat >> "$profile" << 'PROFILE_EOF'

# Ensure Node 22 is used by default
export NVM_DIR="/usr/local/share/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22 2>/dev/null
PROFILE_EOF
        echo "  ✅ Updated $profile"
    fi
done

echo ""
echo "✅ Done! Node.js 22 is now active."
echo "📌 New terminals will automatically use Node.js 22"
echo ""
echo "To verify: node --version"
