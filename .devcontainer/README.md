# Dev Container Configuration

## Node.js Version

This project uses **Node.js 22** (LTS).

### After updating Node version in devcontainer.json:

The devcontainer needs to be rebuilt for changes to take effect:

**Option 1: Rebuild in Gitpod**
```bash
gitpod devcontainer rebuild
```

**Option 2: Rebuild in VS Code**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Select "Dev Containers: Rebuild Container"

**Option 3: Manual install (temporary)**
```bash
bash -c "source /usr/local/share/nvm/nvm.sh && nvm install 22 && nvm alias default 22 && nvm use 22"
```

### Verify Node version:
```bash
node --version  # Should show v22.x.x
```

## Current Configuration

- **Node.js**: 22 (LTS)
- **npm**: >=10.0.0
- **Features**: Docker-in-Docker, Node with nodeGypDependencies

All services (frontend, backend, llm-service, mcp-server, vscode-proxy) use Node 22.
