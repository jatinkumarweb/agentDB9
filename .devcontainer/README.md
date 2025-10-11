# Dev Container Configuration

## Node.js Version

This project uses **Node.js 22** (LTS).

## 🚨 If your terminal shows Node 18 or 20 instead of 22:

### Option 1: Quick Fix (Current Terminal Only)
```bash
source scripts/use-node-22.sh
```
or
```bash
. scripts/use-node-22.sh
```

This switches to Node 22 in your current terminal session.

### Option 2: Permanent Fix (All Future Terminals)
```bash
bash .devcontainer/switch-to-node-22.sh
```

This script will:
- Install Node.js 22 via nvm
- Set it as default
- Update your shell profiles (.bashrc, .zshrc)
- Make it permanent for all new terminals

**Note:** Use `bash` to run the script, not `source` or `.`

### Alternative: Rebuild Container (Clean approach)

**Option 1: Gitpod**
```bash
gitpod devcontainer rebuild
```

**Option 2: VS Code**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Select "Dev Containers: Rebuild Container"

### Verify Node version:
```bash
node --version  # Should show v22.x.x
npm --version   # Should show v10.x.x
```

## Current Configuration

- **Node.js**: 22 (LTS)
- **npm**: >=10.0.0
- **Features**: Docker-in-Docker, Node with nodeGypDependencies

All services (frontend, backend, llm-service, mcp-server, vscode-proxy) use Node 22.
