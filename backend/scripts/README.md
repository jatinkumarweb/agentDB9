# Database Management Scripts

## Quick Fix for Configuration Migration Issue

If you're getting the error:
```
column "configuration" of relation "agents" contains null values
```

### Option 1: Fix Existing Data (Recommended)

Run this command to update existing agents with default configuration:

```bash
npm run db:fix-configs
```

This will:
- Connect to your database
- Update all agents with null configuration to have default values
- Preserve all existing data

**Note:** Make sure your database is running and environment variables are set correctly.

### Option 2: Reset Database (Development Only)

⚠️ **WARNING: This will delete ALL data!**

```bash
npm run db:reset
```

This will:
- Drop the entire database
- Recreate it from scratch
- Migrations will run automatically on next app startup

## Environment Variables

Make sure these are set (or use defaults):

```bash
DB_HOST=localhost      # default
DB_PORT=5432          # default
DB_NAME=agentdb9      # default
DB_USER=postgres      # default
DB_PASSWORD=postgres  # default
```

## Manual Fix (if scripts don't work)

Connect to your database and run:

```sql
UPDATE agents 
SET configuration = '{
    "llmProvider": "ollama",
    "model": "qwen2.5-coder:7b",
    "temperature": 0.7,
    "maxTokens": 2048,
    "codeStyle": {
        "indentSize": 2,
        "indentType": "spaces",
        "lineLength": 100,
        "semicolons": true,
        "quotes": "single",
        "trailingCommas": true,
        "bracketSpacing": true,
        "arrowParens": "always"
    },
    "autoSave": true,
    "autoFormat": true,
    "autoTest": false,
    "workspace": {
        "enableActions": true,
        "enableContext": true
    }
}'::jsonb
WHERE configuration IS NULL;
```

## Starting the Database

If using Docker Compose:

```bash
docker-compose up -d postgres
```

Or check your deployment's database connection details.
