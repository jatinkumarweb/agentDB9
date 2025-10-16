#!/bin/bash

# Clean up symlinks before Docker build
echo "🧹 Cleaning up symlinks before Docker build..."
npm run cleanup:symlinks

# Always build VSCode image to ensure latest changes
echo "🔨 Building VSCode image..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   macOS detected - building with BuildKit disabled (workaround for Docker Desktop issue)"
    DOCKER_BUILDKIT=0 docker-compose build vscode
else
    echo "   Building with legacy builder to avoid BuildKit bug..."
    ./scripts/build-vscode.sh
fi

# Run docker-compose with all arguments passed to this script
echo "🚀 Starting Docker services..."
./scripts/docker-setup.sh "$@"

# Recreate symlinks after Docker exits (for local development)
echo "🔗 Recreating symlinks for local development..."
npm run setup:symlinks
