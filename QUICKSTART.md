# Quick Start Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- 8GB+ RAM available
- 20GB+ disk space

## Quick Start (2 Steps)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Environment

```bash
npm run dev
```

That's it! The script will automatically:
- Detect if VSCode image needs building
- Build it with the legacy builder (workaround for BuildKit bug)
- Start all services

**Note**: First run takes 5-10 minutes to build all containers.

## Alternative: Manual Build

If you prefer to build VSCode separately:

### 1. Build VSCode Container

```bash
npm run build:vscode
# OR
make build-vscode
# OR
./scripts/build-vscode.sh
```

### 2. Start Services

```bash
npm run dev
# OR
docker-compose up -d
```

## Verify Services

Check that all services are healthy:

```bash
docker-compose ps
```

Expected output: All services should show `Up` or `Up (healthy)` status.

Test the services:

```bash
# Backend health check
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000

# VSCode
curl http://localhost:8080
```

## Access Services

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **VSCode**: [http://localhost:8080](http://localhost:8080)
- **Ollama**: [http://localhost:11434](http://localhost:11434)
- **Qdrant**: [http://localhost:6333](http://localhost:6333)

## Troubleshooting

### Build Error: "mount options is too long"

This is a known BuildKit v0.24.0 bug. Use the legacy builder:

```bash
make build-vscode
# OR
DOCKER_BUILDKIT=0 docker-compose build
```

See [docs/BUILDKIT_WORKAROUND.md](docs/BUILDKIT_WORKAROUND.md) for details.

### Services Not Starting

Check logs:

```bash
docker-compose logs -f
```

Or for a specific service:

```bash
docker-compose logs -f backend
```

### Qdrant Unhealthy

The qdrant healthcheck uses a TCP check. If it fails, check:

```bash
docker logs agentdb9-qdrant-1
```

### Backend Can't Connect to Services

Ensure all dependent services are healthy:

```bash
docker-compose ps | grep healthy
```

Backend depends on: postgres, redis, qdrant

## Useful Commands

```bash
# View all available commands
make help

# View logs
make logs

# Restart services
make restart

# Stop services
make down

# Clean up (removes volumes)
make clean

# Prune Docker cache
make prune

# Check service health
make health
```

## Next Steps

1. Read [docs/SERVICE_RELIABILITY.md](docs/SERVICE_RELIABILITY.md) for the 6-layer reliability solution
2. Check [docs/BUILDKIT_WORKAROUND.md](docs/BUILDKIT_WORKAROUND.md) for build issues
3. Explore the API at [http://localhost:8000/docs](http://localhost:8000/docs)

## Development Workflow

1. Make code changes in your editor
2. Services auto-reload (hot reload enabled)
3. Check logs: `make logs`
4. Test changes in browser

## Stopping Services

```bash
# Stop but keep data
docker-compose down

# Stop and remove volumes (clean slate)
make clean
```
