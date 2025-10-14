# BuildKit v0.24.0 Workaround

## Issue

BuildKit v0.24.0 has a known bug that causes the following error during builds:

```
failed to solve: process "/bin/sh -c node --version" did not complete successfully: mount options is too long
```

This error occurs even with simple Dockerfiles and is related to how BuildKit handles mount options internally.

**Important**: This issue persists even after running `docker builder prune -af` in some environments, confirming it's a genuine BuildKit bug, not cache corruption.

## Root Cause

- **BuildKit Version**: v0.24.0
- **Error**: "mount options is too long"
- **Affected Service**: VSCode container build
- **Bug Report**: This is a known issue in BuildKit v0.24.0

## Workaround

### Option 1: Use Make (Easiest)

```bash
make build-vscode
```

This uses the Makefile target that automatically builds with the legacy builder.

### Option 2: Use the Build Script

We've created a helper script that builds the VSCode container using the legacy Docker builder:

```bash
./scripts/build-vscode.sh
```

This script:
1. Uses `DOCKER_BUILDKIT=0` to disable BuildKit
2. Builds the VSCode image with the legacy builder
3. Tags it as `agentdb9-vscode:latest`
4. Verifies Node.js and npm installation

### Option 3: Manual Build with Legacy Builder

```bash
DOCKER_BUILDKIT=0 docker build -t agentdb9-vscode:latest vscode/
```

### Option 4: Build All Services with Legacy Builder

If the issue affects multiple services:

```bash
make build-legacy
# OR
DOCKER_BUILDKIT=0 docker-compose build
```

### Option 5: Build All Services Except VSCode

If you need to rebuild other services but VSCode is already built:

```bash
docker-compose build backend frontend llm-service mcp-server
```

## How docker-compose.yml Handles This

The `docker-compose.yml` file includes both `build` and `image` fields for the vscode service:

```yaml
vscode:
  build:
    context: ./vscode
    dockerfile: Dockerfile
  image: agentdb9-vscode:latest
```

This configuration:
- **If image exists**: Uses the pre-built `agentdb9-vscode:latest` image
- **If image doesn't exist**: Attempts to build (may fail with BuildKit v0.24.0)

## Solution Timeline

This workaround will be needed until:
1. BuildKit releases a fix (v0.24.1 or later), OR
2. Docker Engine updates to a newer BuildKit version, OR
3. We migrate to a different base image that doesn't trigger this bug

## Verification

After building, verify the image exists:

```bash
docker images | grep agentdb9-vscode
```

Expected output:
```
agentdb9-vscode    latest    <image-id>    <time>    1.49GB
```

## Testing

Test the container works:

```bash
docker run --rm --entrypoint node agentdb9-vscode:latest --version
```

Expected output:
```
v22.20.0
```

## Related Files

- `scripts/build-vscode.sh` - Build script using legacy builder
- `vscode/Dockerfile` - VSCode container definition
- `docker-compose.yml` - Service orchestration with workaround
