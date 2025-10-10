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

## ✅ Simple Solution: TypeScript Path Mappings + Isolated Docker Builds

### The Real Problem

npm workspaces hoists dependencies to the root, which causes TypeScript compilation errors in workspace packages. However:
- **Node.js runtime works fine** - it automatically searches parent directories for modules
- **Docker containers should be isolated** - each container installs its own dependencies

### Solution Part 1: TypeScript Compilation (Local Development)

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

### Solution Part 2: Docker Builds (Isolated Dependencies)

Each Docker container should install its own dependencies locally, avoiding the hoisting issue entirely.

#### Dockerfile Pattern

```dockerfile
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies locally (no hoisting in isolated container)
RUN npm install

# Copy source and build
COPY backend/src ./src
COPY backend/tsconfig*.json ./
RUN npm run build

# Optional: Remove dev dependencies for production
RUN npm prune --production
```

**Key Points:**
- Each container has its own `node_modules/` with all dependencies
- No hoisting issues because dependencies are installed per-package
- Fully isolated and reproducible builds
- No need for NODE_PATH or volume mounts

### How It Works

#### Local Development (TypeScript + Node.js)
1. **Build time:** TypeScript uses `paths` mappings to find hoisted packages in `../node_modules/`
2. **Runtime:** Node.js automatically searches parent directories for modules (standard behavior)
3. No configuration needed beyond tsconfig.json path mappings

#### Docker Containers
1. Each container runs `npm install` in its own directory
2. Dependencies are installed locally in the container's `node_modules/`
3. No hoisting, no shared dependencies between containers
4. Fully isolated and reproducible builds

### Applied To

#### TypeScript Configuration (Local Development):
- ✅ `backend/tsconfig.json` - jsonrepair path mapping

#### Docker Configuration (Isolated Builds):
- ✅ `backend/Dockerfile` - `npm install` for local dependencies
- ✅ `llm-service/Dockerfile` - `npm install` for local dependencies
- ✅ `mcp-server/Dockerfile` - `npm install` for local dependencies

## Benefits

### 🎯 Simple and Clear
- TypeScript path mappings for local development
- Isolated npm install for Docker containers
- No complex configuration or workarounds

### 🔧 Maintainable
- Standard TypeScript and Docker patterns
- No custom scripts or hacks
- Easy to understand and debug

### 🚀 Reliable
- Local development: Node.js handles parent directory resolution automatically
- Docker: Each container has its own isolated dependencies
- Reproducible builds across all environments

### 📦 Clean
- No symlinks in git
- No NODE_PATH environment variables
- No cross-env or other runtime wrappers
- No volume mounts for node_modules

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

4. **Runtime resolution is automatic** - Node.js searches parent directories by default

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

Each Docker container installs its own dependencies locally. If Docker builds fail:

1. **Check Dockerfile uses `npm install`** (not `npm ci` unless you have package-lock.json)
2. **Verify package.json includes all dependencies** (including devDependencies needed for building)
3. **Rebuild without cache:** `docker-compose build --no-cache backend`
4. **Check for build errors:** TypeScript compilation errors, missing types, etc.

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

## Why This Approach Works

### Local Development

**Node.js Module Resolution Algorithm:**
1. Check current directory's `node_modules/`
2. Check parent directory's `node_modules/`
3. Check grandparent directory's `node_modules/`
4. Continue up to filesystem root

When code in `backend/` imports `jsonrepair`:
1. Node.js checks `backend/node_modules/jsonrepair` (not found)
2. Node.js checks `../node_modules/jsonrepair` (found! ✅)

**No configuration needed** - this is standard Node.js behavior.

### Docker Containers

Each container runs `npm install` in its own directory, creating a local `node_modules/` with all dependencies. This means:
- No hoisting issues (each container is isolated)
- Reproducible builds (same dependencies every time)
- No shared state between containers
- Standard Docker best practices

### Verification

**Local development:**
```bash
cd backend
npm run build  # TypeScript compilation
npm run start:dev  # Runtime execution
```

**Docker:**
```bash
docker-compose build backend
docker-compose up backend
```

Both should work without module resolution errors.

