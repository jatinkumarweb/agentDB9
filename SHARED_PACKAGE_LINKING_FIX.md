# Shared Package Linking Fix

## Problem

Backend was failing to compile with the following error:

```
src/agents/agents.service.ts:110:45 - error TS2339: Property 'memory' does not exist on type 'AgentConfiguration'.
```

### Root Cause

1. **MemoryConfiguration type was added** to `shared/src/types/agent.ts`
2. **Shared package was built** with the new types
3. **npm workspaces failed to create proper symlinks** for `@agentdb9/shared`
4. **Backend's node_modules didn't have the updated types**

This is a known issue with npm workspaces in certain environments (Docker, dev containers, etc.) where symlinks aren't created properly.

## Solution

Created a script to manually link the shared package to all workspaces after building.

### Script: `scripts/link-shared.sh`

```bash
#!/bin/bash
# Builds shared package and copies dist to all workspace node_modules

1. Build shared package
2. Copy dist/ and package.json to:
   - backend/node_modules/@agentdb9/shared/
   - frontend/node_modules/@agentdb9/shared/
   - llm-service/node_modules/@agentdb9/shared/
   - mcp-server/node_modules/@agentdb9/shared/
```

### Integration

Updated `package.json` postinstall hook:

```json
"postinstall": "npm run build --workspace=shared --if-present && ./scripts/link-shared.sh"
```

Now runs automatically after:
- `npm install`
- `npm install --workspaces`
- Any workspace installation

## Verification

### Before Fix
```bash
cd backend && npm run build
# Error: Property 'memory' does not exist on type 'AgentConfiguration'
```

### After Fix
```bash
./scripts/link-shared.sh
cd backend && npm run build
# ✓ Build successful
```

## Why This Happens

### npm Workspaces Expected Behavior
```
backend/node_modules/@agentdb9/shared -> ../../shared (symlink)
```

### Actual Behavior in Some Environments
```
backend/node_modules/@agentdb9/shared -> (doesn't exist)
```

### Environments Affected
- Docker containers
- Dev containers (Gitpod, GitHub Codespaces)
- Some CI/CD environments
- Windows with certain configurations

## Alternative Solutions Considered

### 1. Use npm link (Rejected)
```bash
cd shared && npm link
cd backend && npm link @agentdb9/shared
```
**Problem**: Doesn't persist across container restarts

### 2. Use file: protocol (Current, but insufficient)
```json
"@agentdb9/shared": "file:../shared"
```
**Problem**: npm doesn't always create the symlink

### 3. Manual copy script (Chosen)
```bash
./scripts/link-shared.sh
```
**Advantage**: 
- Always works
- Runs automatically
- No symlink issues
- Works in all environments

## Impact

### Fixed Issues
✅ Backend compiles successfully
✅ MemoryConfiguration type available
✅ All workspaces have access to latest shared types
✅ Automatic linking on install

### Files Changed
- `package.json` - Updated postinstall hook
- `scripts/link-shared.sh` - New linking script

### Workspaces Affected
- ✅ backend
- ✅ frontend  
- ✅ llm-service
- ✅ mcp-server

## Usage

### Manual Linking
```bash
./scripts/link-shared.sh
```

### Automatic Linking
```bash
npm install  # Runs postinstall hook automatically
```

### After Updating Shared Types
```bash
cd shared && npm run build
./scripts/link-shared.sh
```

## Future Improvements

1. **Watch Mode**: Auto-link on shared file changes
2. **Validation**: Check if linking is needed before copying
3. **Cleanup**: Remove old dist files before copying
4. **Logging**: Better output for debugging

## Related Issues

- npm workspaces symlink issues: https://github.com/npm/cli/issues/3637
- Docker volume mount symlink problems
- Dev container workspace linking

## Conclusion

The script ensures that all workspaces always have access to the latest shared package types, regardless of npm workspace symlink behavior. This is a pragmatic solution that works reliably across all environments.
