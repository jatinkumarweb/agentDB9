# Database Cleanup Guide

This guide explains how to resolve database migration issues in AgentDB9 using the automated cleanup script.

## Problem

When TypeORM tries to modify database schema (especially making columns NOT NULL), it may fail if existing data violates the new constraints. This happens because AgentDB9 uses bind mounts for database persistence, so data survives container restarts. Common errors include:

```
ERROR: column "userId" of relation "conversations" contains null values
QueryFailedError: column "userId" of relation "conversations" contains null values
```

The issue occurs because:
- PostgreSQL data persists in `./postgres_data` directory (bind mount)
- Previous schema versions may have created data that violates new constraints
- TypeORM synchronization fails when trying to enforce new NOT NULL constraints

## Solution

Use the database cleanup script to remove persistent volumes and start with a fresh database.

## Usage

### Quick Commands

```bash
# Standard cleanup (recommended)
npm run clean:db

# Deep cleanup (removes all unused Docker volumes)
npm run clean:db:deep

# Direct script usage
./scripts/clean-db.sh
./scripts/clean-db.sh --deep
```

### What the Script Does

1. **Stops all containers** - Ensures no active connections to database
2. **Removes persistent volumes** - Clears Docker volumes
3. **Removes bind mount directories** - Deletes `postgres_data`, `redis_data`, and `qdrant_data` directories
4. **Starts PostgreSQL** - Brings up a fresh database instance
5. **Starts all services** - Launches the complete application stack
6. **Waits for initialization** - Allows TypeORM to create clean schema and seed data

### Script Options

| Option | Description |
|--------|-------------|
| (none) | Standard cleanup - removes project volumes only |
| `--deep` | Deep cleanup - removes ALL unused Docker volumes (use with caution) |
| `--help` | Show usage information |

## When to Use

### Standard Cleanup (`npm run clean:db`)
- Database migration errors
- Schema constraint violations
- Corrupted database state
- After major entity changes
- When switching between branches with different schemas

### Deep Cleanup (`npm run clean:db:deep`)
- Persistent Docker issues
- When standard cleanup doesn't resolve the problem
- After major Docker configuration changes
- To reclaim disk space from unused volumes

⚠️ **Warning**: Deep cleanup removes ALL unused Docker volumes, not just AgentDB9 volumes.

## Expected Output

```bash
$ npm run clean:db

[INFO] Starting database cleanup process...
[INFO] Stopping all containers...
[INFO] Removing persistent volumes...
[INFO] Starting PostgreSQL database...
[INFO] Waiting for database to be ready...
[INFO] Starting all services...
[INFO] Waiting for backend to initialize...
[INFO] Checking service status...
[SUCCESS] Database cleanup completed successfully!
[INFO] Services should be available at:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:8000
  - API Docs: http://localhost:8000/api/docs
```

## Verification

After running the cleanup script, verify the services are working:

```bash
# Check service status
npm run status

# Test API endpoints
curl http://localhost:8000/api/docs
curl http://localhost:3000

# Check application health
npm run health
```

## Troubleshooting

### Script Fails to Run
- Ensure Docker is running: `docker info`
- Check script permissions: `chmod +x scripts/clean-db.sh`
- Verify Docker Compose is available: `docker compose version`

### Services Don't Start After Cleanup
- Check Docker logs: `npm run logs`
- Verify port availability: `netstat -tulpn | grep :3000`
- Restart Docker if needed: `docker system restart`

### Database Still Has Issues
- Try deep cleanup: `npm run clean:db:deep`
- Check for running containers: `docker ps -a`
- Remove all containers manually: `docker container prune -f`

## Alternative Manual Steps

If the script doesn't work, you can perform cleanup manually:

```bash
# Stop and remove everything
docker compose down -v

# Remove all volumes (optional)
docker system prune -f --volumes

# Start fresh
docker compose up -d
```

## Best Practices

1. **Backup Important Data**: Before cleanup, export any important data you want to keep
2. **Use Standard Cleanup First**: Try `npm run clean:db` before `--deep` option
3. **Check Git Status**: Ensure your code changes are committed before cleanup
4. **Monitor Logs**: Watch service logs during startup to catch issues early
5. **Regular Cleanup**: Run cleanup when switching between feature branches

## Integration with Development Workflow

```bash
# Typical workflow when encountering database issues
git status                    # Check for uncommitted changes
git commit -am "WIP: changes" # Commit work in progress
npm run clean:db             # Clean database
npm run dev                  # Start development
```

This cleanup process ensures a consistent database state across different environments and resolves most TypeORM migration issues.