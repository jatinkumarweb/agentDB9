# Database Reset Guide

This guide explains how to safely reset the database when schema changes are added to the project.

## When to Use Database Reset

Use the database reset script when:

- ✅ New entities are added to the backend
- ✅ Entity columns are modified (added, removed, or changed)
- ✅ Database relationships are updated
- ✅ You encounter schema-related errors
- ✅ You need a clean database state for testing

## Quick Start

### Basic Database Reset

Resets only the PostgreSQL database:

```bash
npm run db:reset
```

Or directly:

```bash
./scripts/db-reset.sh
```

### Full Reset (All Volumes)

Resets database, Redis, and Qdrant vector store:

```bash
npm run db:reset:full
```

Or directly:

```bash
./scripts/db-reset.sh --full
```

## What the Script Does

### Basic Reset (`npm run db:reset`)

1. **Stops backend container** - Ensures no active connections
2. **Removes database volume** - Clears all existing data
3. **Temporarily enables `DB_SYNCHRONIZE=true`** - Allows TypeORM to create tables
4. **Starts all services** - Initializes fresh database
5. **Waits for initialization** - Ensures tables are created
6. **Verifies database** - Checks all tables exist
7. **Restores `DB_SYNCHRONIZE=false`** - Returns to production-safe mode
8. **Restarts backend** - Applies correct configuration
9. **Final health check** - Confirms everything works

### Full Reset (`npm run db:reset:full`)

Same as basic reset, but also:
- Removes Redis cache volume
- Removes Qdrant vector store volume
- Clears all uploaded files and data

## Understanding DB_SYNCHRONIZE

### Why `DB_SYNCHRONIZE=false` is Default

```yaml
environment:
  - DB_SYNCHRONIZE=false  # Production-safe setting
```

**Benefits:**
- ✅ Prevents accidental schema changes
- ✅ Avoids "column already exists" errors
- ✅ Recommended for production environments
- ✅ Forces explicit migrations

**Problem with `DB_SYNCHRONIZE=true`:**
- ❌ Can cause errors on restart if schema exists
- ❌ May attempt to add columns that already exist
- ❌ Not safe for production use

### The Reset Process

The script temporarily enables synchronization to create tables, then disables it:

```bash
# 1. Enable synchronization
DB_SYNCHRONIZE=true

# 2. Start services (creates tables)
docker-compose up -d

# 3. Disable synchronization
DB_SYNCHRONIZE=false

# 4. Restart backend
docker-compose restart backend
```

## Default Users

After reset, these users are automatically created:

| Email | Password | Role |
|-------|----------|------|
| admin@agentdb9.com | admin123 | admin |
| demo@agentdb9.com | demo123 | user |

## Database Tables Created

The reset creates these tables:

- `users` - User accounts and authentication
- `agents` - AI agent configurations
- `conversations` - Chat conversations
- `messages` - Individual chat messages
- `projects` - User projects
- `knowledge_sources` - Knowledge base sources
- `document_chunks` - Chunked documents for RAG
- `project_contexts` - Project context data
- `long_term_memories` - Agent long-term memory
- `migrations` - Database migration tracking

## Troubleshooting

### Script Fails During Initialization

**Symptom:** Backend doesn't become healthy

**Solution:**
```bash
# Check backend logs
docker-compose logs backend

# Manually restore configuration
mv docker-compose.yml.backup docker-compose.yml
docker-compose restart backend
```

### Tables Not Created

**Symptom:** "relation does not exist" errors

**Solution:**
```bash
# Verify DB_SYNCHRONIZE is temporarily enabled
docker exec agentdb9-backend-1 env | grep DB_SYNCHRONIZE

# Check backend logs for errors
docker-compose logs backend | grep -i error
```

### Permission Denied

**Symptom:** Cannot execute script

**Solution:**
```bash
chmod +x scripts/db-reset.sh
```

## Manual Reset (Alternative)

If the script doesn't work, you can manually reset:

```bash
# 1. Stop all services
docker-compose down -v

# 2. Edit docker-compose.yml
# Change: DB_SYNCHRONIZE=false
# To:     DB_SYNCHRONIZE=true

# 3. Start services
docker-compose up -d

# 4. Wait for initialization (30 seconds)
sleep 30

# 5. Check tables exist
docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -c "\dt"

# 6. Restore docker-compose.yml
# Change: DB_SYNCHRONIZE=true
# To:     DB_SYNCHRONIZE=false

# 7. Restart backend
docker-compose restart backend
```

## Best Practices

### Development Workflow

1. **Make schema changes** in entity files
2. **Run database reset** to apply changes
3. **Test your changes** with fresh data
4. **Commit entity changes** to git

### Before Committing

Always ensure:
- ✅ `DB_SYNCHRONIZE=false` in docker-compose.yml
- ✅ Backend starts without errors
- ✅ All APIs respond correctly
- ✅ Database tables are properly seeded

### Production Considerations

For production environments:
- ❌ Never use `DB_SYNCHRONIZE=true`
- ✅ Use proper database migrations
- ✅ Backup database before schema changes
- ✅ Test migrations in staging first

## Related Scripts

- `npm run clean:db` - Clean database with volume removal
- `npm run clean:db:deep` - Deep clean with Docker volume pruning
- `npm run dev` - Start development environment
- `npm run logs:backend` - View backend logs

## Script Output Example

```
╔════════════════════════════════════════════════════════════╗
║         AgentDB9 Database Reset Script                    ║
╔════════════════════════════════════════════════════════════╗

🔄 Performing database-only reset...

📊 Current Database Status:
               List of relations
 Schema |        Name        | Type  |  Owner   
--------+--------------------+-------+----------
 public | agents             | table | postgres
 public | users              | table | postgres
...

1️⃣  Stopping backend container...
2️⃣  Removing database volume...
3️⃣  Temporarily enabling DB_SYNCHRONIZE...
4️⃣  Starting services...
5️⃣  Waiting for database initialization...
⏳ Waiting for backend to be healthy...
✅ Backend is healthy!

6️⃣  Verifying database tables...
7️⃣  Restoring DB_SYNCHRONIZE=false...
8️⃣  Restarting backend with correct configuration...
9️⃣  Final health check...
✅ Backend is healthy!

╔════════════════════════════════════════════════════════════╗
║  ✅ Database reset completed successfully!                 ║
╔════════════════════════════════════════════════════════════╗

📊 Database Status:
               List of relations
 Schema |        Name        | Type  |  Owner   
--------+--------------------+-------+----------
 public | agents             | table | postgres
 public | conversations      | table | postgres
 public | users              | table | postgres
...

🔗 Backend: http://localhost:8000
🔗 Frontend: http://localhost:3000
📚 API Docs: http://localhost:8000/api/docs

Default Users:
  Admin:  admin@agentdb9.com / admin123
  Demo:   demo@agentdb9.com / demo123
```

## See Also

- [Database Cleanup Guide](./database-cleanup.md)
- [Docker Storage Management](../DOCKER_STORAGE_MANAGEMENT.md)
- [Local Setup Troubleshooting](../LOCAL_SETUP_TROUBLESHOOTING.md)
