#!/bin/bash
set -e

# Build shared package if needed (mounted volume overrides built version)
if [ -d "/shared" ]; then
  echo "📦 Building shared package..."
  cd /shared
  if [ ! -d "node_modules" ] || [ ! -d "node_modules/@types/node" ]; then
    npm install --include=dev
  fi
  if [ ! -d "dist" ]; then
    npm run build
  fi
  cd /app
fi

# Check if node_modules is empty or missing critical packages
if [ ! -d "node_modules" ] || [ ! -d "node_modules/ts-node-dev" ]; then
  echo "📦 Installing app dependencies..."
  npm install
fi

# Execute the command passed to the script
exec "$@"
