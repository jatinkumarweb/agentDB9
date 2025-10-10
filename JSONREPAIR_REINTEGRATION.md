# jsonrepair Reintegration

## Context
Previously, jsonrepair was removed due to npm workspaces hoisting issues that caused "Cannot find module" errors in Docker watch mode. We've now reintegrated it with a better approach.

## Solution
Instead of fighting npm hoisting, we leverage Docker's isolated node_modules:

### Key Points:

1. **Docker Isolation**: Backend uses named volume `backend_node_modules:/app/node_modules`
   - This keeps node_modules isolated inside the container
   - Host hoisting doesn't affect Docker environment

2. **Explicit Installation**: Dockerfile explicitly installs jsonrepair
   ```dockerfile
   RUN npm install jsonrepair
   ```

3. **No Symlinks**: Avoided symlink approach which causes issues with:
   - Docker volume mounts
   - Cross-platform compatibility
   - Git tracking

4. **Maintained Interface**: parseJSON utility keeps same interface
   - All existing code works without changes
   - Just swapped implementation to use jsonrepair

## Implementation

### Files Changed:

1. **backend/Dockerfile**
   - Added explicit `npm install jsonrepair` step
   - Ensures jsonrepair is available in container

2. **backend/package.json**
   - Added jsonrepair as dependency
   - Version: ^3.13.1

3. **backend/src/common/utils/json-parser.util.ts**
   - Replaced custom repair logic with jsonrepair library
   - Maintains same function signature
   - Returns null on failure (consistent behavior)

## Benefits

✅ **Better JSON Repair**: jsonrepair handles more edge cases than custom parser
✅ **No Hoisting Issues**: Docker isolation prevents module resolution problems
✅ **No Symlinks**: Cleaner, more maintainable approach
✅ **Backward Compatible**: Same interface, all existing code works
✅ **Well Tested**: jsonrepair is a mature, well-tested library

## Testing

Verified jsonrepair handles:
- Missing closing quotes: `{"path": "game-demo}` → `{"path": "game-demo"}`
- Missing closing braces: `{"path": "test"` → `{"path": "test"}`
- Trailing commas: `{"path": "test",}` → `{"path": "test"}`
- Unquoted keys: `{path: "test"}` → `{"path": "test"}`

## Docker Workflow

### Development (docker-compose):
```bash
docker-compose up --build backend
```
- Dockerfile installs jsonrepair in container's node_modules
- Named volume keeps it isolated
- No hoisting issues

### Local Development (without Docker):
```bash
cd backend && npm install
```
- jsonrepair may be hoisted to root node_modules
- Node.js can still resolve it (works fine locally)
- No Docker volume mount issues

## Why This Works

**The Problem Before:**
- npm workspaces hoisted jsonrepair to root node_modules
- Docker volume mounts didn't include root node_modules
- Backend couldn't find jsonrepair at runtime

**The Solution Now:**
- Docker builds with jsonrepair in container's node_modules
- Named volume `backend_node_modules` keeps it isolated
- Backend always finds jsonrepair in its own node_modules
- Host hoisting doesn't matter for Docker

## Verification

To verify jsonrepair is working:

```bash
# Check it's in package.json
grep jsonrepair backend/package.json

# Build and check logs
docker-compose up --build backend

# Should see no "Cannot find module 'jsonrepair'" errors
```

## Rollback

If issues occur, the custom parser is still in git history:
```bash
git show 9861369:backend/src/common/utils/json-parser.util.ts
```
