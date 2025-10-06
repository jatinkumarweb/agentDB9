# SQLite3 Installation Fix

## Problem

Backend fails to start with error:
```
SQLite package has not been found installed. Please run "npm install sqlite3"
```

This happens because the sqlite3 native module needs to be rebuilt for the Docker container's architecture.

## Quick Fix (For Running Containers)

```bash
# Run the fix script
./scripts/fix-sqlite.sh
```

This will:
1. Find the backend container
2. Rebuild sqlite3 inside the container
3. Restart the backend
4. Verify it's working

## Manual Fix

If the script doesn't work, try these steps:

### Option 1: Rebuild Backend Container

```bash
# Stop services
docker-compose down

# Rebuild backend
docker-compose up --build backend

# Or rebuild all services
docker-compose up --build
```

### Option 2: Fix Running Container

```bash
# Get backend container name
docker ps | grep backend

# Rebuild sqlite3 in container
docker exec <container-name> npm rebuild sqlite3

# Restart container
docker restart <container-name>
```

### Option 3: Clean Rebuild

```bash
# Stop and remove everything
docker-compose down -v

# Remove backend node_modules volume
docker volume rm agentdb9_backend_node_modules

# Rebuild from scratch
docker-compose up --build
```

## Verify Fix

After applying the fix, verify the backend is working:

```bash
# Check health endpoint
curl http://localhost:8000/health

# Should return:
# {"status":"ok","service":"AgentDB9 Backend",...}

# Check logs
npm run logs:backend

# Should NOT see SQLite errors
```

## Why This Happens

SQLite3 is a native Node.js module that needs to be compiled for the specific platform. When:

1. **Volume mounts** override node_modules
2. **Different architectures** (host vs container)
3. **npm install** runs on host then mounted to container

The native module may not work in the container.

## Prevention

The fix is now included in:
- `backend/Dockerfile` - Rebuilds sqlite3 during build
- `backend/package.json` - Postinstall script rebuilds sqlite3
- `scripts/fix-sqlite.sh` - Quick fix for running containers

## Alternative: Use PostgreSQL

If SQLite continues to cause issues, switch to PostgreSQL:

1. **Update** `backend/src/app.module.ts`:
   ```typescript
   TypeOrmModule.forRoot({
     type: 'postgres',
     host: process.env.DB_HOST || 'postgres',
     port: parseInt(process.env.DB_PORT || '5432'),
     username: process.env.DB_USERNAME || 'postgres',
     password: process.env.DB_PASSWORD || 'password',
     database: process.env.DB_NAME || 'coding_agent',
     autoLoadEntities: true,
     synchronize: true,
     logging: true,
   }),
   ```

2. **Restart** services:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

PostgreSQL is already configured in docker-compose.yml and doesn't have native module issues.

## Support

If issues persist:
1. Check logs: `npm run logs:backend`
2. Verify Docker: `docker ps`
3. Check volumes: `docker volume ls`
4. Try clean rebuild: `docker-compose down -v && docker-compose up --build`
