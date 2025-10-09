#!/bin/bash

# Fix existing agents with null configuration
# This is a safer alternative to full database reset

set -e

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-agentdb9}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

echo "Fixing agents with null configuration in database: $DB_NAME"
echo ""

# Update agents with null configuration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
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

-- Show how many were updated
SELECT COUNT(*) as updated_agents FROM agents WHERE configuration IS NOT NULL;
EOF

echo ""
echo "✅ Agent configurations fixed!"
echo ""
