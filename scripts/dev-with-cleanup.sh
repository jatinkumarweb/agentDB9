#!/bin/bash

# Clean up symlinks before Docker build
echo "🧹 Cleaning up symlinks before Docker build..."
npm run cleanup:symlinks

# Check if VSCode image exists, if not build/pull it
if ! docker images agentdb9-vscode:latest | grep -q agentdb9-vscode; then
    echo "⚠️  VSCode image not found."
    
    # On Mac, just pull the base image
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   macOS detected - pulling base image (workaround for Docker Desktop issue)"
        docker pull codercom/code-server:latest
        docker tag codercom/code-server:latest agentdb9-vscode:latest
    else
        echo "   Building with legacy builder to avoid BuildKit bug..."
        ./scripts/build-vscode.sh
    fi
fi

# Run docker-compose with all arguments passed to this script
echo "🚀 Starting Docker services..."
./scripts/docker-setup.sh "$@"

# Recreate symlinks after Docker exits (for local development)
echo "🔗 Recreating symlinks for local development..."
npm run setup:symlinks
