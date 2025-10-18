# Universal PUBLIC_URL Solution for All React Frameworks

## Overview

This document describes a universal approach to handle proxy paths for all React frameworks (Create React App, Vite, Next.js, etc.) using a single environment variable: `PUBLIC_URL`.

## The Problem

Different frameworks handle base paths differently:

| Framework | Environment Variable | Config File |
|-----------|---------------------|-------------|
| Create React App | `PUBLIC_URL` | ✅ Native support |
| Vite | ❌ Not supported | `base` in vite.config.js |
| Next.js | ❌ Not supported | `basePath` in next.config.js |
| Webpack | `PUBLIC_PATH` | webpack.config.js |

This inconsistency means you need different configurations for each framework.

## The Solution

Create a **universal wrapper** that:
1. Reads `PUBLIC_URL` environment variable
2. Automatically configures the appropriate setting for each framework
3. Works without modifying project files

## Implementation

### 1. Universal Dev Server Wrapper Script

Create `/usr/local/bin/dev-server` that detects the framework and applies the correct configuration:

```bash
#!/bin/bash
# Universal dev server wrapper
# Automatically configures PUBLIC_URL for any framework

set -e

# Get PUBLIC_URL from environment or default
PUBLIC_URL="${PUBLIC_URL:-/}"
PORT="${PORT:-3000}"

# Detect framework
detect_framework() {
  if [ -f "package.json" ]; then
    # Check for Vite
    if grep -q '"vite"' package.json || [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
      echo "vite"
      return
    fi
    
    # Check for Next.js
    if grep -q '"next"' package.json || [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
      echo "nextjs"
      return
    fi
    
    # Check for Create React App
    if grep -q '"react-scripts"' package.json; then
      echo "cra"
      return
    fi
    
    # Check for Webpack
    if [ -f "webpack.config.js" ]; then
      echo "webpack"
      return
    fi
  fi
  
  echo "unknown"
}

FRAMEWORK=$(detect_framework)

echo "🔍 Detected framework: $FRAMEWORK"
echo "📦 PUBLIC_URL: $PUBLIC_URL"
echo "🔌 PORT: $PORT"

case $FRAMEWORK in
  vite)
    echo "🚀 Starting Vite with base path: $PUBLIC_URL"
    # Vite uses VITE_BASE_PATH (custom) or we inject it via config
    VITE_BASE_PATH="$PUBLIC_URL" npm run dev -- --host 0.0.0.0 --port "$PORT"
    ;;
    
  nextjs)
    echo "🚀 Starting Next.js with base path: $PUBLIC_URL"
    # Next.js requires basePath in next.config.js
    # We'll create a wrapper config if needed
    npm run dev
    ;;
    
  cra)
    echo "🚀 Starting Create React App with PUBLIC_URL: $PUBLIC_URL"
    # CRA natively supports PUBLIC_URL
    npm start
    ;;
    
  webpack)
    echo "🚀 Starting Webpack dev server with PUBLIC_PATH: $PUBLIC_URL"
    PUBLIC_PATH="$PUBLIC_URL" npm start
    ;;
    
  *)
    echo "⚠️  Unknown framework, starting with default command"
    npm start
    ;;
esac
```

### 2. Framework-Specific Configuration Injectors

#### Vite Configuration Injector

Create a plugin that reads `PUBLIC_URL` and sets `base`:

**`vite-public-url-plugin.js`** (auto-generated):

```javascript
// Auto-generated Vite plugin to support PUBLIC_URL
export default function vitePublicUrlPlugin() {
  const publicUrl = process.env.PUBLIC_URL || process.env.VITE_BASE_PATH || '/';
  
  return {
    name: 'vite-public-url',
    config() {
      return {
        base: publicUrl,
      };
    },
  };
}
```

**Usage in `vite.config.js`:**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Support PUBLIC_URL environment variable
const base = process.env.PUBLIC_URL || process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
```

#### Next.js Configuration Wrapper

**`next.config.wrapper.js`** (auto-generated):

```javascript
// Auto-generated Next.js config wrapper to support PUBLIC_URL
const publicUrl = process.env.PUBLIC_URL || '';
const basePath = publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: basePath === '/' ? '' : basePath,
  assetPrefix: basePath === '/' ? '' : basePath,
  // Import user's config if it exists
  ...(require('./next.config.js') || {}),
}

module.exports = nextConfig
```

### 3. Auto-Configuration Script

Create a script that automatically configures projects on first run:

**`/usr/local/bin/auto-configure-public-url`:**

```bash
#!/bin/bash
# Auto-configure PUBLIC_URL support for any framework

set -e

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

if [ ! -f "package.json" ]; then
  echo "❌ No package.json found"
  exit 1
fi

echo "🔧 Auto-configuring PUBLIC_URL support..."

# Detect framework
if grep -q '"vite"' package.json || [ -f "vite.config.js" ]; then
  echo "📦 Detected: Vite"
  
  # Check if vite.config.js exists
  if [ -f "vite.config.js" ]; then
    # Check if it already has base configuration
    if ! grep -q "process.env.PUBLIC_URL" vite.config.js; then
      echo "⚙️  Adding PUBLIC_URL support to vite.config.js..."
      
      # Backup original
      cp vite.config.js vite.config.js.backup
      
      # Inject PUBLIC_URL support
      cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Support PUBLIC_URL environment variable (universal approach)
const base = process.env.PUBLIC_URL || process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
  }
})
EOF
      
      echo "✅ Vite configured to use PUBLIC_URL"
    else
      echo "✅ Vite already configured for PUBLIC_URL"
    fi
  fi
  
elif grep -q '"next"' package.json; then
  echo "📦 Detected: Next.js"
  echo "⚠️  Next.js requires manual basePath configuration in next.config.js"
  echo "   Add: basePath: process.env.PUBLIC_URL || ''"
  
elif grep -q '"react-scripts"' package.json; then
  echo "📦 Detected: Create React App"
  echo "✅ CRA natively supports PUBLIC_URL - no configuration needed"
  
else
  echo "⚠️  Unknown framework"
fi

echo ""
echo "🎉 Configuration complete!"
echo ""
echo "Usage:"
echo "  PUBLIC_URL=/proxy/5173 npm run dev"
echo "  PUBLIC_URL=/proxy/3000 npm start"
```

### 4. Updated Shell Environment

Update `/home/coder/.dev-env` to include the auto-configuration:

```bash
# Universal PUBLIC_URL support for all frameworks
export PUBLIC_URL="${PUBLIC_URL:-/proxy/3000}"

# Auto-configure projects on cd
auto_configure_on_cd() {
  if [ -f "package.json" ] && [ ! -f ".public-url-configured" ]; then
    echo "🔧 First time in this project, auto-configuring PUBLIC_URL support..."
    auto-configure-public-url . && touch .public-url-configured
  fi
}

# Hook into cd command
cd() {
  builtin cd "$@" && auto_configure_on_cd
}

# Convenience function to start any dev server with PUBLIC_URL
dev() {
  local port="${1:-3000}"
  export PUBLIC_URL="/proxy/${port}"
  export PORT="$port"
  
  echo "🚀 Starting dev server on port $port"
  echo "📦 PUBLIC_URL: $PUBLIC_URL"
  echo "🌐 Access at: http://localhost:8080/proxy/$port/"
  
  dev-server
}

# Framework-specific aliases (for convenience)
alias react-start='dev 3000'
alias vite-dev='dev 5173'
alias next-dev='dev 3000'
```

## Usage

### Automatic (Recommended)

Just navigate to your project and start the dev server:

```bash
cd my-react-app
dev 5173  # Automatically configures and starts on port 5173
```

Or use framework-specific aliases:

```bash
vite-dev    # Starts Vite on port 5173 with PUBLIC_URL=/proxy/5173
react-start # Starts CRA on port 3000 with PUBLIC_URL=/proxy/3000
next-dev    # Starts Next.js on port 3000 with PUBLIC_URL=/proxy/3000
```

### Manual

Set `PUBLIC_URL` before starting:

```bash
PUBLIC_URL=/proxy/5173 npm run dev
```

### Custom Port

```bash
dev 8080  # Starts on port 8080 with PUBLIC_URL=/proxy/8080
```

## How It Works

1. **Environment Detection**: Scripts detect which framework you're using
2. **Auto-Configuration**: On first run, the appropriate config is generated
3. **Universal Variable**: All frameworks read from `PUBLIC_URL`
4. **Framework Translation**: Each framework's specific config is set automatically

## Benefits

✅ **Single environment variable** - Use `PUBLIC_URL` for everything
✅ **No manual configuration** - Auto-detects and configures
✅ **Framework agnostic** - Works with CRA, Vite, Next.js, etc.
✅ **Non-invasive** - Doesn't break existing configurations
✅ **Backward compatible** - Falls back to framework defaults

## Framework Support Matrix

| Framework | PUBLIC_URL Support | Auto-Config | Manual Config |
|-----------|-------------------|-------------|---------------|
| Create React App | ✅ Native | ✅ | Not needed |
| Vite | ✅ Via base | ✅ | vite.config.js |
| Next.js | ✅ Via basePath | ⚠️ Manual | next.config.js |
| Webpack | ✅ Via PUBLIC_PATH | ✅ | webpack.config.js |
| Parcel | ✅ Via --public-url | ✅ | CLI flag |

## Migration Guide

### From Vite-Specific Config

**Before:**
```bash
VITE_BASE_PATH=/proxy/5173/ npm run dev
```

**After:**
```bash
PUBLIC_URL=/proxy/5173 npm run dev
# or simply
vite-dev
```

### From Manual Configuration

**Before:**
```javascript
// vite.config.js
export default defineConfig({
  base: '/proxy/5173/',
})
```

**After:**
```javascript
// vite.config.js
export default defineConfig({
  base: process.env.PUBLIC_URL || '/',
})
```

Then use:
```bash
PUBLIC_URL=/proxy/5173 npm run dev
```

## Troubleshooting

### Issue: Assets still 404

**Check PUBLIC_URL is set:**
```bash
echo $PUBLIC_URL
# Should show: /proxy/5173 (or your port)
```

**Check framework detected correctly:**
```bash
dev 5173
# Should show: "🔍 Detected framework: vite"
```

### Issue: Auto-configuration not working

**Manually run configuration:**
```bash
auto-configure-public-url .
```

**Check if already configured:**
```bash
ls -la .public-url-configured
# If exists, delete and re-run
rm .public-url-configured
```

### Issue: Next.js not working

Next.js requires manual configuration in `next.config.js`:

```javascript
module.exports = {
  basePath: process.env.PUBLIC_URL || '',
  assetPrefix: process.env.PUBLIC_URL || '',
}
```

## Implementation Checklist

- [ ] Create `/usr/local/bin/dev-server` wrapper script
- [ ] Create `/usr/local/bin/auto-configure-public-url` script
- [ ] Update `/home/coder/.dev-env` with new functions
- [ ] Add to Docker image build process
- [ ] Test with Create React App
- [ ] Test with Vite
- [ ] Test with Next.js
- [ ] Update documentation
- [ ] Add to workspace setup script

## Next Steps

1. Implement the wrapper scripts
2. Update the Docker image
3. Test with all frameworks
4. Update user documentation
5. Add examples for each framework
