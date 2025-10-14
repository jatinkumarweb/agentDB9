#!/bin/bash
# Test script for Mac setup

echo "=========================================="
echo "Testing Mac Setup"
echo "=========================================="
echo ""

# Check if on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only"
    exit 1
fi

echo "✅ Running on macOS"
echo ""

# Check Docker
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop."
    exit 1
fi
echo "✅ Docker found: $(docker --version)"
echo ""

# Pull base image
echo "Pulling base image..."
if docker pull codercom/code-server:latest; then
    echo "✅ Base image pulled successfully"
else
    echo "❌ Failed to pull base image"
    exit 1
fi
echo ""

# Tag image
echo "Tagging image..."
docker tag codercom/code-server:latest agentdb9-vscode:latest
echo "✅ Image tagged as agentdb9-vscode:latest"
echo ""

# Verify image
echo "Verifying image..."
if docker images agentdb9-vscode:latest | grep -q agentdb9-vscode; then
    echo "✅ Image ready"
    docker images agentdb9-vscode:latest
else
    echo "❌ Image not found"
    exit 1
fi
echo ""

echo "=========================================="
echo "✅ Mac setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  npm run dev"
echo ""
echo "The services will start with Mac-specific overrides."
echo "No building required!"
