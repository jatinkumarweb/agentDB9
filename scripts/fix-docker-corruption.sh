#!/bin/bash

# Docker Corruption Fix Script
# This script fixes Docker daemon corruption issues including blob corruption

set -e

echo "🔧 Docker Corruption Fix Script"
echo "================================"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop first."
        exit 1
    fi
}

# Function to stop all containers
stop_containers() {
    echo "🛑 Stopping all running containers..."
    docker stop $(docker ps -q) 2>/dev/null || echo "No running containers to stop"
}

# Function to clean Docker system
clean_docker_system() {
    echo "🧹 Cleaning Docker system..."
    
    # Remove all containers
    echo "  - Removing all containers..."
    docker container prune -f
    
    # Remove all images
    echo "  - Removing all images..."
    docker image prune -a -f
    
    # Remove all volumes
    echo "  - Removing all volumes..."
    docker volume prune -f
    
    # Remove all networks
    echo "  - Removing all networks..."
    docker network prune -f
    
    # Remove all build cache
    echo "  - Removing build cache..."
    docker builder prune -a -f
    
    # System prune
    echo "  - System prune..."
    docker system prune -a -f --volumes
}

# Function to restart Docker daemon (requires manual intervention)
restart_docker_instructions() {
    echo ""
    echo "🔄 Docker Daemon Restart Required"
    echo "================================="
    echo ""
    echo "To complete the fix, you need to restart Docker Desktop:"
    echo ""
    echo "1. Close Docker Desktop completely"
    echo "2. Wait 10 seconds"
    echo "3. Restart Docker Desktop"
    echo "4. Wait for Docker to fully start"
    echo "5. Run this script again with --verify flag"
    echo ""
    echo "Alternative: Run 'docker system reset' in Docker Desktop settings"
    echo ""
}

# Function to verify Docker is working
verify_docker() {
    echo "✅ Verifying Docker functionality..."
    
    # Test basic Docker functionality
    if docker run --rm hello-world >/dev/null 2>&1; then
        echo "✅ Docker is working correctly"
    else
        echo "❌ Docker verification failed"
        return 1
    fi
    
    # Test image building
    echo "🔨 Testing image building..."
    cat > /tmp/test-dockerfile << 'EOF'
FROM alpine:latest
RUN echo "Docker build test successful"
EOF
    
    if docker build -t test-build -f /tmp/test-dockerfile /tmp >/dev/null 2>&1; then
        echo "✅ Docker build is working"
        docker rmi test-build >/dev/null 2>&1
        rm -f /tmp/test-dockerfile
    else
        echo "❌ Docker build verification failed"
        rm -f /tmp/test-dockerfile
        return 1
    fi
}

# Function to rebuild project images
rebuild_project() {
    echo "🏗️  Rebuilding project images..."
    
    cd "$(dirname "$0")/.."
    
    # Build images one by one to isolate issues
    echo "  - Building frontend..."
    if ! docker compose build --no-cache frontend; then
        echo "❌ Frontend build failed"
        return 1
    fi
    
    echo "  - Building backend..."
    if ! docker compose build --no-cache backend; then
        echo "❌ Backend build failed"
        return 1
    fi
    
    echo "  - Building llm-service..."
    if ! docker compose build --no-cache llm-service; then
        echo "❌ LLM service build failed"
        return 1
    fi
    
    echo "✅ All images rebuilt successfully"
}

# Main execution
main() {
    case "${1:-}" in
        --verify)
            check_docker
            verify_docker
            echo "✅ Docker verification complete"
            ;;
        --rebuild)
            check_docker
            rebuild_project
            echo "✅ Project rebuild complete"
            ;;
        --full-clean)
            check_docker
            stop_containers
            clean_docker_system
            restart_docker_instructions
            ;;
        *)
            echo "Usage: $0 [--verify|--rebuild|--full-clean]"
            echo ""
            echo "Options:"
            echo "  --verify      Verify Docker is working correctly"
            echo "  --rebuild     Rebuild project Docker images"
            echo "  --full-clean  Perform full Docker cleanup (requires restart)"
            echo ""
            echo "For corruption issues, run:"
            echo "  1. $0 --full-clean"
            echo "  2. Restart Docker Desktop"
            echo "  3. $0 --verify"
            echo "  4. $0 --rebuild"
            ;;
    esac
}

main "$@"