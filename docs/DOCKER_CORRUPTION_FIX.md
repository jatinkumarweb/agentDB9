# Docker Corruption Fix Guide

## Problem Description

The error `unable to get image 'agentdb9-frontend': Error response from daemon: rpc error: code = Unknown desc = blob sha256:... input/output error` indicates Docker daemon corruption, specifically corrupted image blobs in the content store.

## Root Causes

1. **Disk I/O errors** during image operations
2. **Interrupted Docker operations** (force quit, system crash)
3. **Insufficient disk space** during image builds
4. **Docker Desktop storage corruption**
5. **Concurrent access conflicts** to Docker daemon

## Quick Fix (Recommended)

Use our automated script:

```bash
# Step 1: Full cleanup
./scripts/fix-docker-corruption.sh --full-clean

# Step 2: Restart Docker Desktop manually
# - Quit Docker Desktop completely
# - Wait 10 seconds
# - Start Docker Desktop
# - Wait for full startup

# Step 3: Verify Docker is working
./scripts/fix-docker-corruption.sh --verify

# Step 4: Rebuild project images
./scripts/fix-docker-corruption.sh --rebuild
```

## Manual Fix Steps

### 1. Stop All Docker Processes

```bash
# Stop all running containers
docker stop $(docker ps -q)

# Remove all containers
docker container prune -f
```

### 2. Clean Docker System

```bash
# Remove all images (this will force re-download)
docker image prune -a -f

# Remove all volumes
docker volume prune -f

# Remove all networks
docker network prune -f

# Remove build cache
docker builder prune -a -f

# Full system cleanup
docker system prune -a -f --volumes
```

### 3. Reset Docker Desktop (If Above Fails)

**Option A: Docker Desktop Settings**
1. Open Docker Desktop
2. Go to Settings → Troubleshoot
3. Click "Reset to factory defaults"
4. Restart Docker Desktop

**Option B: Command Line Reset**
```bash
# On macOS/Linux
docker system reset

# On Windows (PowerShell as Admin)
docker system reset
```

### 4. Alternative: Manual Content Store Cleanup

⚠️ **Advanced users only - this deletes all Docker data**

```bash
# Stop Docker Desktop completely first

# On macOS
rm -rf ~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/image
rm -rf ~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/overlay2

# On Linux
sudo rm -rf /var/lib/docker/image
sudo rm -rf /var/lib/docker/overlay2

# On Windows (PowerShell as Admin)
Remove-Item -Recurse -Force "C:\ProgramData\Docker\image"
Remove-Item -Recurse -Force "C:\ProgramData\Docker\overlay2"
```

### 5. Rebuild Project Images

```bash
# Build images without cache
docker compose build --no-cache

# Or build individually
docker compose build --no-cache frontend
docker compose build --no-cache backend
docker compose build --no-cache llm-service
```

## Prevention

### 1. Regular Cleanup

```bash
# Weekly cleanup
docker system prune -f

# Monthly deep cleanup
docker system prune -a -f
```

### 2. Monitor Disk Space

```bash
# Check Docker disk usage
docker system df

# Check available disk space
df -h
```

### 3. Graceful Shutdowns

- Always stop containers before quitting Docker Desktop
- Use `docker compose down` instead of force-killing processes
- Don't force quit Docker Desktop during operations

### 4. Docker Desktop Settings

- Increase disk space allocation if needed
- Enable "Use gRPC FUSE for file sharing" for better performance
- Regularly update Docker Desktop

## Troubleshooting

### Error Persists After Cleanup

1. **Check disk space**: Ensure at least 10GB free space
2. **Update Docker Desktop**: Use latest version
3. **Check system resources**: Ensure sufficient RAM/CPU
4. **Antivirus interference**: Temporarily disable real-time scanning

### Build Failures After Reset

1. **Clear npm cache**: `npm cache clean --force`
2. **Remove node_modules**: `rm -rf node_modules && npm install`
3. **Check Dockerfile syntax**: Validate all Dockerfiles
4. **Network issues**: Check internet connectivity for base image downloads

### Performance Issues

1. **Increase Docker resources**: More RAM/CPU in Docker Desktop settings
2. **Use .dockerignore**: Exclude unnecessary files from build context
3. **Multi-stage builds**: Optimize Dockerfiles for smaller images

## Script Usage

The `fix-docker-corruption.sh` script provides automated fixes:

```bash
# Show help
./scripts/fix-docker-corruption.sh

# Verify Docker is working
./scripts/fix-docker-corruption.sh --verify

# Rebuild project images only
./scripts/fix-docker-corruption.sh --rebuild

# Full cleanup (requires manual Docker restart)
./scripts/fix-docker-corruption.sh --full-clean
```

## When to Contact Support

If the issue persists after trying all solutions:

1. **Docker Desktop logs**: Check logs in Docker Desktop → Troubleshoot
2. **System logs**: Check system event logs for hardware issues
3. **Disk health**: Run disk health checks
4. **Docker GitHub issues**: Search for similar problems
5. **Hardware issues**: Consider disk/RAM problems

## Related Files

- `scripts/fix-docker-corruption.sh` - Automated fix script
- `docker-compose.yml` - Main Docker configuration
- `frontend/Dockerfile` - Frontend image definition
- `backend/Dockerfile` - Backend image definition
- `llm-service/Dockerfile` - LLM service image definition