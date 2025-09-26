#!/bin/bash

# Database Cleanup Script for AgentDB9
# This script handles database migration issues by cleaning persistent volumes
# and restarting with a fresh database instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_compose() {
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
}

# Function to get the compose command
get_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

# Main cleanup function
cleanup_database() {
    local compose_cmd=$(get_compose_cmd)
    
    print_status "Starting database cleanup process..."
    
    # Stop all containers
    print_status "Stopping all containers..."
    $compose_cmd down
    
    # Remove volumes
    print_status "Removing persistent volumes..."
    $compose_cmd down -v
    
    # Remove bind mount directories (database data)
    print_status "Removing database bind mount directories..."
    if [ -d "postgres_data" ]; then
        rm -rf postgres_data
        print_status "Removed postgres_data directory"
    fi
    if [ -d "redis_data" ]; then
        rm -rf redis_data
        print_status "Removed redis_data directory"
    fi
    if [ -d "qdrant_data" ]; then
        rm -rf qdrant_data
        print_status "Removed qdrant_data directory"
    fi
    
    # Clean up Docker system (optional - removes unused volumes)
    if [[ "$1" == "--deep" ]]; then
        print_warning "Performing deep cleanup (removes all unused Docker volumes)..."
        read -p "Are you sure? This will remove ALL unused Docker volumes (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker system prune -f --volumes
            print_success "Deep cleanup completed"
        else
            print_status "Skipping deep cleanup"
        fi
    fi
    
    # Start database only first
    print_status "Starting PostgreSQL database..."
    $compose_cmd up -d postgres
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 5
    
    # Start all services
    print_status "Starting all services..."
    $compose_cmd up -d
    
    # Wait for backend to be ready
    print_status "Waiting for backend to initialize..."
    sleep 10
    
    # Check if services are running
    print_status "Checking service status..."
    $compose_cmd ps
    
    print_success "Database cleanup completed successfully!"
    print_status "Services should be available at:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:8000"
    echo "  - API Docs: http://localhost:8000/api/docs"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Database cleanup script for AgentDB9"
    echo ""
    echo "OPTIONS:"
    echo "  --deep    Perform deep cleanup (removes all unused Docker volumes)"
    echo "  --help    Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                # Standard cleanup"
    echo "  $0 --deep        # Deep cleanup with system prune"
    echo ""
    echo "This script resolves database migration issues by:"
    echo "  1. Stopping all containers"
    echo "  2. Removing persistent volumes"
    echo "  3. Removing bind mount directories (postgres_data, redis_data, qdrant_data)"
    echo "  4. Starting with a fresh database"
    echo "  5. Allowing TypeORM to create clean schema"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_usage
        exit 0
        ;;
    --deep)
        check_docker
        check_compose
        cleanup_database --deep
        ;;
    "")
        check_docker
        check_compose
        cleanup_database
        ;;
    *)
        print_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac