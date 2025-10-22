#!/bin/bash

# Rollback Script for VS Code Proxy Changes
# Use this if the proxy changes cause issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "VS Code Proxy Rollback Script"
echo "========================================="
echo ""

echo -e "${YELLOW}⚠️  This will rollback the VS Code proxy changes${NC}"
echo ""
echo "Changes to be reverted:"
echo "  1. Frontend: VSCodeContainer will use direct VS Code URL (port 8080)"
echo "  2. VS Code: Port forwarding configuration will be reset"
echo "  3. Docker: Environment variables will be restored"
echo ""

read -p "Do you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi

echo ""
echo "Step 1: Reverting git commits..."
echo "========================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Show recent commits
echo "Recent commits:"
git log --oneline -5

echo ""
echo "Commits to revert:"
echo "  - 5aac846: Fix VS Code preview URLs by proxying through backend"
echo "  - 2573f08: Fix VS Code port proxy URLs to use backend proxy"
echo ""

read -p "Revert these commits? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Revert the commits (most recent first)
    git revert --no-commit 5aac846 2573f08 || {
        echo -e "${RED}❌ Git revert failed${NC}"
        echo "You may need to resolve conflicts manually"
        exit 1
    }
    
    git commit -m "Rollback: Revert VS Code proxy changes

Reverted commits:
- 5aac846: Fix VS Code preview URLs by proxying through backend
- 2573f08: Fix VS Code port proxy URLs to use backend proxy

Reason: [Add reason here]

This restores:
- Frontend loads VS Code directly from port 8080
- VS Code uses default port forwarding
- No proxy URL configuration
"
    
    echo -e "${GREEN}✅ Git commits reverted${NC}"
else
    echo "Skipping git revert"
fi

echo ""
echo "Step 2: Rebuilding services..."
echo "========================================="

read -p "Rebuild frontend and vscode containers? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Rebuilding frontend..."
    docker-compose build frontend || {
        echo -e "${RED}❌ Frontend build failed${NC}"
        exit 1
    }
    
    echo "Rebuilding vscode..."
    docker-compose build vscode || {
        echo -e "${RED}❌ VS Code build failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Services rebuilt${NC}"
else
    echo "Skipping rebuild"
fi

echo ""
echo "Step 3: Restarting services..."
echo "========================================="

read -p "Restart services? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restarting frontend..."
    docker-compose restart frontend
    
    echo "Restarting vscode..."
    docker-compose restart vscode
    
    echo -e "${GREEN}✅ Services restarted${NC}"
else
    echo "Skipping restart"
fi

echo ""
echo "Step 4: Verification..."
echo "========================================="

echo "Checking VS Code direct access..."
if curl -s -f -m 5 http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ VS Code accessible at http://localhost:8080${NC}"
else
    echo -e "${YELLOW}⚠️  VS Code not accessible (may need time to start)${NC}"
fi

echo ""
echo "Checking frontend..."
if curl -s -f -m 5 http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend accessible at http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not accessible (may need time to start)${NC}"
fi

echo ""
echo "========================================="
echo "Rollback Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Wait for services to fully start (30-60 seconds)"
echo "  2. Test VS Code at: http://localhost:3000/workspace"
echo "  3. Verify VS Code loads correctly"
echo "  4. Check browser console for errors"
echo ""
echo "If issues persist:"
echo "  - Check logs: docker-compose logs frontend vscode"
echo "  - Restart all services: docker-compose restart"
echo "  - Full rebuild: docker-compose down && docker-compose up -d --build"
echo ""
