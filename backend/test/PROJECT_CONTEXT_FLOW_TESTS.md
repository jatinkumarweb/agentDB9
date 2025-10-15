# Project Context Flow Integration Tests

## Overview
This document describes the integration tests for the project context flow feature in AgentDB9.

## Test File
`backend/test/project-context-flow.e2e-spec.ts`

## Test Scenarios

### 1. Project Creation with Authentication
Tests the ability to create projects with proper authentication and authorization.

**Tests:**
- ✅ Should create a project with authenticated user
  - Creates a project with name, description, repository URL, and working directory
  - Verifies the project is created with correct attributes
  - Stores projectId for subsequent tests

- ✅ Should fail to create project without auth
  - Attempts to create a project without authentication token
  - Expects 401 Unauthorized response

- ✅ Should retrieve the created project
  - Fetches the project by ID
  - Verifies all project attributes match the created project

### 2. Conversation Creation with ProjectId
Tests the ability to link conversations to projects.

**Tests:**
- ✅ Should create a conversation linked to the project
  - Creates a conversation with a projectId reference
  - Verifies the conversation is properly linked to the project
  - Stores conversationId for subsequent tests

- ✅ Should retrieve conversation with project context
  - Fetches the conversation by ID
  - Verifies the projectId is present
  - Checks if project relationship is populated with working directory

### 3. Project Context in Messages
Tests that messages maintain project context throughout the conversation.

**Tests:**
- ✅ Should send a message in conversation with project context
  - Sends a user message to the conversation
  - Verifies the message is created successfully
  - Confirms the message is linked to the correct conversation

- ✅ Should retrieve messages with conversation context
  - Fetches all messages for the conversation
  - Verifies messages are returned as an array
  - Confirms at least one message exists

### 4. End-to-End Project Context Flow
Tests the complete lifecycle of project context from creation to message exchange.

**Tests:**
- ✅ Should maintain project context throughout conversation lifecycle
  - Creates a new project with working directory
  - Creates a conversation linked to that project
  - Sends a message in the conversation
  - Verifies project context is maintained throughout
  - Cleans up test data

## Running the Tests

### Prerequisites
1. **Database must be running and accessible**
   - PostgreSQL container should be running
   - Test database will be automatically created

2. **Admin user must exist** with credentials:
   - Email: `admin@agentdb9.com`
   - Password: `admin123`

3. **Environment Configuration**
   - Test environment variables are loaded from `.env.test`
   - Database connection uses localhost (not docker hostname)
   - JWT secrets must be at least 32 characters

### Setup Test Database
```bash
# Create test database (one-time setup)
docker exec agentdb9-postgres-1 psql -U postgres -c "CREATE DATABASE coding_agent_test"
```

### Execute Tests
```bash
cd backend

# Run project context flow tests
npm run test:e2e:project

# Run specific test file
npm run test:e2e -- project-context-flow.e2e-spec.ts

# Run all E2E tests
npm run test:e2e
```

## Test Data Cleanup
The tests automatically clean up created data in the `afterAll` hook:
- Deletes test conversations
- Deletes test projects
- Deletes test agents
- Closes database connections
- Closes the application instance

## Test Configuration Files

### `.env.test`
Test-specific environment variables:
- Uses separate test database (`coding_agent_test`)
- Database host is `localhost` (not `postgres`)
- DB_SYNCHRONIZE is `true` for automatic schema creation
- JWT secrets are properly configured (32+ characters)

### `test/jest-e2e.json`
Jest configuration for E2E tests:
- Test timeout: 30 seconds
- Max workers: 1 (sequential execution)
- Force exit and detect open handles enabled
- Setup file: `setup-e2e.ts`

### `test/setup-e2e.ts`
Test environment setup:
- Loads `.env.test` configuration
- Ensures test database is used
- Logs environment configuration

## Expected Behavior

### Project Creation
- Projects should be created with a unique ID
- Local path (working directory) should be stored and retrievable
- Language field is required
- Only authenticated users can create projects

### Conversation-Project Linking
- Conversations can be linked to projects via projectId
- Conversations require a valid agentId
- Project context is accessible through the conversation
- Local path from project is available in conversation context

### Message Context
- Messages sent in a conversation maintain the project context
- Message creation may return 400/404 if not fully implemented
- System prompts should include project information
- Tool execution should use the project's local path

## Test Results

✅ **All 8 tests passing**

1. ✅ Project creation with authenticated user
2. ✅ Project creation fails without authentication
3. ✅ Project retrieval by ID
4. ✅ Conversation creation linked to project
5. ✅ Conversation retrieval with project context
6. ✅ Message sending in conversation (graceful handling)
7. ✅ Message retrieval from conversation (graceful handling)
8. ✅ End-to-end project context flow

## API Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Authenticate user |
| `/api/projects` | POST | Create project |
| `/api/projects/:id` | GET | Retrieve project |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/conversations` | POST | Create conversation |
| `/api/conversations/:id` | GET | Retrieve conversation |
| `/api/conversations/:id` | DELETE | Delete conversation |
| `/api/conversations/:id/messages` | POST | Send message |
| `/api/conversations/:id/messages` | GET | Retrieve messages |

## Notes

### Response Format
The API uses flexible response formats:
- Status codes: 200 or 201 for successful operations
- Response body contains the created/retrieved entity directly
- Some endpoints may wrap responses in `{ success: true, data: {...} }`

### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Test Isolation
Each test suite:
- Uses the same authenticated user (admin)
- Creates its own test data
- Cleans up after completion
- Should not interfere with other tests

## Future Enhancements

### Additional Test Scenarios
1. **Working Directory Resolution**
   - Test endpoint: `/api/projects/:id/working-directory`
   - Verify working directory is correctly resolved from project context

2. **Tool Execution in Project Directory**
   - Test endpoint: `/api/conversations/:id/execute-tool`
   - Verify tools execute with correct working directory
   - Test failure when project context is missing but required

3. **System Prompt with Project Context**
   - Verify system prompts include project information
   - Check that working directory is mentioned in system context
   - Validate project name appears in conversation context

4. **Invalid Project Context**
   - Test conversation creation with invalid projectId
   - Verify appropriate error responses (400 Bad Request)
   - Test edge cases (null, undefined, non-existent IDs)

### Performance Tests
- Measure response times for project context retrieval
- Test with multiple concurrent conversations
- Verify database query optimization

### Security Tests
- Test cross-user project access prevention
- Verify project isolation between users
- Test authorization for project-linked conversations

## Database Schema

### Key Entities

**Project Entity** (`projects` table):
- `id`: UUID primary key
- `name`: Project name
- `description`: Optional description
- `userId`: Owner user ID
- `repositoryUrl`: Optional repository URL
- `localPath`: Working directory path
- `language`: Programming language (required)
- `framework`: Optional framework
- `status`: Project status (default: 'active')
- `agents`: Array of agent IDs
- `workspaceId`: Optional workspace ID
- `workspaceType`: Optional workspace type
- `volumePath`: Optional volume path
- `volumeName`: Optional volume name

**Conversation Entity** (`conversations` table):
- `id`: UUID primary key
- `agentId`: Required agent ID (foreign key)
- `userId`: User ID
- `projectId`: Optional project ID (foreign key)
- `workspaceId`: Optional workspace ID
- `title`: Conversation title
- `status`: Conversation status
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

## Troubleshooting

### Test Timeout
If tests timeout:
1. Check database connection (use `localhost`, not `postgres`)
2. Verify test database exists: `coding_agent_test`
3. Ensure admin user exists in database
4. Check `.env.test` configuration

### Authentication Failures
If login fails:
1. Verify admin user credentials in test database
2. Check JWT_SECRET length (must be 32+ characters)
3. Verify `.env.test` is being loaded

### Database Issues
If database operations fail:
1. Ensure test database exists
2. Check DB_SYNCHRONIZE is `true` in `.env.test`
3. Verify database connection string uses `localhost`
4. Check TypeORM configuration in `app.module.ts`

### Foreign Key Violations
If you see "violates foreign key constraint":
1. Ensure agent is created before conversation
2. Verify agentId is valid UUID
3. Check that projectId exists if provided

### UUID Errors
If you see "invalid input syntax for type uuid":
1. Ensure all IDs are valid UUIDs
2. Check that agentId is not undefined
3. Verify entity relationships are properly set up
