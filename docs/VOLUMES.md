# Volume Management

## Project-Specific Volumes

All Docker volumes are now organized under `.volumes/agentdb9/` for better management and isolation.

## Directory Structure

```
.volumes/agentdb9/
├── backend-node-modules/    # Backend Node.js dependencies
├── llm-service-node-modules/ # LLM service Node.js dependencies
├── ollama/                   # Ollama models and data
├── postgres/                 # PostgreSQL database files
├── qdrant/                   # Qdrant vector database
├── redis/                    # Redis cache data
├── vscode-data/              # VSCode Server configuration
├── vscode-extensions/        # VSCode extensions
└── workspace/                # User workspace files
```

## Benefits

1. **Better Organization**: All volumes in one place
2. **Easy Cleanup**: Delete `.volumes/agentdb9/` to reset all data
3. **Project Isolation**: Multiple projects won't conflict
4. **Backup Friendly**: Easy to backup/restore specific volumes
5. **Clear Ownership**: Directory name matches project name

## Volume Mapping

| Service | Container Path | Host Path |
|---------|---------------|-----------|
| VSCode | `/home/coder/workspace` | `.volumes/agentdb9/workspace` |
| VSCode | `/home/coder/.local/share/code-server` | `.volumes/agentdb9/vscode-data` |
| VSCode | `/home/coder/.local/share/code-server/extensions` | `.volumes/agentdb9/vscode-extensions` |
| Backend | `/app/node_modules` | `.volumes/agentdb9/backend-node-modules` |
| Backend | `/workspace` | `.volumes/agentdb9/workspace` |
| LLM Service | `/app/node_modules` | `.volumes/agentdb9/llm-service-node-modules` |
| MCP Server | `/workspace` | `.volumes/agentdb9/workspace` |
| PostgreSQL | `/var/lib/postgresql/data` | `.volumes/agentdb9/postgres` |
| Redis | `/data` | `.volumes/agentdb9/redis` |
| Qdrant | `/qdrant/storage` | `.volumes/agentdb9/qdrant` |
| Ollama | `/root/.ollama` | `.volumes/agentdb9/ollama` |

## Common Operations

### Reset All Data

```bash
# Stop services
docker-compose down

# Remove all volumes
rm -rf .volumes/agentdb9/

# Recreate directories
mkdir -p .volumes/agentdb9/{vscode-data,vscode-extensions,workspace,postgres,redis,qdrant,ollama,backend-node-modules,llm-service-node-modules}

# Start services
docker-compose up -d
```

### Reset Specific Service

```bash
# Stop services
docker-compose down

# Remove specific volume (e.g., PostgreSQL)
rm -rf .volumes/agentdb9/postgres/

# Recreate directory
mkdir -p .volumes/agentdb9/postgres

# Start services
docker-compose up -d
```

### Backup Volumes

```bash
# Backup all volumes
tar -czf agentdb9-volumes-backup-$(date +%Y%m%d).tar.gz .volumes/agentdb9/

# Backup specific volume (e.g., workspace)
tar -czf workspace-backup-$(date +%Y%m%d).tar.gz .volumes/agentdb9/workspace/
```

### Restore Volumes

```bash
# Stop services
docker-compose down

# Restore from backup
tar -xzf agentdb9-volumes-backup-20241014.tar.gz

# Start services
docker-compose up -d
```

### Check Volume Sizes

```bash
# All volumes
du -sh .volumes/agentdb9/*

# Specific volume
du -sh .volumes/agentdb9/ollama
```

## Migration from Legacy Volumes

If you have existing data in the old volume locations:

```bash
# Stop services
docker-compose down

# Migrate data
mkdir -p .volumes/agentdb9
[ -d postgres_data ] && mv postgres_data .volumes/agentdb9/postgres
[ -d redis_data ] && mv redis_data .volumes/agentdb9/redis
[ -d qdrant_data ] && mv qdrant_data .volumes/agentdb9/qdrant
[ -d ollama_data ] && mv ollama_data .volumes/agentdb9/ollama
[ -d workspace ] && cp -r workspace/* .volumes/agentdb9/workspace/

# Create missing directories
mkdir -p .volumes/agentdb9/{vscode-data,vscode-extensions,backend-node-modules,llm-service-node-modules}

# Start services
docker-compose up -d
```

## Troubleshooting

### Permission Issues

If you encounter permission errors:

```bash
# Fix ownership (run as root or with sudo if needed)
sudo chown -R $(id -u):$(id -g) .volumes/agentdb9/
```

### Volume Not Found

If a service fails to start due to missing volume:

```bash
# Create the missing directory
mkdir -p .volumes/agentdb9/<volume-name>

# Restart the service
docker-compose restart <service-name>
```

### Disk Space Issues

Check available space:

```bash
# Check disk usage
df -h

# Check volume sizes
du -sh .volumes/agentdb9/*

# Clean up old data if needed
docker-compose down
rm -rf .volumes/agentdb9/ollama/*  # Example: clear Ollama models
docker-compose up -d
```

## Notes

- The `.volumes/` directory is gitignored
- Volumes are created automatically on first run
- Data persists across container restarts
- Use `docker-compose down -v` to remove Docker-managed volumes (not applicable here since we use bind mounts)
