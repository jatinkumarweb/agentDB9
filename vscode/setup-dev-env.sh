#!/bin/bash
# Setup development environment for all projects
# This script configures default environment variables for dev servers

# Create a global environment file that all shells will source
cat > /home/coder/.dev-env << 'EOF'
# Development server configuration
# These settings ensure dev servers work correctly in Docker containers

# Bind to all interfaces (not just localhost)
export HOST=0.0.0.0

# Enable polling for file watching (required for Docker volumes)
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true

# React/CRA specific
export REACT_APP_HOST=0.0.0.0

# Vite specific
export VITE_HOST=0.0.0.0

# Next.js specific
export NEXT_PUBLIC_HOST=0.0.0.0

# Disable browser auto-open (doesn't work in containers)
export BROWSER=none

# Set default ports (can be overridden per project)
# export PORT=3000

EOF

# Source this file in .bashrc
if ! grep -q ".dev-env" /home/coder/.bashrc; then
    echo "" >> /home/coder/.bashrc
    echo "# Load development environment variables" >> /home/coder/.bashrc
    echo "if [ -f ~/.dev-env ]; then" >> /home/coder/.bashrc
    echo "    source ~/.dev-env" >> /home/coder/.bashrc
    echo "fi" >> /home/coder/.bashrc
fi

# Also add to .profile for login shells
if ! grep -q ".dev-env" /home/coder/.profile; then
    echo "" >> /home/coder/.profile
    echo "# Load development environment variables" >> /home/coder/.profile
    echo "if [ -f ~/.dev-env ]; then" >> /home/coder/.profile
    echo "    source ~/.dev-env" >> /home/coder/.profile
    echo "fi" >> /home/coder/.profile
fi

echo "✅ Development environment configured"
