#!/bin/bash

echo "🔍 Detecting system architecture..."

# Detect architecture
ARCH=$(uname -m)
OS=$(uname -s)

echo "Operating System: $OS"
echo "Architecture: $ARCH"

# Provide guidance based on architecture
case $ARCH in
  x86_64|amd64)
    echo "✅ AMD64/x86_64 architecture detected"
    echo "   All Docker images should work natively"
    ;;
  arm64|aarch64)
    echo "✅ ARM64 architecture detected (Apple Silicon or ARM-based system)"
    echo "   Docker images will use native ARM64 builds"
    echo "   Note: Some images may use emulation if ARM64 version not available"
    ;;
  *)
    echo "⚠️  Unknown architecture: $ARCH"
    echo "   You may encounter compatibility issues"
    ;;
esac

# Check Docker
if command -v docker &> /dev/null; then
  echo ""
  echo "🐳 Docker information:"
  docker version --format '{{.Server.Os}}/{{.Server.Arch}}' 2>/dev/null || echo "Could not get Docker info"
  
  # Check if Docker Desktop is running
  if docker info &> /dev/null; then
    echo "✅ Docker is running"
  else
    echo "❌ Docker is not running or not accessible"
  fi
else
  echo "❌ Docker is not installed"
fi

echo ""
echo "📋 Recommendations:"
if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
  echo "   - All platform constraints have been removed from docker-compose.yml"
  echo "   - Images will use native ARM64 builds when available"
  echo "   - Ollama, Qdrant, PostgreSQL, and Redis support ARM64 natively"
  echo "   - Build times may be longer on first run"
fi

echo ""
echo "🚀 To start the services:"
echo "   docker-compose up --build"
