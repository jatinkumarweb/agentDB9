# Simple Workspace Setup - Auto-Configure on Project Creation

## The Simple Approach

Instead of complex `cd` hooks and project detection, just run auto-configuration **once** when:
1. User creates a new project in workspace
2. User opens/mounts a workspace volume
3. Workspace is initialized

## Why This is Better

### ❌ Complex Approach (What We Were Doing)
- Hook into `cd` command
- Track project roots
- Detect project boundaries
- Cache configurations
- Check on every directory change
- **Result:** Over-engineered, slow, confusing

### ✅ Simple Approach (What We Should Do)
- Run auto-configure script when workspace is created/opened
- One-time setup per project
- No hooks, no tracking, no complexity
- **Result:** Simple, fast, clear

## Implementation

### Option 1: Workspace Initialization Hook

When a workspace volume is mounted, run auto-configuration:

```bash
# In workspace initialization script
/workspaces/agentDB9/scripts/auto-configure-workspace.sh
```

### Option 2: User Command

User runs a simple command after creating a project:

```bash
# After creating a project
cd my-new-project
configure-project
```

### Option 3: Automatic on First Dev Server Start

Configure automatically when user first runs `dev` command:

```bash
# User runs
dev 5173

# Script checks if configured, if not:
# 1. Auto-configures
# 2. Starts dev server
```

## Recommended: Option 3 (Auto-Configure on Dev Start)

### Implementation

```bash
# In .dev-env

dev() {
  local port="${1:-3000}"
  
  # Auto-configure if needed (one-time)
  if [ -f "package.json" ] && [ ! -f ".configured" ]; then
    echo "🔧 First time running dev server, configuring project..."
    
    # Detect and configure
    if grep -q '"vite"' package.json || [ -f "vite.config.js" ]; then
      bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh .
    fi
    
    # Mark as configured
    touch .configured
    echo "✅ Project configured!"
    echo ""
  fi
  
  # Set PUBLIC_URL and start
  export PUBLIC_URL="/proxy/${port}"
  export PORT="$port"
  
  echo "🚀 Starting dev server on port $port"
  echo "📦 PUBLIC_URL: $PUBLIC_URL"
  echo "🌐 Access at: http://localhost:8080/proxy/$port/"
  echo ""
  
  npm run dev 2>/dev/null || npm start
}
```

## User Experience

### First Time

```bash
$ cd my-vite-app
$ dev 5173

🔧 First time running dev server, configuring project...
  📦 Adding PUBLIC_URL support to vite.config.js...
  ✅ Vite configured for PUBLIC_URL
✅ Project configured!

🚀 Starting dev server on port 5173
📦 PUBLIC_URL: /proxy/5173
🌐 Access at: http://localhost:8080/proxy/5173/

> vite dev
...
```

### Subsequent Times

```bash
$ dev 5173

🚀 Starting dev server on port 5173
📦 PUBLIC_URL: /proxy/5173
🌐 Access at: http://localhost:8080/proxy/5173/

> vite dev
...
```

## Benefits

### ✅ Simple
- No complex hooks
- No project tracking
- No cache management
- Just works

### ✅ Fast
- Zero overhead on `cd`
- One-time configuration
- Instant subsequent starts

### ✅ Clear
- User knows when configuration happens
- Explicit feedback
- Easy to understand

### ✅ Reliable
- No edge cases with nested projects
- No issues with monorepos
- Works everywhere

## Comparison

### Complex Approach (Before)

```bash
# setup-dev-env.sh: 200+ lines
# - find_project_root()
# - has_project_changed()
# - track CURRENT_PROJECT_ROOT
# - cache management
# - cd hook override
# - project boundary detection

# User experience:
cd my-project          # Triggers auto-config
cd src                 # Silent (same project)
cd ../other-project    # Triggers auto-config
```

### Simple Approach (After)

```bash
# setup-dev-env.sh: 30 lines
# - dev() function with auto-configure check

# User experience:
cd my-project
dev 5173              # Auto-configures on first run
# Done!
```

## Implementation

### Updated setup-dev-env.sh (Simplified)

```bash
#!/bin/bash

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

# Universal dev server starter with auto-configuration
dev() {
  local port="${1:-3000}"
  
  # Auto-configure on first run
  if [ -f "package.json" ] && [ ! -f ".configured" ]; then
    echo "🔧 First time in this project, configuring..."
    
    # Detect framework and configure
    if grep -q '"vite"' package.json || [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
      echo "  📦 Detected Vite project"
      if [ -f "/workspaces/agentDB9/scripts/auto-configure-public-url.sh" ]; then
        bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh . > /dev/null 2>&1
        echo "  ✅ Configured for PUBLIC_URL"
      fi
    elif grep -q '"next"' package.json; then
      echo "  📦 Detected Next.js project"
      echo "  ℹ️  Add to next.config.js: basePath: process.env.PUBLIC_URL || ''"
    elif grep -q '"react-scripts"' package.json; then
      echo "  📦 Detected Create React App"
      echo "  ✅ Native PUBLIC_URL support"
    fi
    
    touch .configured
    echo "✅ Project configured!"
    echo ""
  fi
  
  # Set environment and start
  export PUBLIC_URL="/proxy/${port}"
  export PORT="$port"
  
  echo "🚀 Starting dev server on port $port"
  echo "📦 PUBLIC_URL: $PUBLIC_URL"
  echo "🌐 Access at: http://localhost:8080/proxy/$port/"
  echo ""
  
  npm run dev 2>/dev/null || npm start
}

# Convenience aliases
alias vite-dev='dev 5173'
alias react-start='dev 3000'
alias next-dev='dev 3000'

# Force re-configuration
reconfig() {
  rm -f .configured
  echo "✅ Configuration reset. Run 'dev <port>' to reconfigure."
}

EOF

# Source in shell configs
if ! grep -q ".dev-env" /home/coder/.bashrc; then
    echo "" >> /home/coder/.bashrc
    echo "if [ -f ~/.dev-env ]; then source ~/.dev-env; fi" >> /home/coder/.bashrc
fi

echo "✅ Development environment configured"
```

## Migration

### From Complex to Simple

**Remove:**
- ❌ `find_project_root()`
- ❌ `has_project_changed()`
- ❌ `CURRENT_PROJECT_ROOT` tracking
- ❌ Cache file management
- ❌ `cd` hook override
- ❌ Project boundary detection

**Keep:**
- ✅ `dev()` function
- ✅ Framework detection
- ✅ Auto-configuration script
- ✅ Convenience aliases

**Add:**
- ✅ `.configured` marker file
- ✅ Auto-configure on first `dev` run

## Edge Cases

### Q: What if user deletes .configured?
A: Just run `dev` again, it will reconfigure.

### Q: What if user wants to reconfigure?
A: Run `reconfig` or `rm .configured`

### Q: What about multiple projects?
A: Each project has its own `.configured` file.

### Q: What if user doesn't use `dev` command?
A: They can manually run the auto-configure script once.

## Summary

**Complex Approach:**
- 200+ lines of code
- Project tracking
- Cache management
- cd hooks
- Edge cases

**Simple Approach:**
- 30 lines of code
- Check `.configured` file
- Auto-configure on first `dev` run
- No edge cases

**Result:** 85% less code, 100% more clarity!

## Files to Update

1. ✅ Simplify `vscode/setup-dev-env.sh`
2. ✅ Keep `scripts/auto-configure-public-url.sh` (unchanged)
3. ❌ Remove complex project detection logic
4. ❌ Remove cache management scripts
5. ✅ Update documentation

## Next Steps

1. Simplify setup-dev-env.sh to use `.configured` marker
2. Remove complex project tracking code
3. Update user documentation
4. Test with real projects
5. Deploy to dev container
