# macOS Setup Guide

## Known Issue: Docker Desktop for Mac

If you're on macOS (especially Apple Silicon/ARM64), you may encounter this error:

```
failed to mount /var/lib/docker/rootfs/overlayfs/...: mount options is too long
```

This occurs **even with the legacy builder** and is a Docker Desktop for Mac limitation, not a BuildKit bug.

## Quick Fix

Run the Mac-specific build script:

```bash
./scripts/build-vscode-mac.sh
```

This script tries multiple approaches automatically:
1. Minimal Dockerfile (base image only)
2. Simple Dockerfile (with setup script)
3. Pull pre-built image (if available)

## Manual Workarounds

### Option 1: Use Minimal Image (Recommended)

Build without Node.js installation:

```bash
DOCKER_BUILDKIT=0 docker build -f vscode/Dockerfile.minimal -t agentdb9-vscode:latest vscode/
```

**Note**: This uses Node.js from the base image (may be v18 instead of v22).

### Option 2: Increase Docker Desktop Resources

1. Open Docker Desktop
2. Go to **Settings** > **Resources**
3. Increase:
   - **Memory**: 8GB or more
   - **Disk image size**: 100GB or more
4. Click **Apply & Restart**
5. Try building again

### Option 3: Reset Docker Desktop

⚠️ **Warning**: This deletes all containers and images

1. Open Docker Desktop
2. Go to **Troubleshoot** (bug icon)
3. Click **Reset to factory defaults**
4. Restart Docker Desktop
5. Try building again

### Option 4: Use Colima (Alternative to Docker Desktop)

[Colima](https://github.com/abiosoft/colima) is a lightweight alternative to Docker Desktop:

```bash
# Install Colima
brew install colima docker docker-compose

# Start Colima with more resources
colima start --cpu 4 --memory 8 --disk 100

# Build VSCode
./scripts/build-vscode.sh
```

### Option 5: Use Gitpod or Linux

This issue is specific to Docker Desktop for Mac. The project works fine on:
- **Gitpod** (cloud development environment)
- **Linux** (native Docker)
- **WSL2** on Windows

## Why This Happens

Docker Desktop for Mac uses a VM with overlay filesystem. When building complex images, the mount options string can exceed system limits. This is a known limitation of Docker Desktop's architecture on macOS.

## Verification

After building, verify the image:

```bash
docker images agentdb9-vscode
docker run --rm agentdb9-vscode:latest node --version
```

## Starting Services

Once the image is built:

```bash
npm run dev
```

Or:

```bash
docker-compose up -d
```

## Still Having Issues?

1. **Check Docker Desktop version**: Update to latest version
   ```bash
   docker version
   ```

2. **Check available disk space**:
   ```bash
   df -h
   ```

3. **Check Docker Desktop logs**:
   - Docker Desktop > Troubleshoot > View logs

4. **Try the minimal image**: It works in most cases
   ```bash
   docker build -f vscode/Dockerfile.minimal -t agentdb9-vscode:latest vscode/
   ```

## Alternative: Skip VSCode Container

If you can't build the VSCode container, you can still use the project without it:

```bash
# Start services except VSCode
docker-compose up -d backend frontend llm-service postgres redis qdrant ollama
```

Then use your local VS Code or editor to work with the code.

## Need Help?

- Check [BUILD_INSTRUCTIONS.md](../BUILD_INSTRUCTIONS.md) for general build issues
- See [BUILDKIT_WORKAROUND.md](BUILDKIT_WORKAROUND.md) for BuildKit-specific issues
- Review [QUICKSTART.md](../QUICKSTART.md) for setup steps
