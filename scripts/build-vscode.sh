#!/bin/bash
# Build VSCode container using legacy builder to avoid BuildKit v0.24.0 bug
# Bug: "mount options is too long" error in BuildKit v0.24.0
# Workaround: Use DOCKER_BUILDKIT=0 to use legacy builder

set -e

echo "=========================================="
echo "Building VSCode container with legacy builder"
echo "=========================================="
echo ""
echo "This script works around a BuildKit v0.24.0 bug that causes:"
echo "  'failed to solve: mount options is too long'"
echo ""
echo "Building..."
echo ""

DOCKER_BUILDKIT=0 docker build -t agentdb9-vscode:latest vscode/

echo ""
echo "=========================================="
echo "✅ VSCode container built successfully"
echo "=========================================="
echo ""
echo "Image details:"
docker images | grep agentdb9-vscode | head -1
echo ""
echo "Verify Node.js installation:"
docker run --rm --entrypoint node agentdb9-vscode:latest --version
docker run --rm --entrypoint npm agentdb9-vscode:latest --version
echo ""
echo "You can now run: docker-compose up -d"
