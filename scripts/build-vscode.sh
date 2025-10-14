#!/bin/bash
# Build VSCode container using legacy builder to avoid BuildKit v0.24.0 bug
# Bug: "mount options is too long" error in BuildKit v0.24.0
# Workaround: Use DOCKER_BUILDKIT=0 to use legacy builder

set -e

echo "Building VSCode container with legacy builder..."
DOCKER_BUILDKIT=0 docker build -t agentdb9-vscode:latest vscode/

echo "✅ VSCode container built successfully"
docker images | grep agentdb9-vscode
