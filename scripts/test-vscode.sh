#!/bin/bash

# VS Code Server Testing Script for AgentDB9
set -e

echo "🎨 Testing VS Code Server Integration..."
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test VS Code Server availability
echo -e "\n📡 Testing VS Code Server..."
if curl -s http://localhost:8080/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✅ VS Code Server is running${NC}"
    
    # Test login page
    echo -n "Testing login page... "
    if curl -s http://localhost:8080/ | grep -q "code-server" 2>/dev/null; then
        echo -e "${GREEN}✅ Accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Login page may not be working${NC}"
    fi
    
    # Test API endpoints
    echo -n "Testing API endpoints... "
    if curl -s http://localhost:8080/api/version > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API working${NC}"
        
        # Get version info
        VERSION_INFO=$(curl -s http://localhost:8080/api/version 2>/dev/null || echo "")
        if [ -n "$VERSION_INFO" ]; then
            echo "  Version: $(echo "$VERSION_INFO" | jq -r '.version // "unknown"' 2>/dev/null || echo "unknown")"
        fi
    else
        echo -e "${YELLOW}⚠️  API may not be working${NC}"
    fi
    
else
    echo -e "${RED}❌ VS Code Server is not running${NC}"
fi

# Test workspace mounting
echo -e "\n📁 Testing Workspace Mounting..."
VSCODE_CONTAINER=$(docker ps --filter "name=vscode" --format "{{.Names}}" | head -1)

if [ -n "$VSCODE_CONTAINER" ]; then
    echo -e "${GREEN}✅ VS Code container found: $VSCODE_CONTAINER${NC}"
    
    # Check if workspace is mounted
    echo -n "Testing workspace mount... "
    if docker exec "$VSCODE_CONTAINER" ls /home/coder/workspace > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Workspace mounted${NC}"
        
        # List workspace contents
        echo "Workspace contents:"
        docker exec "$VSCODE_CONTAINER" ls -la /home/coder/workspace | head -10 | while read -r line; do
            echo "  $line"
        done
        
        # Check for key files
        echo -n "Checking for package.json... "
        if docker exec "$VSCODE_CONTAINER" test -f /home/coder/workspace/package.json; then
            echo -e "${GREEN}✅ Found${NC}"
        else
            echo -e "${RED}❌ Not found${NC}"
        fi
        
        echo -n "Checking for docker-compose.yml... "
        if docker exec "$VSCODE_CONTAINER" test -f /home/coder/workspace/docker-compose.yml; then
            echo -e "${GREEN}✅ Found${NC}"
        else
            echo -e "${RED}❌ Not found${NC}"
        fi
        
    else
        echo -e "${RED}❌ Workspace not accessible${NC}"
    fi
    
    # Test VS Code configuration
    echo -n "Testing VS Code configuration... "
    if docker exec "$VSCODE_CONTAINER" test -d /home/coder/.local/share/code-server; then
        echo -e "${GREEN}✅ Config directory exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Config directory not found${NC}"
    fi
    
else
    echo -e "${RED}❌ VS Code container not found${NC}"
fi

# Test extension installation
echo -e "\n🔌 Testing Extension Management..."
if [ -n "$VSCODE_CONTAINER" ]; then
    echo -n "Testing extension installation capability... "
    
    # Try to list installed extensions
    EXTENSIONS=$(docker exec "$VSCODE_CONTAINER" code-server --list-extensions 2>/dev/null || echo "")
    
    if [ -n "$EXTENSIONS" ]; then
        echo -e "${GREEN}✅ Extension system working${NC}"
        
        echo "Installed extensions:"
        echo "$EXTENSIONS" | head -10 | while read -r ext; do
            if [ -n "$ext" ]; then
                echo "  ✓ $ext"
            fi
        done
        
        if [ $(echo "$EXTENSIONS" | wc -l) -gt 10 ]; then
            echo "  ... and $(( $(echo "$EXTENSIONS" | wc -l) - 10 )) more"
        fi
    else
        echo -e "${YELLOW}⚠️  No extensions found or extension system not working${NC}"
    fi
    
    # Test extension installation endpoint
    echo -n "Testing extension installation API... "
    if curl -s -X POST http://localhost:8000/api/vscode/setup-extensions > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API available${NC}"
    else
        echo -e "${YELLOW}⚠️  Extension API not available${NC}"
    fi
else
    echo -e "${RED}❌ Cannot test extensions (container not available)${NC}"
fi

# Test terminal access
echo -e "\n💻 Testing Terminal Access..."
if [ -n "$VSCODE_CONTAINER" ]; then
    echo -n "Testing terminal functionality... "
    
    # Test basic command execution
    if docker exec "$VSCODE_CONTAINER" whoami > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Terminal working${NC}"
        
        # Show environment info
        echo "Terminal environment:"
        echo "  User: $(docker exec "$VSCODE_CONTAINER" whoami 2>/dev/null || echo "unknown")"
        echo "  Shell: $(docker exec "$VSCODE_CONTAINER" echo "$SHELL" 2>/dev/null || echo "unknown")"
        echo "  Working directory: $(docker exec "$VSCODE_CONTAINER" pwd 2>/dev/null || echo "unknown")"
        
        # Test Node.js availability
        echo -n "Testing Node.js availability... "
        if docker exec "$VSCODE_CONTAINER" node --version > /dev/null 2>&1; then
            NODE_VERSION=$(docker exec "$VSCODE_CONTAINER" node --version 2>/dev/null || echo "unknown")
            echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"
        else
            echo -e "${RED}❌ Node.js not available${NC}"
        fi
        
        # Test npm availability
        echo -n "Testing npm availability... "
        if docker exec "$VSCODE_CONTAINER" npm --version > /dev/null 2>&1; then
            NPM_VERSION=$(docker exec "$VSCODE_CONTAINER" npm --version 2>/dev/null || echo "unknown")
            echo -e "${GREEN}✅ npm $NPM_VERSION${NC}"
        else
            echo -e "${RED}❌ npm not available${NC}"
        fi
        
    else
        echo -e "${RED}❌ Terminal not working${NC}"
    fi
else
    echo -e "${RED}❌ Cannot test terminal (container not available)${NC}"
fi

# Test Git integration
echo -e "\n🔧 Testing Git Integration..."
if [ -n "$VSCODE_CONTAINER" ]; then
    echo -n "Testing Git availability... "
    
    if docker exec "$VSCODE_CONTAINER" git --version > /dev/null 2>&1; then
        GIT_VERSION=$(docker exec "$VSCODE_CONTAINER" git --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ $GIT_VERSION${NC}"
        
        # Test Git configuration
        echo -n "Testing Git configuration... "
        if docker exec "$VSCODE_CONTAINER" git config --global user.name > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Git configured${NC}"
        else
            echo -e "${YELLOW}⚠️  Git not configured${NC}"
        fi
        
        # Test repository access
        echo -n "Testing repository access... "
        if docker exec "$VSCODE_CONTAINER" test -d /home/coder/workspace/.git; then
            echo -e "${GREEN}✅ Git repository accessible${NC}"
        else
            echo -e "${YELLOW}⚠️  Git repository not found${NC}"
        fi
        
    else
        echo -e "${RED}❌ Git not available${NC}"
    fi
else
    echo -e "${RED}❌ Cannot test Git (container not available)${NC}"
fi

# Summary
echo -e "\n📊 VS Code Server Testing Summary"
echo "=================================="

WORKING_FEATURES=0
TOTAL_FEATURES=5

# Count working features
if curl -s http://localhost:8080/healthz > /dev/null 2>&1; then
    ((WORKING_FEATURES++))
fi

if [ -n "$VSCODE_CONTAINER" ] && docker exec "$VSCODE_CONTAINER" ls /home/coder/workspace > /dev/null 2>&1; then
    ((WORKING_FEATURES++))
fi

if [ -n "$VSCODE_CONTAINER" ] && docker exec "$VSCODE_CONTAINER" code-server --list-extensions > /dev/null 2>&1; then
    ((WORKING_FEATURES++))
fi

if [ -n "$VSCODE_CONTAINER" ] && docker exec "$VSCODE_CONTAINER" whoami > /dev/null 2>&1; then
    ((WORKING_FEATURES++))
fi

if [ -n "$VSCODE_CONTAINER" ] && docker exec "$VSCODE_CONTAINER" git --version > /dev/null 2>&1; then
    ((WORKING_FEATURES++))
fi

echo "Features: $WORKING_FEATURES/$TOTAL_FEATURES working"

if [ $WORKING_FEATURES -eq $TOTAL_FEATURES ]; then
    echo -e "${GREEN}✅ VS Code Server is fully operational${NC}"
    echo -e "\n🌐 Access VS Code at: http://localhost:8080"
    echo -e "🔑 Default password: codeserver123 (change in .env)"
    exit 0
elif [ $WORKING_FEATURES -gt 2 ]; then
    echo -e "${YELLOW}⚠️  VS Code Server is partially working${NC}"
    echo -e "\n🔧 Recommendations:"
    echo "  • Check container logs: docker-compose logs vscode"
    echo "  • Restart VS Code service: docker-compose restart vscode"
    exit 1
else
    echo -e "${RED}❌ VS Code Server is not working properly${NC}"
    echo -e "\n🔧 Recommendations:"
    echo "  • Check if container is running: docker ps | grep vscode"
    echo "  • Check logs: docker-compose logs vscode"
    echo "  • Restart service: docker-compose up -d vscode"
    exit 2
fi