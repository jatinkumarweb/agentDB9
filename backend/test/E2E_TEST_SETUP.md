# E2E Test Setup Guide

This guide explains how to set up and run end-to-end tests for the AgentDB9 backend.

## Overview

The E2E test suite uses:
- **Jest** as the test framework
- **Supertest** for HTTP assertions
- **TypeORM** with PostgreSQL for database
- **Separate test database** to avoid affecting development data

## Initial Setup

### 1. Create Test Database

```bash
# Create the test database
docker exec agentdb9-postgres-1 psql -U postgres -c "CREATE DATABASE coding_agent_test"

# Verify it was created
docker exec agentdb9-postgres-1 psql -U postgres -c "\l" | grep coding_agent_test
```

### 2. Environment Configuration

The test environment is configured in `backend/.env.test`:

```env
# Test Environment Configuration
NODE_ENV=test

# Database - Use test database
DATABASE_URL=postgresql://postgres:password@localhost:5432/coding_agent_test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=coding_agent_test
DB_SYNCHRONIZE=true

# JWT Configuration (must be 32+ characters)
JWT_SECRET=test-secret-key-for-e2e-tests-must-be-at-least-32-chars-long
SESSION_SECRET=test-session-secret-for-e2e-tests-must-be-at-least-32-chars

# Redis
REDIS_URL=redis://redis:6379

# Model Configuration
DEFAULT_MODEL_PROVIDER=ollama
DEFAULT_CODE_MODEL=codellama:13b
DEFAULT_CHAT_MODEL=mistral:7b

# Ollama Configuration
OLLAMA_HOST=http://ollama:11434

# Features
ENABLE_GPU=false
ENABLE_STREAMING=false
ENABLE_MODEL_SWITCHING=true

# Logging
LOG_LEVEL=error
```

**Important Notes:**
- `DB_HOST` must be `localhost` (not `postgres`) when running tests from Gitpod workspace
- `DB_SYNCHRONIZE=true` enables automatic schema creation
- JWT secrets must be at least 32 characters long

### 3. Jest Configuration

The E2E test configuration is in `backend/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "testTimeout": 30000,
  "maxWorkers": 1,
  "forceExit": true,
  "detectOpenHandles": true,
  "setupFilesAfterEnv": ["<rootDir>/setup-e2e.ts"]
}
```

**Key Settings:**
- `testTimeout: 30000` - 30 second timeout for database operations
- `maxWorkers: 1` - Sequential test execution to avoid conflicts
- `forceExit: true` - Ensures Jest exits after tests complete
- `detectOpenHandles: true` - Helps identify connection leaks

### 4. Test Setup File

The `backend/test/setup-e2e.ts` file loads test configuration:

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
const envPath = resolve(__dirname, '../.env.test');
config({ path: envPath });

// Override with test-specific settings
process.env.NODE_ENV = 'test';
process.env.DB_SYNCHRONIZE = 'true';

// Ensure test database is used
if (!process.env.DB_NAME?.includes('test')) {
  process.env.DB_NAME = 'coding_agent_test';
  process.env.DATABASE_URL = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}
```

## Running Tests

### Run All E2E Tests

```bash
cd backend
npm run test:e2e
```

### Run Specific Test Suite

```bash
cd backend

# Project context flow tests
npm run test:e2e:project

# Knowledge ingestion tests
npm run test:knowledge

# Specific test file
npm run test:e2e -- workspaces.e2e-spec.ts
```

### Run with Verbose Output

```bash
cd backend
npm run test:e2e -- --verbose
```

### Run in Watch Mode

```bash
cd backend
npm run test:e2e -- --watch
```

## Test Structure

### Typical E2E Test Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Feature Name (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_SYNCHRONIZE = 'true';
    
    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    
    await app.init();

    // Get database connection
    dataSource = app.get(DataSource);
    
    // Authenticate
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@agentdb9.com',
        password: 'admin123',
      });

    authToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  }, 30000);

  it('should test something', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## Best Practices

### 1. Database Isolation
- Always use the test database (`coding_agent_test`)
- Clean up test data in `afterAll` hooks
- Use transactions when possible

### 2. Authentication
- Use existing admin user for tests
- Store auth token in test suite scope
- Include `Authorization` header in all protected requests

### 3. Test Data Management
- Create minimal test data
- Clean up in reverse order of creation
- Handle cleanup errors gracefully with `.catch(() => {})`

### 4. Assertions
- Handle both wrapped and unwrapped API responses
- Use flexible status code checks: `expect([200, 201]).toContain(status)`
- Test both success and error cases

### 5. Timeouts
- Set appropriate timeouts for database operations
- Use 30 seconds for `beforeAll` and `afterAll`
- Increase timeout for slow operations

## Common Issues and Solutions

### Issue: Tests Timeout

**Cause:** Database connection issues or slow operations

**Solution:**
```bash
# Check database is running
docker ps | grep postgres

# Verify connection
docker exec agentdb9-postgres-1 psql -U postgres -c "SELECT 1"

# Check test database exists
docker exec agentdb9-postgres-1 psql -U postgres -c "\l" | grep test
```

### Issue: JWT Secret Validation Error

**Cause:** JWT_SECRET is too short

**Solution:**
Ensure `.env.test` has JWT secrets with 32+ characters:
```env
JWT_SECRET=test-secret-key-for-e2e-tests-must-be-at-least-32-chars-long
```

### Issue: Cannot Connect to Database

**Cause:** Using wrong hostname

**Solution:**
In `.env.test`, use `localhost` not `postgres`:
```env
DB_HOST=localhost
DATABASE_URL=postgresql://postgres:password@localhost:5432/coding_agent_test
```

### Issue: Foreign Key Violations

**Cause:** Missing required relationships

**Solution:**
Create related entities first:
```typescript
// Create agent before conversation
const agentResponse = await request(app.getHttpServer())
  .post('/api/agents')
  .set('Authorization', `Bearer ${authToken}`)
  .send({ name: 'Test Agent', configuration: {} });

const agentId = agentResponse.body.data.id;

// Now create conversation with agentId
const convResponse = await request(app.getHttpServer())
  .post('/api/conversations')
  .set('Authorization', `Bearer ${authToken}`)
  .send({ title: 'Test', agentId });
```

### Issue: Tests Pass Locally But Fail in CI

**Cause:** Environment differences

**Solution:**
- Ensure CI has access to test database
- Check environment variables are set
- Verify Docker containers are running
- Use consistent database versions

## Maintenance

### Updating Test Database Schema

When entities change:

1. **Option A: Drop and Recreate**
```bash
docker exec agentdb9-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS coding_agent_test"
docker exec agentdb9-postgres-1 psql -U postgres -c "CREATE DATABASE coding_agent_test"
```

2. **Option B: Let TypeORM Sync**
- Ensure `DB_SYNCHRONIZE=true` in `.env.test`
- TypeORM will automatically update schema

### Adding New Test Suites

1. Create test file: `backend/test/feature-name.e2e-spec.ts`
2. Follow the test structure pattern above
3. Add npm script if needed:
```json
{
  "scripts": {
    "test:e2e:feature": "jest --config ./test/jest-e2e.json feature-name.e2e-spec.ts"
  }
}
```

### Debugging Tests

```bash
# Run with debug output
cd backend
node --inspect-brk node_modules/.bin/jest --config ./test/jest-e2e.json --runInBand

# View database state during tests
docker exec -it agentdb9-postgres-1 psql -U postgres -d coding_agent_test

# Check test logs
cd backend
npm run test:e2e 2>&1 | tee test-output.log
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Create test database
        run: |
          PGPASSWORD=password psql -h localhost -U postgres -c "CREATE DATABASE coding_agent_test"
      
      - name: Run E2E tests
        run: |
          cd backend
          npm run test:e2e
        env:
          DB_HOST: localhost
          DB_PASSWORD: password
```

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TypeORM Documentation](https://typeorm.io/)
