# Workspace Types & Models Endpoint Status

## Workspace Types Status

### Currently Available ✅ (2/5)

1. **VS Code** (`vscode`)
   - Container: `codercom/code-server:latest`
   - Port: 8080
   - Features: Full code editor, terminal, debugging, Git integration, extensions
   - Resource Limits: 2 CPUs, 2GB RAM
   - Health Checks: Enabled (30s interval)
   - MCP Tools: 7 tools (list_files, read_file, write_file, delete_file, create_directory, execute_command, get_workspace_summary)
   - Supported Languages: TypeScript, JavaScript, Python, Go, Rust, Java, C++

2. **Spreadsheet** (`spreadsheet`)
   - Container: `agentdb9/spreadsheet:latest`
   - Port: 8081
   - Features: Excel/CSV support, data visualization, formulas, statistical analysis, charts
   - Resource Limits: 1.5 CPUs, 1.5GB RAM
   - Health Checks: Enabled (30s interval)
   - MCP Tools: 7 tools (read_spreadsheet, write_spreadsheet, create_chart, apply_formula, analyze_data, import_csv, export_excel)
   - Supported Languages: Python, JavaScript

### Planned/Future 🔜 (3/5)

3. **Notebook** (`notebook`)
   - Container: `jupyter/datascience-notebook:latest`
   - Port: 8888
   - Features: Jupyter notebooks, interactive execution, rich output, data visualization
   - MCP Tools: 5 tools (execute_cell, create_notebook, read_notebook, install_package, plot_data)
   - Supported Languages: Python, R, Julia
   - Status: Configuration complete, not yet enabled

4. **Database** (`database`)
   - Container: `agentdb9/database:latest`
   - Port: 8082
   - Features: SQL editor, query execution, schema management, data export/import
   - MCP Tools: 6 tools (execute_query, list_tables, describe_table, create_table, export_data, import_data)
   - Supported Languages: SQL, PL/pgSQL
   - Status: Configuration complete, not yet enabled

5. **Design** (`design`)
   - Container: `agentdb9/design:latest`
   - Port: 8083
   - Features: Visual editor, component library, asset management, code generation
   - MCP Tools: 4 tools (create_component, edit_design, export_assets, generate_code)
   - Supported Languages: HTML, CSS, SVG
   - Status: Configuration complete, not yet enabled

### Enabling Future Workspace Types

To enable the remaining workspace types, update `shared/src/types/workspace.ts`:

```typescript
export function getAvailableWorkspaceTypes(): WorkspaceType[] {
  return [
    WorkspaceType.VSCODE, 
    WorkspaceType.SPREADSHEET,
    WorkspaceType.NOTEBOOK,    // Add this
    WorkspaceType.DATABASE,    // Add this
    WorkspaceType.DESIGN       // Add this
  ];
}
```

---

## Models Endpoint Issue

### Problem
The `/api/models` endpoint was returning 500 errors with "fetch failed" message.

### Root Causes Identified

#### 1. Docker Containers Not Running
- Containers were stopped/exited hours ago
- `npm run dev` should start them via Docker Compose
- Port conflicts prevented restart when services were manually started

#### 2. Missing Dependencies in Containers
- Phase 3 added `dockerode` and `@nestjs/schedule` dependencies
- Docker volumes cached old `node_modules` without these packages
- TypeScript compilation failed with "Cannot find module" errors

#### 3. Database Schema Migration Issues
- New `workspaces` table had null values in required columns
- TypeORM synchronization failed on startup
- Backend couldn't start until database was cleaned

### Solution Applied

1. **Stopped all containers and removed volumes:**
   ```bash
   ./scripts/docker-setup.sh down -v
   ```

2. **Cleaned stale volumes:**
   ```bash
   docker volume rm agentdb9_backend_node_modules
   ```

3. **Cleaned database schema:**
   ```bash
   docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -c "DROP TABLE IF EXISTS workspaces CASCADE;"
   ```

4. **Rebuilt all services with fresh volumes:**
   ```bash
   ./scripts/docker-setup.sh up --build -d
   ```

### Current Status

**Services Running:**
- ✅ Backend (port 8000)
- ✅ LLM Service (port 9000) 
- ✅ Frontend (port 3000)
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ Qdrant (port 6333)
- ✅ Ollama (port 11434)

**Models Endpoint:**
- Status: ⚠️ Partially working
- Issue: LLM service container keeps crashing due to missing `ts-node-dev`
- Workaround: Need to fix volume mounting for llm-service node_modules

### Remaining Issues

1. **LLM Service Volume Mount**
   - The llm-service uses anonymous volume `/app/node_modules`
   - Dependencies not persisting across container restarts
   - Need to either:
     - Use named volume like backend
     - Install dependencies in Dockerfile and don't mount local directory
     - Use entrypoint script to install dependencies on startup

2. **Recommended Fix**
   Update `docker-compose.yml` for llm-service:
   ```yaml
   llm-service:
     volumes:
       - ./llm-service:/app
       - ./shared:/shared
       - ./models:/models
       - llm_service_node_modules:/app/node_modules  # Use named volume
       - ./node_modules:/workspace/node_modules:ro
   ```

   Then add to volumes section:
   ```yaml
   volumes:
     backend_node_modules:
     llm_service_node_modules:  # Add this
   ```

---

## Service Architecture

```
┌─────────────┐
│   Frontend  │ :3000
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   Backend   │────▶│ LLM Service  │ :9000
│  (NestJS)   │ :8000│  (Express)   │
└──────┬──────┘     └──────┬───────┘
       │                   │
       ├───────────────────┼────────┐
       ▼                   ▼        ▼
┌────────────┐      ┌─────────┐  ┌────────┐
│ PostgreSQL │      │  Ollama │  │ Qdrant │
│   :5432    │      │  :11434 │  │  :6333 │
└────────────┘      └─────────┘  └────────┘
```

---

## Quick Start Commands

### Start All Services
```bash
cd /workspaces/agentDB9
./scripts/docker-setup.sh up -d
```

### Check Service Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### View Logs
```bash
# All services
npm run logs

# Specific service
docker logs -f agentdb9-backend-1
docker logs -f agentdb9-llm-service-1
```

### Test Endpoints
```bash
# Backend health
curl http://localhost:8000/health

# LLM service health
curl http://localhost:9000/health

# Models endpoint
curl http://localhost:8000/api/models | jq '.success'
```

### Rebuild After Changes
```bash
# Rebuild specific service
./scripts/docker-setup.sh build backend
docker restart agentdb9-backend-1

# Rebuild all
./scripts/docker-setup.sh down
./scripts/docker-setup.sh up --build -d
```

---

## Development Workflow

### Making Changes to Backend/LLM Service

1. **Edit code** in `backend/` or `llm-service/`
2. **Hot reload** should work automatically (watch mode)
3. **If adding dependencies:**
   ```bash
   # Add to package.json
   cd backend  # or llm-service
   npm install new-package
   
   # Rebuild container
   cd /workspaces/agentDB9
   ./scripts/docker-setup.sh build backend
   docker restart agentdb9-backend-1
   ```

### Database Schema Changes

1. **Update entity** in `backend/src/*/entities/`
2. **TypeORM auto-sync** will update schema (development only)
3. **If sync fails:**
   ```bash
   # Drop problematic table
   docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -c "DROP TABLE IF EXISTS table_name CASCADE;"
   
   # Restart backend
   docker restart agentdb9-backend-1
   ```

### Clean Slate Restart

```bash
# Stop everything and remove volumes
./scripts/docker-setup.sh down -v

# Remove named volumes
docker volume rm agentdb9_backend_node_modules agentdb9_llm_service_node_modules 2>/dev/null || true

# Rebuild and start
./scripts/docker-setup.sh up --build -d
```

---

## Next Steps

1. **Fix LLM Service Volume Issue**
   - Update docker-compose.yml to use named volume
   - Rebuild and test

2. **Enable Additional Workspace Types**
   - Update `getAvailableWorkspaceTypes()` function
   - Build custom container images for spreadsheet, database, design
   - Test each workspace type

3. **Add Workspace Management UI**
   - Already implemented in Phase 4
   - Access at: http://localhost:3000/workspace/manage

4. **Production Deployment**
   - Use production Dockerfile (multi-stage builds)
   - Set up proper environment variables
   - Configure reverse proxy (nginx)
   - Set up SSL certificates
   - Use managed databases
