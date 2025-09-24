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