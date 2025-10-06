# Database Usage in AgentDB9

## Overview

AgentDB9 uses **TypeORM** as the ORM (Object-Relational Mapping) layer, which allows us to use either **SQLite** (development) or **PostgreSQL** (production) with the same codebase.

---

## Current Configuration

### Development (Default)
- **Database**: SQLite
- **Location**: `./data/agentdb9.db` (file-based)
- **Configuration**: `backend/src/app.module.ts`

```typescript
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: './data/agentdb9.db',
  autoLoadEntities: true,
  synchronize: true,
  logging: true,
})
```

### Production (Docker Compose)
- **Database**: PostgreSQL 15
- **Host**: postgres container
- **Port**: 5432
- **Database Name**: coding_agent
- **Configuration**: Environment variables in `docker-compose.yml`

---

## Database Entities (Tables)

### 1. **Users** (`users` table)
**Entity**: `backend/src/entities/user.entity.ts`

**Columns**:
- `id` (UUID, Primary Key)
- `email` (Unique)
- `username`
- `password` (Hashed)
- `firstName`
- `lastName`
- `isActive` (Boolean)
- `role` (user/admin)
- `preferences` (JSON)
- `lastLoginAt`
- `createdAt`
- `updatedAt`

**Relations**:
- One-to-Many with Agents
- One-to-Many with Conversations

### 2. **Agents** (`agents` table)
**Entity**: `backend/src/entities/agent.entity.ts`

**Columns**:
- `id` (UUID, Primary Key)
- `name`
- `description`
- `userId` (Foreign Key → users)
- `configuration` (JSON)
  - llmProvider
  - model
  - temperature
  - maxTokens
  - systemPrompt
  - codeStyle
- `status` (idle/thinking/coding/testing/error/offline)
- `capabilities` (JSON Array)
- `createdAt`
- `updatedAt`

**Relations**:
- Many-to-One with User
- One-to-Many with Conversations

### 3. **Conversations** (`conversations` table)
**Entity**: `backend/src/entities/conversation.entity.ts`

**Columns**:
- `id` (UUID, Primary Key)
- `agentId` (Foreign Key → agents)
- `userId` (Foreign Key → users)
- `projectId` (Optional)
- `title`
- `status` (active/archived)
- `createdAt`
- `updatedAt`

**Relations**:
- Many-to-One with Agent
- Many-to-One with User
- One-to-Many with Messages

### 4. **Messages** (`messages` table)
**Entity**: `backend/src/entities/message.entity.ts`

**Columns**:
- `id` (UUID, Primary Key)
- `conversationId` (Foreign Key → conversations)
- `role` (user/agent/system)
- `content` (Text)
- `metadata` (JSON)
  - streaming
  - model
  - provider
  - toolCalls
  - responseTime
- `timestamp`

**Relations**:
- Many-to-One with Conversation

### 5. **Projects** (`projects` table)
**Entity**: `backend/src/entities/project.entity.ts`

**Columns**:
- `id` (UUID, Primary Key)
- `name`
- `description`
- `userId` (Foreign Key → users)
- `repositoryUrl`
- `localPath`
- `framework`
- `language`
- `status` (active/archived/deleted)
- `agents` (JSON Array of agent IDs)
- `createdAt`
- `updatedAt`

**Relations**:
- Many-to-One with User (implicit)

---

## API Endpoints Using Database

### Authentication APIs (`/api/auth`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/api/auth/register` | POST | Create User |
| `/api/auth/login` | POST | Find User by email, verify password |
| `/api/auth/profile` | GET | Find User by ID |
| `/api/auth/profile` | PATCH | Update User |
| `/api/auth/change-password` | POST | Update User password |

**Tables Used**: `users`

### Agents APIs (`/api/agents`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/api/agents` | GET | Find all Agents for user |
| `/api/agents/:id` | GET | Find Agent by ID |
| `/api/agents` | POST | Create Agent |
| `/api/agents/:id` | PUT | Update Agent |
| `/api/agents/:id` | DELETE | Delete Agent |
| `/api/agents/:id/tasks` | POST | Create task (no DB) |
| `/api/agents/chat` | POST | Find Agent, create conversation |
| `/api/agents/:id/chat` | POST | Find Agent, create conversation |

**Tables Used**: `agents`, `conversations`, `messages`

### Conversations APIs (`/api/conversations`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/api/conversations` | GET | Find Conversations by agentId |
| `/api/conversations/agent/:agentId` | GET | Find Conversations by agentId |
| `/api/conversations/:id` | GET | Find Conversation by ID with messages |
| `/api/conversations` | POST | Create Conversation |
| `/api/conversations/:id/messages` | GET | Find Messages by conversationId |
| `/api/conversations/:id/messages` | POST | Create Message, generate response |
| `/api/conversations/:id/messages/:messageId/stop` | POST | Update Message metadata |

**Tables Used**: `conversations`, `messages`, `agents`

### Projects APIs (`/api/projects`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/api/projects` | GET | Find all Projects for user |
| `/api/projects/:id` | GET | Find Project by ID |
| `/api/projects` | POST | Create Project |
| `/api/projects/:id` | PUT | Update Project |
| `/api/projects/:id` | DELETE | Delete Project |

**Tables Used**: `projects`

### Models APIs (`/api/models`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/api/models` | GET | None (reads from shared config) |
| `/api/models/:id` | GET | None (reads from shared config) |
| `/api/models/test` | POST | None (tests model availability) |

**Tables Used**: None (in-memory configuration)

### Providers APIs (`/api/providers`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/api/providers` | GET | None (reads from env vars) |
| `/api/providers/:provider` | POST | None (updates env vars) |

**Tables Used**: None (environment configuration)

### Health APIs (`/api/health`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/health` | GET | Database connection check |
| `/api/health` | GET | Database connection check |

**Tables Used**: Connection test only

### MCP APIs (`/api/mcp`)

| Endpoint | Method | Database Operations |
|----------|--------|---------------------|
| `/api/mcp/tool-execution` | POST | None (broadcasts WebSocket events) |
| `/api/mcp/file-change` | POST | None (broadcasts WebSocket events) |
| `/api/mcp/agent-activity` | POST | None (broadcasts WebSocket events) |

**Tables Used**: None (event broadcasting only)

---

## Database Operations Summary

### Read Operations (SELECT)
- **User authentication**: Find user by email
- **User profile**: Find user by ID
- **Agent management**: Find agents by user
- **Conversation history**: Find conversations and messages
- **Project listing**: Find projects by user

### Write Operations (INSERT)
- **User registration**: Create new user
- **Agent creation**: Create new agent
- **Conversation creation**: Create new conversation
- **Message creation**: Create user and agent messages
- **Project creation**: Create new project

### Update Operations (UPDATE)
- **User profile**: Update user details
- **Password change**: Update user password
- **Agent configuration**: Update agent settings
- **Message streaming**: Update message content during streaming
- **Project details**: Update project information

### Delete Operations (DELETE)
- **Agent deletion**: Remove agent
- **Project deletion**: Remove project
- **Conversation archiving**: Soft delete (status change)

---

## Data Flow Examples

### 1. User Sends Message

```
User → POST /api/conversations/:id/messages
  ↓
1. Find Conversation (SELECT conversations WHERE id = ?)
2. Create User Message (INSERT INTO messages)
3. Create Agent Message (INSERT INTO messages)
4. Call Ollama API (no DB)
5. Stream response → Update Message (UPDATE messages SET content = ?)
6. Execute MCP Tools (no DB)
7. Final Update (UPDATE messages SET streaming = false)
8. Broadcast via WebSocket (no DB)
```

**Database Tables**: `conversations`, `messages`

### 2. User Creates Agent

```
User → POST /api/agents
  ↓
1. Validate user (SELECT users WHERE id = ?)
2. Create Agent (INSERT INTO agents)
3. Return agent data
```

**Database Tables**: `users`, `agents`

### 3. User Logs In

```
User → POST /api/auth/login
  ↓
1. Find User by email (SELECT users WHERE email = ?)
2. Verify password (bcrypt compare)
3. Update lastLoginAt (UPDATE users SET lastLoginAt = ?)
4. Generate JWT token (no DB)
5. Return token
```

**Database Tables**: `users`

---

## SQLite vs PostgreSQL

### SQLite (Development)
**Pros**:
- ✅ No separate database server needed
- ✅ File-based, easy to backup
- ✅ Fast for development
- ✅ Zero configuration

**Cons**:
- ❌ Single writer at a time
- ❌ Not suitable for production
- ❌ Limited concurrent connections
- ❌ Native module issues in Docker

**Use Case**: Local development, testing

### PostgreSQL (Production)
**Pros**:
- ✅ Production-ready
- ✅ Multiple concurrent connections
- ✅ Better performance at scale
- ✅ Advanced features (JSON, full-text search)
- ✅ No native module issues

**Cons**:
- ❌ Requires separate server
- ❌ More complex setup
- ❌ Resource overhead

**Use Case**: Production, staging, multi-user environments

---

## Switching Between Databases

### Switch to PostgreSQL

**1. Update `backend/src/app.module.ts`**:
```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'coding_agent',
  autoLoadEntities: true,
  synchronize: true, // Set to false in production
  logging: true,
})
```

**2. Set environment variables**:
```bash
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=coding_agent
```

**3. Restart services**:
```bash
docker-compose down
docker-compose up --build
```

### Switch to SQLite

**1. Update `backend/src/app.module.ts`**:
```typescript
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: './data/agentdb9.db',
  autoLoadEntities: true,
  synchronize: true,
  logging: true,
})
```

**2. Restart services**:
```bash
docker-compose down
docker-compose up --build
```

---

## Database Migrations

Currently using **synchronize: true** which auto-creates/updates tables.

**⚠️ Warning**: In production, use proper migrations:

```typescript
// Disable synchronize
synchronize: false,

// Use migrations
migrations: ['dist/migrations/*.js'],
migrationsRun: true,
```

Generate migrations:
```bash
npm run typeorm migration:generate -- -n MigrationName
npm run typeorm migration:run
```

---

## Performance Considerations

### Indexing
- Primary keys (id) are automatically indexed
- Foreign keys should be indexed for joins
- Email field is unique (automatically indexed)

### Query Optimization
- Use `relations` option to eager load related data
- Avoid N+1 queries with proper joins
- Use pagination for large result sets

### Caching
- Redis used for session storage
- Model cache in conversations service (5 min TTL)
- Ollama health check cache (5 min TTL)

---

## Backup & Recovery

### SQLite Backup
```bash
# Copy database file
cp ./data/agentdb9.db ./backups/agentdb9-$(date +%Y%m%d).db

# Or use SQLite backup command
sqlite3 ./data/agentdb9.db ".backup ./backups/backup.db"
```

### PostgreSQL Backup
```bash
# Dump database
docker exec postgres pg_dump -U postgres coding_agent > backup.sql

# Restore database
docker exec -i postgres psql -U postgres coding_agent < backup.sql
```

---

## Monitoring

### Check Database Connection
```bash
curl http://localhost:8000/health
```

### View Database Logs
```bash
# Backend logs (includes TypeORM queries)
npm run logs:backend

# PostgreSQL logs
docker logs postgres
```

### Database Size
```bash
# SQLite
ls -lh ./data/agentdb9.db

# PostgreSQL
docker exec postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('coding_agent'));"
```

---

## Summary

| Component | Database Usage |
|-----------|----------------|
| **Authentication** | Users table (login, register, profile) |
| **Agents** | Agents table (CRUD operations) |
| **Conversations** | Conversations + Messages tables (chat history) |
| **Projects** | Projects table (project management) |
| **Models** | No database (in-memory config) |
| **Providers** | No database (environment vars) |
| **MCP Tools** | No database (event broadcasting) |
| **WebSocket** | No database (real-time events) |
| **LLM Service** | No database (API calls to Ollama) |

**Total Tables**: 5 (users, agents, conversations, messages, projects)

**Database Type**: SQLite (dev) / PostgreSQL (prod)

**ORM**: TypeORM with auto-synchronization
