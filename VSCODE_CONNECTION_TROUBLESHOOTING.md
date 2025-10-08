# VSCode Connection Troubleshooting

## Issue
VSCode container not accessible, no logs showing, connection fails.

## Common Causes

### 1. Container Stopped
**Symptom:** Can't access http://localhost:8080
**Cause:** Container exited or was stopped

**Check:**
```bash
docker ps --filter "name=vscode"
```

**If empty, container is stopped.**

**Fix:**
```bash
docker-compose up -d vscode
```

**Verify:**
```bash
docker ps --filter "name=vscode"
# Should show: Up X seconds
```

### 2. Container Build Issues
**Symptom:** Container fails to start
**Cause:** Dockerfile changes or build errors

**Check logs:**
```bash
docker logs agentdb9-vscode-1 --tail 50
```

**Rebuild:**
```bash
docker-compose build vscode
docker-compose up -d vscode
```

### 3. Port Conflict
**Symptom:** Container starts but can't access
**Cause:** Port 8080 already in use

**Check:**
```bash
lsof -i :8080
# or
netstat -tulpn | grep 8080
```

**Fix:**
- Stop other service using port 8080
- Or change port in docker-compose.yml

### 4. Volume Issues
**Symptom:** Container starts but workspace not accessible
**Cause:** Volume mount problems

**Check volumes:**
```bash
docker volume ls | grep vscode
```

**Fix:**
```bash
# Remove and recreate volumes
docker-compose down -v
docker-compose up -d vscode
```

### 5. Resource Limits
**Symptom:** Container exits immediately
**Cause:** Not enough memory/CPU

**Check:**
```bash
docker stats agentdb9-vscode-1
```

**Fix:** Increase limits in docker-compose.yml:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

## Quick Fix (Most Common)

The most common issue is simply that the container stopped. Quick fix:

```bash
# Restart VSCode container
docker-compose up -d vscode

# Wait a few seconds
sleep 3

# Check status
docker ps --filter "name=vscode"

# Check logs
docker logs agentdb9-vscode-1 --tail 20
```

**Expected output:**
```
[timestamp] info  HTTP server listening on http://0.0.0.0:8080/
[timestamp] info    - Authentication is disabled
```

## Verification Steps

### Step 1: Check Container Status
```bash
docker ps --filter "name=vscode"
```

**Expected:** Container shows "Up X seconds/minutes"

### Step 2: Check Logs
```bash
docker logs agentdb9-vscode-1 --tail 20
```

**Expected:** See "HTTP server listening on http://0.0.0.0:8080/"

### Step 3: Test Connection
```bash
curl -I http://localhost:8080/
```

**Expected:** HTTP 302 or 200 response

### Step 4: Access in Browser
Open: http://localhost:8080

**Expected:** VSCode interface loads

## Complete Restart

If issues persist, do a complete restart:

```bash
# Stop all services
docker-compose down

# Remove volumes (optional, will lose data)
docker-compose down -v

# Rebuild VSCode
docker-compose build vscode

# Start VSCode
docker-compose up -d vscode

# Check logs
docker logs -f agentdb9-vscode-1
```

## Checking Recent Changes

If VSCode stopped working after recent changes:

```bash
# Check recent commits
git log --oneline -10

# Check changes to VSCode files
git log --oneline -- vscode/ docker-compose.yml

# See what changed
git diff HEAD~5 -- vscode/Dockerfile docker-compose.yml
```

## VSCode Container Configuration

**Current configuration (docker-compose.yml):**
```yaml
vscode:
  build:
    context: ./vscode
    dockerfile: Dockerfile
  platform: linux/amd64
  ports:
    - "8080:8080"
  environment:
    - SHELL=/bin/bash
    - DISABLE_WORKSPACE_TRUST=true
  volumes:
    - ./workspace:/home/coder/workspace
    - vscode-data:/home/coder/.local/share/code-server
    - vscode-extensions:/home/coder/.local/share/code-server/extensions
  command: >
    --bind-addr 0.0.0.0:8080
    --auth none
    --disable-telemetry
    --disable-update-check
    --disable-workspace-trust
    --disable-file-downloads
    --disable-getting-started-override
    /home/coder/workspace
```

**Key points:**
- Binds to 0.0.0.0:8080 (accessible from host)
- Authentication disabled (--auth none)
- Workspace mounted at /home/coder/workspace
- Persistent data in vscode-data volume

## VSCode Dockerfile

**Current Dockerfile (vscode/Dockerfile):**
```dockerfile
FROM codercom/code-server:latest

USER root

# Install Node.js 18.x, npm, and git
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify installation
RUN node --version && npm --version && git --version

# Switch back to coder user
USER coder

# Set working directory
WORKDIR /home/coder/workspace
```

**Includes:**
- Node.js 18.x
- npm
- git

## Common Error Messages

### "Connection refused"
**Cause:** Container not running
**Fix:** `docker-compose up -d vscode`

### "Cannot connect to Docker daemon"
**Cause:** Docker not running
**Fix:** Start Docker service

### "Port already in use"
**Cause:** Another service on port 8080
**Fix:** Stop other service or change port

### "No such container"
**Cause:** Container doesn't exist
**Fix:** `docker-compose up -d vscode`

### "Container exited with code 1"
**Cause:** Build or runtime error
**Fix:** Check logs, rebuild container

## Monitoring

### Watch Logs in Real-Time
```bash
docker logs -f agentdb9-vscode-1
```

### Check Resource Usage
```bash
docker stats agentdb9-vscode-1
```

### Check Container Details
```bash
docker inspect agentdb9-vscode-1
```

## Prevention

### Auto-Restart Policy

Add restart policy to docker-compose.yml:

```yaml
vscode:
  restart: unless-stopped
  # ... rest of config
```

This ensures container restarts automatically if it stops.

### Health Check

Add health check to docker-compose.yml:

```yaml
vscode:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  # ... rest of config
```

## Summary

**Most Common Issue:** Container simply stopped

**Quick Fix:**
```bash
docker-compose up -d vscode
```

**Verify:**
```bash
docker ps --filter "name=vscode"
docker logs agentdb9-vscode-1 --tail 20
curl -I http://localhost:8080/
```

**If Still Not Working:**
1. Check logs for errors
2. Rebuild container
3. Check port conflicts
4. Verify volumes
5. Check resource limits

**Access:** http://localhost:8080

---

**Date:** 2025-10-08
**Status:** Container can stop due to inactivity or system restart
**Solution:** Simply restart with `docker-compose up -d vscode`
