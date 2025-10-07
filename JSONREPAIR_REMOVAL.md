# jsonrepair Dependency Removal

## Problem
The `jsonrepair` npm package was causing "Cannot find module 'jsonrepair'" errors in Docker watch mode due to npm workspaces hoisting packages to the root `node_modules`, which Docker volume mounts couldn't resolve properly.

## Solution
Removed the `jsonrepair` dependency entirely and replaced it with a custom `parseJSON` utility function.

## Changes Made

### 1. Created Custom JSON Parser
**File:** `backend/src/common/utils/json-parser.util.ts`

A lightweight JSON parser with basic repair capabilities:
- Handles trailing commas
- Fixes missing closing braces/brackets
- Handles unquoted keys
- Returns `null` on parse failure instead of throwing

### 2. Updated Service Files
Replaced all `jsonrepair` imports and usage with custom `parseJSON`:

- `backend/src/conversations/conversations.service.ts`
- `backend/src/mcp/mcp.service.ts`

### 3. Updated Entity Files
Replaced `jsonrepair` in TypeORM column transformers:

- `backend/src/entities/agent.entity.ts` (configuration, capabilities)
- `backend/src/entities/message.entity.ts` (metadata)
- `backend/src/entities/project.entity.ts` (agents array)
- `backend/src/entities/user.entity.ts` (preferences)

### 4. Removed Symlink Setup
**File:** `package.json` (root)

Removed the `setup:symlinks` script and its call from `postinstall` that was attempting to create symlinks for jsonrepair.

### 5. Cleaned Up Dockerfile
**File:** `backend/Dockerfile`

Removed the verification step that checked for jsonrepair in node_modules.

## Verification

✅ Docker build completes successfully  
✅ Backend container starts without module resolution errors  
✅ Database entities load correctly with JSON transformers  
✅ No "Cannot find module" errors in logs  
✅ Health check endpoint responds correctly  

## Benefits

1. **No External Dependency**: Eliminates the problematic npm package
2. **Docker Compatible**: Works seamlessly with Docker volume mounts
3. **Simpler Build**: No need for complex symlink workarounds
4. **Maintainable**: Custom parser is simple and easy to extend
5. **Consistent Behavior**: Same parsing logic across all environments

## Testing

The custom JSON parser handles:
- Valid JSON strings
- JSON with trailing commas
- JSON with missing closing braces
- Malformed JSON (returns null gracefully)

All entity transformers now use this consistent parsing approach.
