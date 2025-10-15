#!/bin/bash

# Test script to verify project context flow
# This script tests each step of the flow and reports results

set -e

echo "=========================================="
echo "Project Context Flow Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
TESTS=()

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo "----------------------------------------"
    echo "TEST: $test_name"
    echo "----------------------------------------"
    echo "Command: $test_command"
    echo "Expected: $expected_result"
    echo ""
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
        TESTS+=("✅ $test_name")
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
        TESTS+=("❌ $test_name")
    fi
    echo ""
}

# Test 1: Verify workspace base path exists
run_test \
    "Workspace base path exists" \
    "docker-compose exec -T backend test -d /workspace" \
    "Directory /workspace should exist in backend container"

# Test 2: Verify projects directory exists
run_test \
    "Projects directory exists" \
    "docker-compose exec -T backend test -d /workspace/projects" \
    "Directory /workspace/projects should exist"

# Test 3: Create a test project via API
echo "----------------------------------------"
echo "TEST: Create test project via API"
echo "----------------------------------------"
PROJECT_NAME="test-$(date +%s)"
echo "Creating project: $PROJECT_NAME"

RESPONSE=$(curl -s -X POST http://localhost:3000/api/projects \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-token" \
    -d "{
        \"name\": \"$PROJECT_NAME\",
        \"description\": \"Test project for flow verification\",
        \"language\": \"typescript\",
        \"framework\": \"react\"
    }" 2>&1 || echo '{"success":false}')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    PROJECT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ PASS - Project created with ID: $PROJECT_ID${NC}"
    PASSED=$((PASSED + 1))
    TESTS+=("✅ Create test project via API")
else
    echo -e "${RED}❌ FAIL - Project creation failed${NC}"
    FAILED=$((FAILED + 1))
    TESTS+=("❌ Create test project via API")
    PROJECT_ID=""
fi
echo ""

# Test 4: Verify project folder was created
if [ -n "$PROJECT_ID" ]; then
    SAFE_NAME=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/^-*//;s/-*$//')
    run_test \
        "Project folder created on filesystem" \
        "docker-compose exec -T backend test -d /workspace/projects/$SAFE_NAME" \
        "Directory /workspace/projects/$SAFE_NAME should exist"
    
    # Test 5: Verify README exists
    run_test \
        "Project README created" \
        "docker-compose exec -T backend test -f /workspace/projects/$SAFE_NAME/README.md" \
        "File /workspace/projects/$SAFE_NAME/README.md should exist"
    
    # Test 6: Verify src directory exists
    run_test \
        "Project src directory created" \
        "docker-compose exec -T backend test -d /workspace/projects/$SAFE_NAME/src" \
        "Directory /workspace/projects/$SAFE_NAME/src should exist"
else
    echo -e "${YELLOW}⚠️  SKIP - Tests 4-6 skipped (no project ID)${NC}"
    echo ""
fi

# Test 7: Verify project in database has localPath
if [ -n "$PROJECT_ID" ]; then
    echo "----------------------------------------"
    echo "TEST: Project has localPath in database"
    echo "----------------------------------------"
    
    DB_RESULT=$(docker-compose exec -T backend node -e "
        const { DataSource } = require('typeorm');
        const ds = new DataSource({
            type: 'postgres',
            host: 'postgres',
            port: 5432,
            username: 'postgres',
            password: 'password',
            database: 'coding_agent'
        });
        ds.initialize().then(async () => {
            const result = await ds.query('SELECT \"localPath\" FROM projects WHERE id = \$1', ['$PROJECT_ID']);
            console.log(JSON.stringify(result[0]));
            await ds.destroy();
        }).catch(err => {
            console.error('ERROR:', err.message);
            process.exit(1);
        });
    " 2>&1)
    
    echo "Database result: $DB_RESULT"
    
    if echo "$DB_RESULT" | grep -q "localPath"; then
        LOCAL_PATH=$(echo "$DB_RESULT" | grep -o '"localPath":"[^"]*"' | cut -d'"' -f4)
        echo "Local path: $LOCAL_PATH"
        if [ -n "$LOCAL_PATH" ] && [ "$LOCAL_PATH" != "null" ]; then
            echo -e "${GREEN}✅ PASS - Project has localPath: $LOCAL_PATH${NC}"
            PASSED=$((PASSED + 1))
            TESTS+=("✅ Project has localPath in database")
        else
            echo -e "${RED}❌ FAIL - localPath is null or empty${NC}"
            FAILED=$((FAILED + 1))
            TESTS+=("❌ Project has localPath in database")
        fi
    else
        echo -e "${RED}❌ FAIL - Could not query database${NC}"
        FAILED=$((FAILED + 1))
        TESTS+=("❌ Project has localPath in database")
    fi
    echo ""
fi

# Test 8: Test getWorkingDirectory method
if [ -n "$PROJECT_ID" ]; then
    echo "----------------------------------------"
    echo "TEST: getWorkingDirectory returns correct path"
    echo "----------------------------------------"
    
    # This would need to be tested via the actual service
    # For now, we'll verify the logic manually
    echo "Expected: /workspace/projects/$SAFE_NAME"
    echo "This requires testing via conversation creation"
    echo -e "${YELLOW}⚠️  MANUAL TEST REQUIRED${NC}"
    echo ""
fi

# Test 9: Verify command execution in project directory
if [ -n "$PROJECT_ID" ] && [ -n "$SAFE_NAME" ]; then
    echo "----------------------------------------"
    echo "TEST: Command executes in project directory"
    echo "----------------------------------------"
    
    # Create a test file to verify working directory
    docker-compose exec -T backend sh -c "cd /workspace/projects/$SAFE_NAME && echo 'test' > test-file.txt"
    
    if docker-compose exec -T backend test -f "/workspace/projects/$SAFE_NAME/test-file.txt"; then
        echo -e "${GREEN}✅ PASS - Can create files in project directory${NC}"
        PASSED=$((PASSED + 1))
        TESTS+=("✅ Command executes in project directory")
        
        # Clean up
        docker-compose exec -T backend rm "/workspace/projects/$SAFE_NAME/test-file.txt"
    else
        echo -e "${RED}❌ FAIL - Cannot create files in project directory${NC}"
        FAILED=$((FAILED + 1))
        TESTS+=("❌ Command executes in project directory")
    fi
    echo ""
fi

# Test 10: Verify VSCode can access the files
echo "----------------------------------------"
echo "TEST: VSCode container can access project files"
echo "----------------------------------------"

if docker-compose ps | grep -q "vscode.*Up"; then
    if [ -n "$SAFE_NAME" ]; then
        if docker-compose exec -T vscode test -d "/workspace/projects/$SAFE_NAME" 2>/dev/null; then
            echo -e "${GREEN}✅ PASS - VSCode can access project directory${NC}"
            PASSED=$((PASSED + 1))
            TESTS+=("✅ VSCode can access project files")
        else
            echo -e "${RED}❌ FAIL - VSCode cannot access project directory${NC}"
            FAILED=$((FAILED + 1))
            TESTS+=("❌ VSCode can access project files")
        fi
    else
        echo -e "${YELLOW}⚠️  SKIP - No project to test${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SKIP - VSCode container not running${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
for test in "${TESTS[@]}"; do
    echo "$test"
done
echo ""
echo "Total: $((PASSED + FAILED)) tests"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
