# Docker Development Setup

## Previous Issue: jsonrepair Module Not Found in Watch Mode (RESOLVED)

**Problem:** The `jsonrepair` npm package was causing "Cannot find module 'jsonrepair'" errors in Docker watch mode due to npm workspaces hoisting packages to the root `node_modules`, which Docker volume mounts couldn't resolve properly.

**Solution:** Removed the `jsonrepair` dependency entirely and replaced it with a custom `parseJSON` utility function located at `backend/src/common/utils/json-parser.util.ts`.

See [JSONREPAIR_REMOVAL.md](./JSONREPAIR_REMOVAL.md) for complete details.

## Current Docker Setup

The Docker environment now works seamlessly without any module resolution issues. Simply run:

```bash
docker-compose up -d
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
