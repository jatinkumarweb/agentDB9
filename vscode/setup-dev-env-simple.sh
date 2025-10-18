#!/bin/bash
# Simple development environment setup
# Auto-configures projects on first dev server start

cat > /home/coder/.dev-env << 'EOF'
# Development server configuration
export HOST=0.0.0.0
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export REACT_APP_HOST=0.0.0.0
export VITE_HOST=0.0.0.0
export NEXT_PUBLIC_HOST=0.0.0.0
export BROWSER=none
export PUBLIC_URL="${PUBLIC_URL:-/proxy/3000}"

# ============================================================================
# AUTO-CONFIGURATION ON FIRST DEV START
# ============================================================================

# Universal dev server starter with auto-configuration
dev() {
  local port="${1:-3000}"
  
  # Auto-configure on first run (check for .configured marker)
  if [ -f "package.json" ] && [ ! -f ".configured" ]; then
    echo "🔧 First time in this project, configuring..."
    echo ""
    
    # Detect framework and configure
    if grep -q '"vite"' package.json || [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
      echo "  📦 Detected: Vite"
      if [ -f "/workspaces/agentDB9/scripts/auto-configure-public-url.sh" ]; then
        bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh . > /dev/null 2>&1
        echo "  ✅ Configured for PUBLIC_URL"
      fi
      
    elif grep -q '"next"' package.json || [ -f "next.config.js" ]; then
      echo "  📦 Detected: Next.js"
      echo "  ℹ️  Manual config needed: Add to next.config.js"
      echo "     basePath: process.env.PUBLIC_URL || ''"
      
    elif grep -q '"react-scripts"' package.json; then
      echo "  📦 Detected: Create React App"
      echo "  ✅ Native PUBLIC_URL support - no config needed"
      
    else
      echo "  📦 Detected: Node.js project"
      echo "  ℹ️  No auto-configuration needed"
    fi
    
    # Mark as configured
    touch .configured
    echo ""
    echo "✅ Project configured!"
    echo ""
  fi
  
  # Set environment and start dev server
  export PUBLIC_URL="/proxy/${port}"
  export PORT="$port"
  
  echo "🚀 Starting dev server on port $port"
  echo "📦 PUBLIC_URL: $PUBLIC_URL"
  echo "🌐 Access at: http://localhost:8080/proxy/$port/"
  echo ""
  
  # Start the dev server
  npm run dev 2>/dev/null || npm start
}

# Force re-configuration
reconfig() {
  if [ -f ".configured" ]; then
    rm -f .configured
    echo "✅ Configuration reset"
    echo "   Run 'dev <port>' to reconfigure"
  else
    echo "⚠️  Project not configured yet"
    echo "   Run 'dev <port>' to configure"
  fi
}

# Check configuration status
config_status() {
  if [ ! -f "package.json" ]; then
    echo "❌ Not in a Node.js project"
    return 1
  fi
  
  echo "📊 Project Configuration Status"
  echo "================================"
  echo "Directory: $(pwd)"
  
  if [ -f ".configured" ]; then
    echo "Status: ✅ Configured"
    
    # Show what was configured
    if [ -f "vite.config.js" ] && grep -q "process.env.PUBLIC_URL" vite.config.js; then
      echo "Type: Vite"
      echo "PUBLIC_URL: ✅ Enabled"
    elif [ -f "vite.config.ts" ] && grep -q "process.env.PUBLIC_URL" vite.config.ts; then
      echo "Type: Vite (TypeScript)"
      echo "PUBLIC_URL: ✅ Enabled"
    elif grep -q '"next"' package.json; then
      echo "Type: Next.js"
    elif grep -q '"react-scripts"' package.json; then
      echo "Type: Create React App"
      echo "PUBLIC_URL: ✅ Native support"
    else
      echo "Type: Node.js"
    fi
  else
    echo "Status: ⚠️  Not configured"
    echo "Run: dev <port>"
  fi
}

# Convenience aliases
alias vite-dev='dev 5173'
alias react-start='dev 3000'
alias next-dev='dev 3000'

EOF

# Source in .bashrc
if ! grep -q ".dev-env" /home/coder/.bashrc 2>/dev/null; then
    echo "" >> /home/coder/.bashrc
    echo "# Load development environment" >> /home/coder/.bashrc
    echo "if [ -f ~/.dev-env ]; then source ~/.dev-env; fi" >> /home/coder/.bashrc
fi

# Source in .profile
if ! grep -q ".dev-env" /home/coder/.profile 2>/dev/null; then
    echo "" >> /home/coder/.profile
    echo "# Load development environment" >> /home/coder/.profile
    echo "if [ -f ~/.dev-env ]; then source ~/.dev-env; fi" >> /home/coder/.profile
fi

echo "✅ Development environment configured (simple mode)"
echo ""
echo "Usage:"
echo "  cd your-project"
echo "  dev 5173        # Auto-configures on first run"
echo "  vite-dev        # Shortcut for Vite projects"
echo "  react-start     # Shortcut for CRA projects"
echo ""
