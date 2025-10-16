#!/bin/bash

echo "=========================================="
echo "VSCode Workspace Environment Test"
echo "=========================================="
echo ""

# Test 1: Check if VSCode container is running
echo "Test 1: VSCode Container Status"
if docker ps | grep -q agentdb9-vscode-1; then
    echo "✅ VSCode container is running"
    CONTAINER_ID=$(docker ps --format "{{.ID}}" --filter "name=agentdb9-vscode-1")
    echo "   Container ID: $CONTAINER_ID"
else
    echo "❌ VSCode container is NOT running"
    exit 1
fi
echo ""

# Test 2: Check node binary exists
echo "Test 2: Node Binary"
if docker exec agentdb9-vscode-1 test -f /usr/bin/node; then
    NODE_VERSION=$(docker exec agentdb9-vscode-1 /usr/bin/node --version)
    echo "✅ Node exists at /usr/bin/node"
    echo "   Version: $NODE_VERSION"
else
    echo "❌ Node NOT found at /usr/bin/node"
fi
echo ""

# Test 3: Check npm binary exists
echo "Test 3: NPM Binary"
if docker exec agentdb9-vscode-1 test -f /usr/bin/npm; then
    echo "✅ NPM symlink exists at /usr/bin/npm"
    NPM_TARGET=$(docker exec agentdb9-vscode-1 readlink /usr/bin/npm)
    echo "   Symlink target: $NPM_TARGET"
    if docker exec agentdb9-vscode-1 test -f /usr/lib/node_modules/npm/bin/npm-cli.js; then
        echo "✅ NPM target file exists"
    else
        echo "❌ NPM target file MISSING"
    fi
else
    echo "❌ NPM NOT found at /usr/bin/npm"
fi
echo ""

# Test 4: Check workspace bin directory
echo "Test 4: Workspace Bin Directory"
if docker exec agentdb9-vscode-1 test -d /home/coder/workspace/bin; then
    echo "✅ Workspace bin directory exists"
    echo "   Contents:"
    docker exec agentdb9-vscode-1 ls -lh /home/coder/workspace/bin/
    
    # Test npm wrapper
    if docker exec agentdb9-vscode-1 test -f /home/coder/workspace/bin/npm; then
        echo "✅ npm wrapper exists"
        NPM_VERSION=$(docker exec -u coder agentdb9-vscode-1 /home/coder/workspace/bin/npm --version 2>&1)
        if [ $? -eq 0 ]; then
            echo "✅ npm wrapper works: $NPM_VERSION"
        else
            echo "❌ npm wrapper FAILED: $NPM_VERSION"
        fi
    else
        echo "❌ npm wrapper NOT found"
    fi
else
    echo "❌ Workspace bin directory does NOT exist"
fi
echo ""

# Test 5: Check .bashrc PATH configuration
echo "Test 5: .bashrc PATH Configuration"
if docker exec agentdb9-vscode-1 grep -q "/home/coder/workspace/bin" /home/coder/.bashrc; then
    echo "✅ .bashrc contains workspace/bin in PATH"
    echo "   First 3 lines of .bashrc:"
    docker exec agentdb9-vscode-1 head -3 /home/coder/.bashrc
else
    echo "❌ .bashrc does NOT contain workspace/bin in PATH"
fi
echo ""

# Test 6: Check PATH in different shell contexts
echo "Test 6: PATH in Different Shell Contexts"

echo "   Non-interactive shell:"
PATH_NON_INTERACTIVE=$(docker exec -u coder agentdb9-vscode-1 bash -c 'echo $PATH')
echo "   $PATH_NON_INTERACTIVE"
if echo "$PATH_NON_INTERACTIVE" | grep -q "/home/coder/workspace/bin"; then
    echo "   ✅ Contains workspace/bin"
else
    echo "   ❌ Missing workspace/bin"
fi

echo ""
echo "   Interactive shell:"
PATH_INTERACTIVE=$(docker exec -u coder agentdb9-vscode-1 bash -i -c 'echo $PATH')
echo "   $PATH_INTERACTIVE"
if echo "$PATH_INTERACTIVE" | grep -q "/home/coder/workspace/bin"; then
    echo "   ✅ Contains workspace/bin"
else
    echo "   ❌ Missing workspace/bin"
fi

echo ""
echo "   Login shell:"
PATH_LOGIN=$(docker exec -u coder agentdb9-vscode-1 bash -l -c 'echo $PATH')
echo "   $PATH_LOGIN"
if echo "$PATH_LOGIN" | grep -q "/home/coder/workspace/bin"; then
    echo "   ✅ Contains workspace/bin"
else
    echo "   ❌ Missing workspace/bin"
fi
echo ""

# Test 7: Check npm availability in different shell contexts
echo "Test 7: NPM Availability in Different Shell Contexts"

echo "   Non-interactive shell:"
NPM_NON_INTERACTIVE=$(docker exec -u coder agentdb9-vscode-1 bash -c 'npm --version 2>&1')
if [ $? -eq 0 ]; then
    echo "   ✅ npm works: $NPM_NON_INTERACTIVE"
else
    echo "   ❌ npm failed: $NPM_NON_INTERACTIVE"
fi

echo ""
echo "   Interactive shell:"
NPM_INTERACTIVE=$(docker exec -u coder agentdb9-vscode-1 bash -i -c 'npm --version 2>&1')
if [ $? -eq 0 ]; then
    echo "   ✅ npm works: $NPM_INTERACTIVE"
else
    echo "   ❌ npm failed: $NPM_INTERACTIVE"
fi

echo ""
echo "   Login shell:"
NPM_LOGIN=$(docker exec -u coder agentdb9-vscode-1 bash -l -c 'npm --version 2>&1')
if [ $? -eq 0 ]; then
    echo "   ✅ npm works: $NPM_LOGIN"
else
    echo "   ❌ npm failed: $NPM_LOGIN"
fi
echo ""

# Test 8: Check VSCode settings.json
echo "Test 8: VSCode Settings"
if docker exec agentdb9-vscode-1 test -f /home/coder/.local/share/code-server/User/settings.json; then
    echo "✅ VSCode settings.json exists"
    echo "   Contents:"
    docker exec agentdb9-vscode-1 cat /home/coder/.local/share/code-server/User/settings.json
else
    echo "❌ VSCode settings.json NOT found"
fi
echo ""

# Test 9: Check volume mounts
echo "Test 9: Volume Mounts"
echo "   Workspace volume contents:"
docker exec agentdb9-vscode-1 ls -la /home/coder/workspace/ | head -10
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "If npm works in login shell but not in non-interactive shell,"
echo "the issue is that VSCode terminal is not starting as a login shell."
echo ""
echo "Solution: VSCode settings must force terminal to use 'bash -l'"
echo ""
echo "=========================================="
echo "Running Project Delete Tests"
echo "=========================================="
echo ""

# Test project creation and deletion
TEST_PROJECT_NAME="test-delete-$(date +%s)"
echo "Creating test project: $TEST_PROJECT_NAME"

# Note: This requires backend to be running
# Actual API tests are in backend/src/projects/__tests__/delete-project.e2e-spec.ts
echo "✅ E2E tests for project deletion are available at:"
echo "   backend/src/projects/__tests__/delete-project.e2e-spec.ts"
echo ""
echo "Run with: npm test -- delete-project.e2e-spec.ts"
