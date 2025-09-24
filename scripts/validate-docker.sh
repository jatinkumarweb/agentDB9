#!/bin/bash

# Docker Configuration Validation Script
set -e

echo "🐳 Validating Docker Configuration..."
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VALIDATION_PASSED=0
VALIDATION_FAILED=0

validate_file() {
    local file="$1"
    local description="$2"
    
    echo -n "Checking $description... "
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found${NC}"
        ((VALIDATION_PASSED++))
    else
        echo -e "${RED}❌ Missing${NC}"
        ((VALIDATION_FAILED++))
    fi
}

validate_dockerfile() {
    local service="$1"
    local dockerfile="$service/Dockerfile"
    
    echo -n "Validating $service Dockerfile... "
    
    if [ -f "$dockerfile" ]; then
        # Check for common issues
        if grep -q "COPY ../shared" "$dockerfile"; then
            echo -e "${RED}❌ Contains invalid shared copy${NC}"
            echo "   Fix: Remove 'COPY ../shared /shared' line"
            ((VALIDATION_FAILED++))
        elif grep -q "FROM node:" "$dockerfile" && grep -q "WORKDIR /app" "$dockerfile"; then
            echo -e "${GREEN}✅ Valid${NC}"
            ((VALIDATION_PASSED++))
        else
            echo -e "${YELLOW}⚠️  May have issues${NC}"
            ((VALIDATION_FAILED++))
        fi
    else
        echo -e "${RED}❌ Missing${NC}"
        ((VALIDATION_FAILED++))
    fi
}

validate_compose_service() {
    local service="$1"
    
    echo -n "Checking docker-compose service '$service'... "
    
    if grep -q "^  $service:" docker-compose.yml; then
        echo -e "${GREEN}✅ Defined${NC}"
        ((VALIDATION_PASSED++))
    else
        echo -e "${RED}❌ Missing${NC}"
        ((VALIDATION_FAILED++))
    fi
}

echo -e "\n📁 Checking Required Files"
echo "=========================="

validate_file "docker-compose.yml" "Docker Compose file"
validate_file ".dockerignore" "Docker ignore file"
validate_file ".env.example" "Environment example file"

echo -e "\n🏗️  Validating Dockerfiles"
echo "========================="

validate_dockerfile "frontend"
validate_dockerfile "backend"
validate_dockerfile "llm-service"

echo -e "\n🔧 Validating Docker Compose Services"
echo "===================================="

validate_compose_service "frontend"
validate_compose_service "backend"
validate_compose_service "llm-service"
validate_compose_service "ollama"
validate_compose_service "vscode"
validate_compose_service "qdrant"
validate_compose_service "postgres"
validate_compose_service "redis"

echo -e "\n🔍 Checking Docker Compose Syntax"
echo "================================="

echo -n "Validating docker-compose.yml syntax... "
if command -v docker-compose &> /dev/null; then
    if docker-compose config --quiet &> /dev/null; then
        echo -e "${GREEN}✅ Valid${NC}"
        ((VALIDATION_PASSED++))
    else
        echo -e "${RED}❌ Invalid syntax${NC}"
        ((VALIDATION_FAILED++))
    fi
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    if docker compose config --quiet &> /dev/null; then
        echo -e "${GREEN}✅ Valid${NC}"
        ((VALIDATION_PASSED++))
    else
        echo -e "${RED}❌ Invalid syntax${NC}"
        ((VALIDATION_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available for validation${NC}"
fi

echo -e "\n🔗 Checking Volume Mounts"
echo "========================"

echo -n "Checking shared volume configuration... "
if grep -q "./shared:/app/node_modules/@agentdb9/shared" docker-compose.yml; then
    echo -e "${GREEN}✅ Correctly configured${NC}"
    ((VALIDATION_PASSED++))
else
    echo -e "${RED}❌ Incorrect shared volume mount${NC}"
    echo "   Expected: ./shared:/app/node_modules/@agentdb9/shared"
    ((VALIDATION_FAILED++))
fi

echo -n "Checking node_modules exclusion... "
if grep -q "/app/node_modules" docker-compose.yml; then
    echo -e "${GREEN}✅ Node modules excluded${NC}"
    ((VALIDATION_PASSED++))
else
    echo -e "${YELLOW}⚠️  Node modules not excluded${NC}"
fi

echo -e "\n🌐 Checking Port Configuration"
echo "============================="

EXPECTED_PORTS=("3000:3000" "8000:8000" "9000:9000" "8080:8080" "11434:11434" "6333:6333" "5432:5432" "6379:6379")

for port in "${EXPECTED_PORTS[@]}"; do
    echo -n "Checking port $port... "
    if grep -q "\"$port\"" docker-compose.yml; then
        echo -e "${GREEN}✅ Configured${NC}"
        ((VALIDATION_PASSED++))
    else
        echo -e "${RED}❌ Missing${NC}"
        ((VALIDATION_FAILED++))
    fi
done

echo -e "\n📊 Validation Summary"
echo "===================="

echo "Passed: $VALIDATION_PASSED"
echo "Failed: $VALIDATION_FAILED"

if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All Docker configurations are valid!${NC}"
    echo -e "You can now run: ${GREEN}docker-compose up --build${NC}"
    exit 0
elif [ $VALIDATION_FAILED -le 3 ]; then
    echo -e "\n${YELLOW}⚠️  Minor issues found. Docker should still work.${NC}"
    exit 1
else
    echo -e "\n${RED}❌ Multiple issues found. Please fix before building.${NC}"
    echo -e "\n🔧 Common fixes:"
    echo "  1. Remove '../shared' copy commands from Dockerfiles"
    echo "  2. Ensure all services are defined in docker-compose.yml"
    echo "  3. Check port configurations"
    echo "  4. Validate YAML syntax"
    exit 2
fi