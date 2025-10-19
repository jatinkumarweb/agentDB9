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

# VSCode code-server proxy configuration
# Detect the port from the current directory or use default
detect_port() {
  # Check if package.json exists and has a start script with a port
  if [ -f "package.json" ]; then
    # Try to extract port from package.json scripts
    local port=$(grep -oP '"start".*?--port[= ]\K\d+' package.json 2>/dev/null || echo "")
    if [ -n "$port" ]; then
      echo "$port"
      return
    fi
  fi
  
  # Check common environment variables
  if [ -n "$PORT" ]; then
    echo "$PORT"
    return
  fi
  
  # Default to 3000 for React/CRA
  echo "3000"
}

# Set PUBLIC_URL for proxy mode
# PUBLIC_URL should be "/" because the backend proxy handles the /proxy/{port}/ prefix
# The dev server serves files from root, proxy translates the paths
setup_public_url() {
  local port="${1:-$(detect_port)}"
  export PUBLIC_URL="/"
  echo "📦 PUBLIC_URL set to: $PUBLIC_URL (proxy handles /proxy/${port}/ prefix)"
}

# Auto-detect and set PUBLIC_URL for proxy mode
# PUBLIC_URL="/" because backend proxy strips the /proxy/{port}/ prefix
if [ -z "$PUBLIC_URL" ]; then
  export PUBLIC_URL="/"
fi

# Convenience aliases for common frameworks
# PUBLIC_URL="/" because proxy handles the path prefix
alias react-start='PUBLIC_URL=/ npm start'
alias vite-dev='PUBLIC_URL=/ npm run dev'
alias next-dev='PUBLIC_URL=/ npm run dev'

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
