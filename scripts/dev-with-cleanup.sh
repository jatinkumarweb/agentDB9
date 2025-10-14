#!/bin/bash

# Clean up symlinks before Docker build
echo "🧹 Cleaning up symlinks before Docker build..."
npm run cleanup:symlinks

# Check if VSCode image exists, if not build it with legacy builder
if ! docker images agentdb9-vscode:latest | grep -q agentdb9-vscode; then
    echo "⚠️  VSCode image not found. Building with legacy builder to avoid BuildKit bug..."
    echo "   (This is a workaround for BuildKit v0.24.0 'mount options is too long' error)"
    ./scripts/build-vscode.sh
fi

# Run docker-compose with all arguments passed to this script
echo "🚀 Starting Docker services..."
./scripts/docker-setup.sh "$@"

# Recreate symlinks after Docker exits (for local development)
echo "🔗 Recreating symlinks for local development..."
npm run setup:symlinks
