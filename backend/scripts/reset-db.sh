#!/bin/bash

# Database reset script for development environments
# WARNING: This will delete all data in the database!

set -e

echo "⚠️  WARNING: This will delete all data in the database!"
echo "This should only be used in development environments."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-agentdb9}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

echo ""
echo "Connecting to database: $DB_NAME at $DB_HOST:$DB_PORT"
echo ""

# Drop and recreate database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

echo ""
echo "✅ Database reset complete!"
echo "The application will automatically run migrations on next startup."
echo ""
