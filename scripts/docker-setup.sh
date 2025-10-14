#!/bin/bash

# Docker Setup Script for AgentDB9
# Automatically detects system architecture and GPU availability

set -e

echo "🔍 Detecting system configuration..."

# Detect architecture
ARCH=$(uname -m)
echo "Architecture: $ARCH"

# Detect GPU availability
GPU_AVAILABLE=false
if command -v nvidia-smi &> /dev/null; then
    if nvidia-smi &> /dev/null; then
        GPU_AVAILABLE=true
        echo "✅ NVIDIA GPU detected"
    else
        echo "❌ NVIDIA GPU not available"
    fi
else
    echo "❌ NVIDIA drivers not found"
fi

# Build compose command
COMPOSE_FILES="-f docker-compose.yml"

# Add architecture-specific overrides
if [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "aarch64" ]]; then
    echo "🍎 Apple Silicon (ARM64) detected - using ARM64 configuration"
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.arm64.yml"
    
    # Check if running on macOS (Darwin)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🍎 macOS detected - adding Mac-specific overrides"
        echo "   (Workaround for Docker Desktop 'mount options is too long' issue)"
        COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.mac.yml"
    fi
elif [[ "$ARCH" == "x86_64" ]]; then
    echo "🖥️  x86_64 architecture detected"
    
    # Add GPU support if available
    if [[ "$GPU_AVAILABLE" == true ]]; then
        echo "🚀 Adding GPU support"
        COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.override.yml"
    else
        echo "💻 Running in CPU-only mode"
    fi
fi

echo ""
echo "📋 Docker Compose configuration:"
echo "   Files: $COMPOSE_FILES"
echo ""

# Export the compose files for use in other scripts
export COMPOSE_FILES

# Function to run docker-compose with the right files
run_compose() {
    echo "🐳 Running: docker-compose $COMPOSE_FILES $@"
    docker-compose $COMPOSE_FILES "$@"
}

# If script is called with arguments, run docker-compose
if [[ $# -gt 0 ]]; then
    # Check if --build flag is present and VSCode image doesn't exist
    if [[ "$*" == *"--build"* ]] && ! docker images agentdb9-vscode:latest | grep -q agentdb9-vscode; then
        echo "⚠️  Build requested but VSCode image not found."
        
        # On Mac, just pull the base image
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "   macOS detected - pulling base image (workaround for Docker Desktop issue)"
            docker pull codercom/code-server:latest
            docker tag codercom/code-server:latest agentdb9-vscode:latest
        else
            echo "   Building VSCode with legacy builder to avoid BuildKit bug..."
            ./scripts/build-vscode.sh
        fi
        echo ""
    fi
    
    # On Mac, remove --build flag to avoid build attempts
    if [[ "$OSTYPE" == "darwin"* ]] && [[ "$*" == *"--build"* ]]; then
        echo "ℹ️  Removing --build flag on macOS (using pre-built images)"
        # Remove --build from arguments
        set -- "${@/--build/}"
    fi
    
    run_compose "$@"
else
    echo "Usage examples:"
    echo "  $0 up -d                 # Start services in background"
    echo "  $0 down                  # Stop services"
    echo "  $0 build                 # Build images"
    echo "  $0 logs -f               # Follow logs"
    echo ""
    echo "Or export COMPOSE_FILES and use docker-compose directly:"
    echo "  export COMPOSE_FILES='$COMPOSE_FILES'"
    echo "  docker-compose \$COMPOSE_FILES up -d"
fi