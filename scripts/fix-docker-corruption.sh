#!/bin/bash

# Docker Corruption Fix Script
# This script fixes Docker daemon corruption issues including blob corruption
# Gitpod-safe version with environment detection

set -e

echo "🔧 Docker Corruption Fix Script"
echo "================================"

# Function to detect environment
detect_environment() {
    if [[ -n "${GITPOD_WORKSPACE_ID:-}" ]] || [[ -n "${CODESPACE_NAME:-}" ]] || [[ -f "/.dockerenv" ]]; then
        echo "🌐 Detected containerized environment (Gitpod/Codespaces/Container)"
        return 0  # containerized
    else
        echo "🖥️  Detected local environment"
        return 1  # local
    fi
}

# Global environment flag
IS_CONTAINERIZED=false
if detect_environment; then
    IS_CONTAINERIZED=true
fi

# Function to check if Docker is running
check_docker() {
    echo "🔍 Checking Docker status..."
    if ! timeout 10 docker info >/dev/null 2>&1; then
        if [[ "$IS_CONTAINERIZED" == "true" ]]; then
            echo "❌ Docker is not available in this containerized environment."
            echo "ℹ️  This script is designed for local Docker environments."
            echo "ℹ️  In Gitpod, use 'docker compose' commands directly for project management."
        else
            echo "❌ Docker is not running or not responding. Please check Docker Desktop."
            echo "ℹ️  Make sure Docker Desktop is running and responsive."
        fi
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to stop all containers
stop_containers() {
    echo "🛑 Stopping all running containers..."
    local running_containers=$(docker ps -q)
    if [[ -n "$running_containers" ]]; then
        docker stop $running_containers 2>/dev/null || echo "Failed to stop some containers"
    else
        echo "No running containers to stop"
    fi
}

# Function to clean Docker system
clean_docker_system() {
    if [[ "$IS_CONTAINERIZED" == "true" ]]; then
        echo "⚠️  Containerized environment detected - using safe cleanup mode"
        echo "🧹 Cleaning project-specific Docker resources..."
        
        # Only clean project-specific containers and images
        echo "  - Stopping project containers..."
        docker compose down --remove-orphans 2>/dev/null || true
        
        echo "  - Removing project images..."
        docker compose down --rmi all --volumes 2>/dev/null || true
        
        echo "  - Cleaning unused project resources..."
        docker image prune -f
        docker container prune -f
        
        echo "ℹ️  Skipping system-wide cleanup in containerized environment"
    else
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
    fi
}

# Function to restart Docker daemon (requires manual intervention)
restart_docker_instructions() {
    echo ""
    if [[ "$IS_CONTAINERIZED" == "true" ]]; then
        echo "🔄 Containerized Environment - No Restart Needed"
        echo "==============================================="
        echo ""
        echo "In containerized environments like Gitpod:"
        echo ""
        echo "1. Docker cleanup is complete"
        echo "2. No daemon restart required"
        echo "3. Run this script with --verify flag to test"
        echo "4. Use --rebuild to rebuild project images"
        echo ""
    else
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
    fi
}

# Function to verify Docker is working
verify_docker() {
    echo "✅ Verifying Docker functionality..."
    
    # Test basic Docker functionality
    echo "  - Testing basic Docker functionality..."
    if timeout 30 docker run --rm hello-world >/dev/null 2>&1; then
        echo "✅ Docker is working correctly"
    else
        echo "❌ Docker verification failed - hello-world test timed out or failed"
        return 1
    fi
    
    # Test image building
    echo "🔨 Testing image building..."
    
    # Create test dockerfile in a safe location
    TEST_DIR=$(mktemp -d)
    cat > "$TEST_DIR/Dockerfile" << 'EOF'
FROM alpine:latest
RUN echo "Docker build test successful"
EOF
    
    echo "  - Testing Docker build functionality..."
    if timeout 60 docker build -t test-build "$TEST_DIR" >/dev/null 2>&1; then
        echo "✅ Docker build is working"
        docker rmi test-build >/dev/null 2>&1 || true
        rm -rf "$TEST_DIR"
    else
        echo "❌ Docker build verification failed or timed out"
        docker rmi test-build >/dev/null 2>&1 || true
        rm -rf "$TEST_DIR"
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
    # Environment safety check - only prompt in containerized environments
    if [[ "$IS_CONTAINERIZED" == "true" ]] && [[ "${1:-}" != "--force" ]]; then
        echo ""
        echo "⚠️  CONTAINERIZED ENVIRONMENT DETECTED"
        echo "====================================="
        echo ""
        echo "This script has been adapted for containerized environments."
        echo "Some operations are limited to prevent conflicts with the host system."
        echo ""
        echo "For Gitpod users:"
        echo "- Use --verify to test Docker functionality"
        echo "- Use --rebuild to rebuild project images safely"
        echo "- Avoid --full-clean unless you understand the implications"
        echo "- Add --force to skip this prompt"
        echo ""
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Operation cancelled."
            exit 0
        fi
    elif [[ "$IS_CONTAINERIZED" == "true" ]] && [[ "${1:-}" == "--force" ]]; then
        echo "🌐 Containerized environment detected - running with --force"
        shift  # Remove --force from arguments
    fi
    
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
        --gitpod-safe)
            echo "🌐 Gitpod-safe Docker cleanup"
            check_docker
            echo "🛑 Stopping project containers..."
            docker compose down --remove-orphans 2>/dev/null || true
            echo "🧹 Cleaning project resources..."
            docker compose down --rmi local --volumes 2>/dev/null || true
            docker image prune -f
            echo "✅ Gitpod-safe cleanup complete"
            echo "ℹ️  Run with --rebuild to rebuild project images"
            ;;
        *)
            echo "Usage: $0 [--force] [--verify|--rebuild|--full-clean|--gitpod-safe]"
            echo ""
            echo "Options:"
            echo "  --force        Skip environment safety prompts"
            echo "  --verify       Verify Docker is working correctly"
            echo "  --rebuild      Rebuild project Docker images"
            echo "  --full-clean   Perform full Docker cleanup (requires restart)"
            echo "  --gitpod-safe  Safe cleanup for containerized environments"
            echo ""
            echo "For corruption issues:"
            echo ""
            echo "Local environments:"
            echo "  1. $0 --full-clean"
            echo "  2. Restart Docker Desktop"
            echo "  3. $0 --verify"
            echo "  4. $0 --rebuild"
            echo ""
            echo "Gitpod/Containerized environments:"
            echo "  1. $0 --gitpod-safe"
            echo "  2. $0 --verify"
            echo "  3. $0 --rebuild"
            ;;
    esac
}

main "$@"