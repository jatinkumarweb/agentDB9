# Build Instructions

## ⚠️ Important: Build Errors

If you encounter this error when running `npm run dev` or `docker-compose build`:

```
ERROR [vscode 3/3] WORKDIR /home/coder/workspace
failed to solve: mount options is too long
```

**On Linux/Gitpod**: This is a BuildKit v0.24.0 bug. Follow the workaround below.

**On macOS**: This is a Docker Desktop limitation. See [docs/MAC_SETUP.md](docs/MAC_SETUP.md) for Mac-specific solutions.

## Quick Fix (Recommended)

### Option 1: Use npm (Easiest)

```bash
npm run build:vscode
npm run dev
```

### Option 2: Use the Build Script

```bash
./scripts/build-vscode.sh
docker-compose up -d
```

### Option 3: Use Make

```bash
make build-vscode
make up
```

### Option 4: Manual Build with Legacy Builder

```bash
DOCKER_BUILDKIT=0 docker build -t agentdb9-vscode:latest vscode/
docker-compose up -d
```

## Complete Build Process

### Step 1: Build VSCode Container

**Choose one method:**

```bash
# Method A: npm (easiest)
npm run build:vscode

# Method B: Build script
./scripts/build-vscode.sh

# Method C: Make
make build-vscode

# Method D: Manual
DOCKER_BUILDKIT=0 docker build -t agentdb9-vscode:latest vscode/
```

### Step 2: Build Other Services

```bash
docker-compose build
```

Or build everything with legacy builder:

```bash
make build-legacy
# OR
DOCKER_BUILDKIT=0 docker-compose build
```

### Step 3: Start Services

```bash
docker-compose up -d
```

Or:

```bash
make up
```

## Verification

Check that all services are running:

```bash
docker-compose ps
```

All services should show `Up` or `Up (healthy)` status.

Test the services:

```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000

# VSCode
curl http://localhost:8080
```

## Why This Happens

BuildKit v0.24.0 has a bug where it generates mount options that exceed system limits, even for simple Dockerfiles. The error occurs during the build process, not at runtime.

**The workaround**: Use Docker's legacy builder (`DOCKER_BUILDKIT=0`) which doesn't have this bug.

## Additional Resources

- **Quick Start Guide**: [QUICKSTART.md](QUICKSTART.md)
- **Detailed Workaround**: [docs/BUILDKIT_WORKAROUND.md](docs/BUILDKIT_WORKAROUND.md)
- **Service Reliability**: [docs/SERVICE_RELIABILITY.md](docs/SERVICE_RELIABILITY.md)

## Common Issues

### Issue: "Image not found" when running docker-compose up

**Solution**: Build the VSCode image first using one of the methods above.

### Issue: Services fail to start

**Solution**: Check logs:
```bash
docker-compose logs -f
```

### Issue: Build works in Gitpod but not locally

**Solution**: This is expected. Gitpod may have different Docker/BuildKit versions. Always use the legacy builder workaround locally.

## Need Help?

1. Check [QUICKSTART.md](QUICKSTART.md) for step-by-step setup
2. Review [docs/BUILDKIT_WORKAROUND.md](docs/BUILDKIT_WORKAROUND.md) for detailed troubleshooting
3. Run `make help` to see all available commands
