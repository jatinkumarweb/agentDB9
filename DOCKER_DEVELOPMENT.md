# Docker Development Setup

## Issue: jsonrepair Module Not Found in Watch Mode

When running `docker-compose up` with volume mounts, the backend runs in watch mode which compiles TypeScript on file changes. This can cause "Cannot find module 'jsonrepair'" errors because:

1. Docker mounts `./backend` to `/app` in the container
2. `node_modules` is in a Docker volume (not visible to local TypeScript)
3. npm workspaces hoists `jsonrepair` to root `node_modules`
4. Watch mode TypeScript compiler can't find the hoisted package

## Solution

After running `npm install` in the root, create a symlink in backend:

```bash
cd backend
ln -sf ../node_modules/jsonrepair node_modules/jsonrepair
```

This allows the local TypeScript compiler (used by watch mode) to find the hoisted package.

## Alternative: Production Mode

To avoid this issue entirely, run in production mode:

```bash
docker-compose up -d backend
```

This uses the pre-built image without watch mode.

## Verification

Check if the backend is running without errors:

```bash
docker-compose logs backend --tail=50
curl http://localhost:8000/health
```

## Clean Rebuild

If you encounter persistent issues:

```bash
# Stop and remove everything
docker-compose down -v

# Clear Docker cache
docker system prune -f

# Remove local node_modules
rm -rf node_modules backend/node_modules frontend/node_modules

# Reinstall
npm install

# Create symlink
cd backend && ln -sf ../node_modules/jsonrepair node_modules/jsonrepair

# Rebuild and start
docker-compose build --no-cache backend
docker-compose up -d
```
