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
# Check for @nestjs/common (core package) and specific packages that have caused issues
if [ ! -d "node_modules" ] || \
   [ ! -d "node_modules/@nestjs/common" ] || \
   [ ! -d "node_modules/@nestjs/event-emitter" ] || \
   [ ! -d "node_modules/@nestjs/schedule" ] || \
   [ ! -d "node_modules/dockerode" ]; then
  echo "📦 Installing app dependencies..."
  npm install
fi

# Execute the command passed to the script
exec "$@"
