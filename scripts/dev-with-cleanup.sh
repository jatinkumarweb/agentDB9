#!/bin/bash

# Clean up symlinks before Docker build
echo "🧹 Cleaning up symlinks before Docker build..."
npm run cleanup:symlinks

# Run docker-compose with all arguments passed to this script
echo "🚀 Starting Docker services..."
./scripts/docker-setup.sh "$@"

# Recreate symlinks after Docker exits (for local development)
echo "🔗 Recreating symlinks for local development..."
npm run setup:symlinks
