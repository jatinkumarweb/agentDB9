#!/bin/bash

# Test database setup script
# Creates a separate test database to avoid affecting development data

set -e

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="coding_agent_test"
DB_USER="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

echo "Setting up test database: $DB_NAME at $DB_HOST:$DB_PORT"

# Check if database exists, create if not
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres <<EOF
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
EOF

echo "✅ Test database setup complete!"
echo "Database: $DB_NAME"
echo "The application will automatically run migrations when tests start."
