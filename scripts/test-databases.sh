#!/bin/bash

# Database Testing Script for AgentDB9
set -e

echo "💾 Testing AgentDB9 Database Connections..."
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test PostgreSQL
echo -e "\n🐘 Testing PostgreSQL..."
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 -U postgres &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is running and accepting connections${NC}"
        
        # Test database connection
        echo -n "Testing database connection... "
        if PGPASSWORD=password psql -h localhost -p 5432 -U postgres -d coding_agent -c "SELECT 1;" &> /dev/null; then
            echo -e "${GREEN}✅ Connected${NC}"
            
            # Show database info
            echo "Database info:"
            PGPASSWORD=password psql -h localhost -p 5432 -U postgres -d coding_agent -c "
                SELECT 
                    version() as version,
                    current_database() as database,
                    current_user as user,
                    inet_server_addr() as server_ip,
                    inet_server_port() as server_port;
            " 2>/dev/null | head -10 || echo "  Could not retrieve database info"
        else
            echo -e "${RED}❌ Connection failed${NC}"
        fi
    else
        echo -e "${RED}❌ PostgreSQL is not accepting connections${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  pg_isready not available, testing via backend API...${NC}"
    
    # Test via backend API
    if curl -s http://localhost:8000/api/test/database > /dev/null 2>&1; then
        RESPONSE=$(curl -s http://localhost:8000/api/test/database)
        if echo "$RESPONSE" | jq -e '.connected' > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL connection via backend API${NC}"
        else
            echo -e "${RED}❌ PostgreSQL connection failed via backend API${NC}"
        fi
    else
        echo -e "${RED}❌ Cannot test PostgreSQL (backend not available)${NC}"
    fi
fi

# Test Redis
echo -e "\n🔴 Testing Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli -h localhost -p 6379 ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis is running and responding${NC}"
        
        # Show Redis info
        echo "Redis info:"
        redis-cli -h localhost -p 6379 info server | grep -E "(redis_version|os|arch|process_id)" | head -5 || echo "  Could not retrieve Redis info"
        
        # Test basic operations
        echo -n "Testing Redis operations... "
        if redis-cli -h localhost -p 6379 set test_key "test_value" &> /dev/null && \
           redis-cli -h localhost -p 6379 get test_key &> /dev/null && \
           redis-cli -h localhost -p 6379 del test_key &> /dev/null; then
            echo -e "${GREEN}✅ Working${NC}"
        else
            echo -e "${RED}❌ Operations failed${NC}"
        fi
    else
        echo -e "${RED}❌ Redis is not responding${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli not available, testing via backend API...${NC}"
    
    # Test via backend API
    if curl -s http://localhost:8000/api/test/redis > /dev/null 2>&1; then
        RESPONSE=$(curl -s http://localhost:8000/api/test/redis)
        if echo "$RESPONSE" | jq -e '.connected' > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis connection via backend API${NC}"
        else
            echo -e "${RED}❌ Redis connection failed via backend API${NC}"
        fi
    else
        echo -e "${RED}❌ Cannot test Redis (backend not available)${NC}"
    fi
fi

# Test Qdrant
echo -e "\n🔍 Testing Qdrant Vector Database..."
if curl -s http://localhost:6333/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Qdrant is running${NC}"
    
    # Get Qdrant info
    echo "Qdrant info:"
    QDRANT_INFO=$(curl -s http://localhost:6333/ 2>/dev/null || echo "")
    if [ -n "$QDRANT_INFO" ]; then
        echo "$QDRANT_INFO" | jq -r '. | "  Version: \(.version // "unknown")"' 2>/dev/null || echo "  Could not parse version"
    fi
    
    # Test collections endpoint
    echo -n "Testing collections endpoint... "
    if curl -s http://localhost:6333/collections > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Working${NC}"
        
        # Show collections
        COLLECTIONS=$(curl -s http://localhost:6333/collections 2>/dev/null || echo "")
        if [ -n "$COLLECTIONS" ]; then
            COLLECTION_COUNT=$(echo "$COLLECTIONS" | jq -r '.result.collections | length' 2>/dev/null || echo "0")
            echo "  Collections: $COLLECTION_COUNT"
        fi
    else
        echo -e "${RED}❌ Collections endpoint failed${NC}"
    fi
else
    echo -e "${RED}❌ Qdrant is not running${NC}"
fi

# Test database connections via Docker
echo -e "\n🐳 Testing Database Containers..."

# Check if containers are running
POSTGRES_RUNNING=$(docker ps --filter "name=postgres" --format "table {{.Names}}" | grep -v NAMES | wc -l)
REDIS_RUNNING=$(docker ps --filter "name=redis" --format "table {{.Names}}" | grep -v NAMES | wc -l)
QDRANT_RUNNING=$(docker ps --filter "name=qdrant" --format "table {{.Names}}" | grep -v NAMES | wc -l)

echo "Container status:"
if [ "$POSTGRES_RUNNING" -gt 0 ]; then
    echo -e "  ${GREEN}✅ PostgreSQL container running${NC}"
else
    echo -e "  ${RED}❌ PostgreSQL container not running${NC}"
fi

if [ "$REDIS_RUNNING" -gt 0 ]; then
    echo -e "  ${GREEN}✅ Redis container running${NC}"
else
    echo -e "  ${RED}❌ Redis container not running${NC}"
fi

if [ "$QDRANT_RUNNING" -gt 0 ]; then
    echo -e "  ${GREEN}✅ Qdrant container running${NC}"
else
    echo -e "  ${RED}❌ Qdrant container not running${NC}"
fi

# Summary
echo -e "\n📊 Database Testing Summary"
echo "==========================="

WORKING_DBS=0
TOTAL_DBS=3

# Count working databases
if (command -v pg_isready &> /dev/null && pg_isready -h localhost -p 5432 -U postgres &> /dev/null) || \
   (curl -s http://localhost:8000/api/test/database | jq -e '.connected' > /dev/null 2>&1); then
    ((WORKING_DBS++))
fi

if (command -v redis-cli &> /dev/null && redis-cli -h localhost -p 6379 ping &> /dev/null) || \
   (curl -s http://localhost:8000/api/test/redis | jq -e '.connected' > /dev/null 2>&1); then
    ((WORKING_DBS++))
fi

if curl -s http://localhost:6333/health > /dev/null 2>&1; then
    ((WORKING_DBS++))
fi

echo "Databases: $WORKING_DBS/$TOTAL_DBS working"

if [ $WORKING_DBS -eq $TOTAL_DBS ]; then
    echo -e "${GREEN}✅ All databases are operational${NC}"
    exit 0
elif [ $WORKING_DBS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some databases are not working${NC}"
    echo -e "\n🔧 Recommendations:"
    echo "  • Check Docker containers: docker-compose ps"
    echo "  • Check logs: docker-compose logs postgres redis qdrant"
    echo "  • Restart services: docker-compose restart"
    exit 1
else
    echo -e "${RED}❌ No databases are working${NC}"
    echo -e "\n🔧 Recommendations:"
    echo "  • Start services: docker-compose up -d"
    echo "  • Check Docker: docker ps"
    echo "  • Check logs: docker-compose logs"
    exit 2
fi