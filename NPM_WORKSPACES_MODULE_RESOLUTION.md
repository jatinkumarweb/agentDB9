# npm Workspaces Module Resolution Solution

## Problem

npm workspaces hoists common dependencies to the root `node_modules` directory. This causes TypeScript compilation errors in workspace packages because TypeScript can't resolve modules from the parent directory by default.

### Symptoms:
```
error TS2307: Cannot find module 'jsonrepair' or its corresponding type declarations.
error TS2307: Cannot find module 'cheerio' or its corresponding type declarations.
```

### Why It Happens:
1. npm installs shared dependencies in root `node_modules/`
2. TypeScript in `backend/` looks for modules in `backend/node_modules/`
3. TypeScript doesn't check `../node_modules/` by default
4. Node.js runtime works fine (it checks parent directories)
5. Docker builds work fine (they install in container's node_modules)

## Previous Failed Solutions

### ❌ Symlinks
- Created symlinks from `backend/node_modules/package` to `../node_modules/package`
- **Problems:**
  - Cross-platform issues (Windows vs Unix)
  - Git tracking complications
  - Docker volume mount conflicts
  - Maintenance overhead for each new dependency

### ❌ Disabling Hoisting
- Tried `.npmrc` with `hoist-pattern[]=!package`
- **Problems:**
  - npm workspaces doesn't fully support this
  - Inconsistent behavior
  - Breaks other workspace features

### ❌ Custom JSON Parser
- Replaced jsonrepair with custom implementation
- **Problems:**
  - Limited functionality
  - Maintenance burden
  - Reinventing the wheel

### ❌ require() Instead of import
- Used `const { pkg } = require('pkg')` instead of `import`
- **Problems:**
  - Loses TypeScript type checking
  - Inconsistent with rest of codebase
  - Not a real solution

## ✅ Robust Solution: Two-Part Approach

### Part 1: TypeScript Compilation (Build Time)

Configure TypeScript to look in parent node_modules using the `paths` compiler option.

Add specific path mappings to `tsconfig.json` for hoisted packages:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "jsonrepair": ["../node_modules/jsonrepair"],
      "cheerio": ["../node_modules/cheerio"],
      "@types/cheerio": ["../node_modules/@types/cheerio"]
    }
  }
}
```

**Important:** Use specific package names, NOT wildcards like `"*"`. Wildcards can break module resolution for other packages.

### Part 2: Runtime Resolution (Node.js)

Configure Node.js to find hoisted packages at runtime using `NODE_PATH` and volume mounts.

#### docker-compose.yml

For each service, add:

```yaml
services:
  backend:
    environment:
      # Allow Node.js to resolve hoisted packages from root node_modules
      - NODE_PATH=/workspace/node_modules
    volumes:
      - ./backend:/app
      # Mount root node_modules as read-only for hoisted package resolution
      - ./node_modules:/workspace/node_modules:ro
```

#### .devcontainer/devcontainer.json

```json
{
  "remoteEnv": {
    "NODE_PATH": "${containerWorkspaceFolder}/node_modules"
  }
}
```

### How It Works

#### Build Time (TypeScript)
1. TypeScript checks the `paths` mapping first
2. For mapped packages (like `jsonrepair`), it looks in `../node_modules/`
3. For unmapped packages, normal resolution applies
4. Explicit and predictable behavior

#### Runtime (Node.js)
1. `NODE_PATH` tells Node.js to check `/workspace/node_modules`
2. Root node_modules is mounted as read-only volume
3. Node.js can resolve hoisted packages at runtime
4. Works in Docker containers and dev containers
5. No symlinks, no special scripts

### Applied To

#### TypeScript Configuration:
- ✅ `backend/tsconfig.json` - jsonrepair path mapping

#### Docker Configuration:
- ✅ `docker-compose.yml` - All services (backend, frontend, llm-service, mcp-server)
  - NODE_PATH environment variable
  - Root node_modules volume mount

#### Dev Container Configuration:
- ✅ `.devcontainer/devcontainer.json` - NODE_PATH in remoteEnv

## Benefits

### 🎯 Future-Proof
- Works for any new dependency automatically
- No need to create symlinks for each package
- No need to update scripts or configuration

### 🔧 Maintainable
- Standard TypeScript feature
- No custom scripts or workarounds
- Clear and documented solution

### 🚀 Compatible
- Works in local development
- Works in Docker builds
- Works across all platforms
- Works with npm workspaces hoisting

### 📦 Clean
- No symlinks in git
- No .npmrc hacks
- No require() workarounds
- Proper TypeScript imports with types

## Usage

### Adding New Dependencies

1. Install normally:
```bash
cd backend
npm install new-package
```

2. If you get "Cannot find module" error during **build**:
```bash
# Check if it's hoisted
ls -la node_modules/new-package  # Should exist
ls -la backend/node_modules/new-package  # Should NOT exist
```

3. Add path mapping to `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "new-package": ["../node_modules/new-package"]
    }
  }
}
```

4. **Runtime resolution is automatic** - NODE_PATH and volume mounts are already configured in docker-compose.yml

### Verification

Test that TypeScript can resolve hoisted packages:
```bash
cd backend
npm run build
```

Should compile without "Cannot find module" errors.

## Technical Details

### TypeScript Module Resolution

With `"moduleResolution": "node"`, TypeScript follows Node.js resolution:
1. Check `node_modules/` in current directory
2. Check `node_modules/` in parent directories (up to root)

But TypeScript's default behavior doesn't check parent directories for type definitions. The `paths` configuration explicitly tells it to look there.

### npm Workspaces Hoisting

npm hoists dependencies to root when:
- Multiple workspaces use the same package
- The package version is compatible across workspaces
- No conflicts with other versions

This is good for:
- Disk space (single copy)
- Installation speed
- Dependency deduplication

Our solution makes TypeScript work with this behavior instead of fighting it.

## Troubleshooting

### Still Getting "Cannot find module"?

1. **Check tsconfig.json has paths configured:**
   ```bash
   grep -A 3 '"paths"' backend/tsconfig.json
   ```

2. **Verify package is installed:**
   ```bash
   ls -la node_modules/package-name
   ```

3. **Clear TypeScript cache:**
   ```bash
   rm -rf backend/dist
   cd backend && npm run build
   ```

4. **Check if package is hoisted:**
   ```bash
   # Should be in root, not workspace
   ls -la node_modules/package-name
   ls -la backend/node_modules/package-name  # Should not exist
   ```

### Docker Build Issues?

Docker builds install dependencies in the container's own node_modules, so hoisting doesn't affect them. If Docker builds fail:

1. Check Dockerfile installs the package
2. Verify package.json includes the dependency
3. Rebuild without cache: `docker-compose build --no-cache backend`

## Migration from Old Solutions

### Removing Symlinks

If you have old symlinks:
```bash
# Remove symlinks
rm backend/node_modules/jsonrepair
rm backend/node_modules/cheerio

# Remove symlink scripts from package.json
# (Already done in this commit)
```

### Reverting require() Hacks

Change:
```typescript
const { pkg } = require('pkg');
```

To:
```typescript
import { pkg } from 'pkg';
```

TypeScript will now resolve it correctly.

## References

- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [TypeScript Compiler Options - paths](https://www.typescriptlang.org/tsconfig#paths)
- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
