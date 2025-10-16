# Mac NPM Fix - Complete Guide

## Overview
This document describes the Mac-specific npm installation fix. For information about the container-level development environment configuration (dev servers, port forwarding, etc.), see [Container-Level Dev Environment](./CONTAINER_DEV_ENV.md).

## Problem
On macOS, `npm` was not available in VSCode terminals because the Mac workaround was using the base `codercom/code-server` image instead of our custom `agentdb9-vscode` image with npm installed.

## Root Cause
1. Docker Desktop on Mac has a BuildKit bug causing "mount options is too long" error
2. The workaround was to pull the base image and skip building
3. This meant npm/node customizations were never applied
4. Dynamic workspace containers also used the base image

## Solution Applied

### 1. Updated `scripts/dev-with-cleanup.sh`
- Now always builds VSCode image on Mac with `DOCKER_BUILDKIT=0`
- Ensures latest changes are included every time

### 2. Updated `docker-compose.mac.yml`
- Re-enabled build configuration
- Uses custom Dockerfile with npm installed
- Maintains ARM64 platform for Apple Silicon

### 3. Updated `scripts/start-mac.sh`
- Builds custom image instead of pulling base image
- Uses `DOCKER_BUILDKIT=0` to avoid Mac bug

### 4. Fixed Backend Workspace Container Service
- Changed from `codercom/code-server:latest` to `agentdb9-vscode:latest`
- Ensures dynamic project workspaces use custom image

## How to Apply the Fix

### On Your Mac:

```bash
# 1. Pull latest changes
git pull

# 2. Stop all containers
docker-compose down

# 3. Start with npm run dev (will build VSCode image)
npm run dev

# OR use the Mac-specific script
./scripts/start-mac.sh
```

### What Happens:
1. VSCode image builds with npm/node installed (takes 2-3 minutes first time)
2. All containers start
3. New projects will have npm available in terminals

## Verification

After starting, verify npm is available:

```bash
# Check the image was built
docker images agentdb9-vscode:latest

# Check containers are running
docker ps | grep vscode

# In VSCode terminal (after creating a project):
npm --version  # Should show: 10.9.3
node --version # Should show: v22.20.0
```

## What's Included in Custom Image

The `agentdb9-vscode:latest` image includes:
- ✅ Node.js v22.20.0
- ✅ npm v10.9.3
- ✅ npm/node in `/home/coder/workspace/bin`
- ✅ PATH configured in `.bashrc`, `.profile`, and `.bash_profile`
- ✅ VSCode terminal settings for proper PATH
- ✅ Workspace initialization script

## Troubleshooting

### npm still not found after update

1. **Delete old project and create new one**
   - Old projects may use cached containers
   - New projects will use the updated image

2. **Force rebuild**
   ```bash
   docker-compose down
   DOCKER_BUILDKIT=0 docker-compose build vscode
   docker-compose up -d
   ```

3. **Check which image is being used**
   ```bash
   docker ps --format "{{.Names}}\t{{.Image}}" | grep vscode
   ```
   Should show: `agentdb9-vscode:latest`

4. **Verify npm exists in container**
   ```bash
   docker exec agentdb9-vscode-1 ls -la /home/coder/workspace/bin/
   docker exec agentdb9-vscode-1 npm --version
   ```

### Build fails on Mac

If you get build errors:
```bash
# Try with legacy builder
DOCKER_BUILDKIT=0 docker-compose build vscode

# Or use the build script
./scripts/build-vscode-mac.sh
```

## Architecture Notes

### Container Hierarchy
```
Mac Host
  └── Docker Desktop
      ├── agentdb9-vscode-1 (static, port 8080)
      │   └── Has npm installed
      └── Dynamic workspace containers (created per project)
          └── Also use agentdb9-vscode:latest with npm
```

### Why Two Approaches?
1. **Static VSCode container**: For general workspace access
2. **Dynamic containers**: Created when you create a project in the frontend
3. Both now use the same custom image with npm

## Testing

Run the comprehensive test suite:
```bash
./scripts/test-vscode-workspace.sh
```

This tests:
- Node/npm binary existence
- PATH configuration in different shell contexts
- npm availability in interactive/non-interactive/login shells
- VSCode settings configuration
- Development environment variables (HOST, POLLING, etc.)

## Related Documentation

- [Container-Level Dev Environment](./CONTAINER_DEV_ENV.md) - Container-level configuration for dev servers
- [Dev Server Guide](./DEV_SERVER_GUIDE.md) - Framework-specific dev server configuration

## Related Files

- `vscode/Dockerfile` - Custom image definition with npm
- `vscode/init-workspace.sh` - Workspace initialization
- `backend/src/workspaces/workspace-container.service.ts` - Dynamic container creation
- `scripts/test-vscode-workspace.sh` - Verification tests

## Future Improvements

Consider:
- Cache the built image to speed up subsequent builds
- Add npm version check to CI/CD
- Document for other platforms (Windows, Linux)
