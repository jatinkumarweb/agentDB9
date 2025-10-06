# Starting AgentDB9 Services

## Quick Start

```bash
# Pull latest changes
git pull origin main

# Stop any running containers
docker-compose down

# Remove old volumes (optional, for clean start)
docker-compose down -v

# Start all services
docker-compose up --build
```

Wait 30-60 seconds for all services to start, then verify:

```bash
# Check all services are running
docker-compose ps

# Test backend
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000

# Test LLM service
curl http://localhost:9000/health

# Test MCP server
curl http://localhost:9001/health
```

## What Changed

### ✅ Switched to PostgreSQL

**Before**: SQLite (file-based database)
- ❌ Native module issues in Docker
- ❌ Architecture mismatches
- ❌ Persistent compilation errors

**After**: PostgreSQL (server-based database)
- ✅ No native module issues
- ✅ Production-ready
- ✅ Better performance
- ✅ Already configured in docker-compose.yml

### Database Configuration

The backend now uses PostgreSQL with these defaults:

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
})
```

## Services Overview

| Service | Port | Status Check |
|---------|------|--------------|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 8000 | http://localhost:8000/health |
| LLM Service | 9000 | http://localhost:9000/health |
| MCP Server | 9001 | http://localhost:9001/health |
| PostgreSQL | 5432 | Internal |
| Redis | 6379 | Internal |
| Qdrant | 6333 | Internal |
| Ollama | 11434 | http://localhost:11434/api/version |

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs backend
docker-compose logs frontend

# Clean rebuild
docker-compose down -v
docker-compose up --build
```

### Backend Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Wait a few seconds, then restart backend
docker-compose restart backend
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :9000  # LLM Service

# Kill process
kill -9 <PID>

# Or change ports in docker-compose.yml
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Development Workflow

### Start Services
```bash
docker-compose up
```

### Stop Services
```bash
docker-compose down
```

### Restart Single Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose up --build backend

# Rebuild all services
docker-compose up --build
```

### Access Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d coding_agent

# List tables
\dt

# Query users
SELECT * FROM users;

# Exit
\q
```

## Environment Variables

Default values are set in `docker-compose.yml`. To override:

1. Create `.env` file in project root:
```env
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_NAME=coding_agent
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

2. Restart services:
```bash
docker-compose down
docker-compose up
```

## Testing

### Run Integration Tests
```bash
./scripts/test-integration.sh
```

### Manual Testing
1. Open http://localhost:3000
2. Sign up / Log in
3. Create a conversation
4. Send a message
5. Verify agent responds

## Common Issues

### "Unable to connect to the database"
- **Solution**: PostgreSQL is starting. Wait 10-20 seconds and backend will retry.

### "Port 5432 already in use"
- **Solution**: Another PostgreSQL is running. Stop it or change port in docker-compose.yml

### "Cannot connect to Docker daemon"
- **Solution**: Start Docker Desktop

### "No space left on device"
- **Solution**: Run `docker system prune -a --volumes`

## Next Steps

After services are running:

1. **Setup Ollama** (optional):
   ```bash
   npm run setup:ollama
   ```

2. **Run Tests**:
   ```bash
   ./scripts/test-integration.sh
   ```

3. **Access Application**:
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/api/docs

4. **Monitor Logs**:
   ```bash
   docker-compose logs -f
   ```

## Success Checklist

- [ ] All containers running (`docker-compose ps`)
- [ ] Backend health check passes (`curl http://localhost:8000/health`)
- [ ] Frontend loads (`curl http://localhost:3000`)
- [ ] Can sign up / log in
- [ ] Can create conversation
- [ ] Agent responds to messages
- [ ] No errors in logs

## Support

If issues persist:
1. Check logs: `docker-compose logs`
2. Clean rebuild: `docker-compose down -v && docker-compose up --build`
3. Review documentation: `DATABASE_USAGE.md`, `INTEGRATION_TESTING.md`
4. Run diagnostics: `./scripts/test-integration.sh`
