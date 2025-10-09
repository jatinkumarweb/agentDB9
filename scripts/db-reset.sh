#!/bin/bash

# Database Reset Script
# Safely resets the database when schema changes are added
# Usage: ./scripts/db-reset.sh [--full]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         AgentDB9 Database Reset Script                    ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Parse arguments
FULL_RESET=false
if [[ "$1" == "--full" ]]; then
    FULL_RESET=true
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

# Function to check if backend is healthy
check_backend_health() {
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for backend to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is healthy!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Backend failed to become healthy after $max_attempts attempts${NC}"
    return 1
}

# Function to show database info
show_db_info() {
    echo -e "${BLUE}📊 Current Database Status:${NC}"
    docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -c "\dt" 2>/dev/null || echo "  Database not accessible"
    echo ""
}

# Main reset process
main() {
    cd "$PROJECT_ROOT"
    
    if [ "$FULL_RESET" = true ]; then
        echo -e "${YELLOW}🔄 Performing FULL reset (including all volumes)...${NC}"
        echo -e "${RED}⚠️  This will delete ALL data including uploaded files!${NC}"
        read -p "Are you sure? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo -e "${YELLOW}❌ Reset cancelled.${NC}"
            exit 0
        fi
        
        echo -e "${BLUE}1️⃣  Stopping all containers...${NC}"
        docker-compose down -v
        
        echo -e "${BLUE}2️⃣  Removing all volumes...${NC}"
        docker volume rm agentdb9_postgres_data 2>/dev/null || true
        docker volume rm agentdb9_redis_data 2>/dev/null || true
        docker volume rm agentdb9_qdrant_data 2>/dev/null || true
        
    else
        echo -e "${YELLOW}🔄 Performing database-only reset...${NC}"
        
        # Show current database info
        if docker ps | grep -q agentdb9-postgres-1; then
            show_db_info
        fi
        
        echo -e "${BLUE}1️⃣  Stopping backend container...${NC}"
        docker-compose stop backend
        
        echo -e "${BLUE}2️⃣  Removing database volume...${NC}"
        docker volume rm agentdb9_postgres_data 2>/dev/null || echo "  Volume doesn't exist, skipping..."
    fi
    
    echo ""
    echo -e "${BLUE}3️⃣  Temporarily enabling DB_SYNCHRONIZE...${NC}"
    
    # Backup docker-compose.yml
    cp docker-compose.yml docker-compose.yml.backup
    
    # Enable DB_SYNCHRONIZE
    sed -i.tmp 's/DB_SYNCHRONIZE=false/DB_SYNCHRONIZE=true/' docker-compose.yml
    rm -f docker-compose.yml.tmp
    
    echo -e "${BLUE}4️⃣  Starting services...${NC}"
    docker-compose up -d
    
    echo ""
    echo -e "${BLUE}5️⃣  Waiting for database initialization...${NC}"
    sleep 10
    
    # Check backend health
    if check_backend_health; then
        echo ""
        echo -e "${BLUE}6️⃣  Verifying database tables...${NC}"
        sleep 5
        show_db_info
        
        echo -e "${BLUE}7️⃣  Restoring DB_SYNCHRONIZE=false...${NC}"
        mv docker-compose.yml.backup docker-compose.yml
        
        echo -e "${BLUE}8️⃣  Restarting backend with correct configuration...${NC}"
        docker-compose up -d backend
        
        echo ""
        echo -e "${BLUE}9️⃣  Final health check...${NC}"
        sleep 5
        
        if check_backend_health; then
            echo ""
            echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║  ✅ Database reset completed successfully!                 ║${NC}"
            echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
            echo ""
            echo -e "${GREEN}📊 Database Status:${NC}"
            show_db_info
            echo -e "${GREEN}🔗 Backend: http://localhost:8000${NC}"
            echo -e "${GREEN}🔗 Frontend: http://localhost:3000${NC}"
            echo -e "${GREEN}📚 API Docs: http://localhost:8000/api/docs${NC}"
            echo ""
            echo -e "${BLUE}Default Users:${NC}"
            echo -e "  Admin:  admin@agentdb9.com / admin123"
            echo -e "  Demo:   demo@agentdb9.com / demo123"
            echo ""
        else
            echo -e "${RED}❌ Backend health check failed after reset${NC}"
            echo -e "${YELLOW}Check logs with: docker-compose logs backend${NC}"
            mv docker-compose.yml.backup docker-compose.yml
            exit 1
        fi
    else
        echo -e "${RED}❌ Backend failed to start during initialization${NC}"
        echo -e "${YELLOW}Restoring original configuration...${NC}"
        mv docker-compose.yml.backup docker-compose.yml
        docker-compose up -d backend
        exit 1
    fi
}

# Show usage
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --full    Perform full reset including all volumes (postgres, redis, qdrant)"
    echo "  --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Reset only database"
    echo "  $0 --full       # Reset database and all volumes"
    echo ""
    exit 0
fi

# Run main function
main
