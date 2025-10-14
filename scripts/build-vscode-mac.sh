#!/bin/bash
# Build VSCode container for Mac - workaround for Docker Desktop overlay mount issues
# This script tries multiple approaches to work around Mac-specific Docker issues

set -e

echo "=========================================="
echo "VSCode Setup for Mac"
echo "=========================================="
echo ""
echo "Due to Docker Desktop for Mac limitations, we'll use the base image directly."
echo "This avoids the 'mount options is too long' error."
echo ""
echo "Pulling base image..."
docker pull codercom/code-server:latest

if [ $? -eq 0 ]; then
    docker tag codercom/code-server:latest agentdb9-vscode:latest
    echo ""
    echo "✅ SUCCESS: VSCode image ready"
    echo ""
    echo "Note: Using base code-server image (Node.js may be v18 instead of v22)"
    echo "You can install Node.js 22 inside the container if needed."
    echo ""
    echo "Next steps:"
    echo "  npm run dev"
    echo ""
    exit 0
fi

echo ""
echo "Failed to pull base image. Trying alternative approaches..."
echo ""

# Function to try building with a specific Dockerfile
try_build() {
    local dockerfile=$1
    local description=$2
    
    echo "----------------------------------------"
    echo "Attempt: $description"
    echo "Using: $dockerfile"
    echo "----------------------------------------"
    
    if DOCKER_BUILDKIT=0 docker build -f "$dockerfile" -t agentdb9-vscode:latest vscode/ 2>&1; then
        echo ""
        echo "✅ SUCCESS: Build completed with $description"
        return 0
    else
        echo ""
        echo "❌ FAILED: $description did not work"
        return 1
    fi
}

# Try approach 1: Minimal Dockerfile (no Node.js installation)
if try_build "vscode/Dockerfile.minimal" "Minimal Dockerfile (base image only)"; then
    echo ""
    echo "⚠️  Note: This image uses Node.js from base image (may be older version)"
    echo "   If you need Node.js 22.x, you'll need to install it manually in the container"
    exit 0
fi

# Try approach 2: Simple Dockerfile (using setup script)
if try_build "vscode/Dockerfile.simple" "Simple Dockerfile (setup script)"; then
    exit 0
fi

# Try approach 3: Pull pre-built image (if available)
echo "----------------------------------------"
echo "Attempt: Pull pre-built image from registry"
echo "----------------------------------------"
if docker pull ghcr.io/jatinkumarweb/agentdb9-vscode:latest 2>/dev/null; then
    docker tag ghcr.io/jatinkumarweb/agentdb9-vscode:latest agentdb9-vscode:latest
    echo "✅ SUCCESS: Using pre-built image"
    exit 0
fi

# All approaches failed
echo ""
echo "=========================================="
echo "❌ All build approaches failed"
echo "=========================================="
echo ""
echo "This is a known issue with Docker Desktop for Mac."
echo "The 'mount options is too long' error occurs even with legacy builder."
echo ""
echo "Workarounds:"
echo ""
echo "1. Use the minimal image (already attempted):"
echo "   docker build -f vscode/Dockerfile.minimal -t agentdb9-vscode:latest vscode/"
echo ""
echo "2. Increase Docker Desktop resources:"
echo "   - Open Docker Desktop preferences"
echo "   - Go to Resources"
echo "   - Increase Memory to 8GB+"
echo "   - Increase Disk image size"
echo "   - Restart Docker Desktop"
echo ""
echo "3. Reset Docker Desktop:"
echo "   - Docker Desktop > Troubleshoot > Reset to factory defaults"
echo "   - Warning: This will delete all containers and images"
echo ""
echo "4. Use Gitpod or Linux environment:"
echo "   - This issue is specific to Docker Desktop for Mac"
echo "   - Works fine on Linux and Gitpod"
echo ""
exit 1
