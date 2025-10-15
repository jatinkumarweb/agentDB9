# Project Context Testing Guide

## Quick Test Commands

### 1. Test Working Directory Logic
```bash
node backend/test-working-directory.js
```
**Expected Result:** All 8 tests pass
**What it tests:** Path resolution and folder name sanitization logic

### 2. Test Full Project Context Flow
```bash
./backend/test-project-context-flow.sh
```
**Expected Result:** All tests pass
**What it tests:** End-to-end flow from project creation to file access

## Manual Test Procedure

### Test 1: Verify Workspace Mount
**Purpose:** Ensure /workspace is accessible in backend container

```bash
docker-compose exec backend ls -la /workspace
```

**Expected Result:**
```
drwxr-xr-x  5 node node 4096 ... .
drwxr-xr-x  1 root root 4096 ... ..
drwxr-xr-x  2 node node 4096 ... projects
-rw-r--r--  1 node node  633 ... README.md
```

**If Failed:** Check docker-compose.yml volumes for backend service

---

### Test 2: Verify Projects Directory
**Purpose:** Ensure projects directory exists

```bash
docker-compose exec backend ls -la /workspace/projects
```

**Expected Result:**
```
drwxr-xr-x  3 node root 4096 ... .
drwxr-xr-x  5 node node 4096 ... ..
drwxr-xr-x  4 node root 4096 ... <project-folders>
```

**If Failed:** 
- Check if WORKSPACE_PATH env var is set correctly
- Verify volume mount in docker-compose.yml

---

### Test 3: Create Project via UI
**Purpose:** Test project creation and folder initialization

**Steps:**
1. Open workspace UI
2. Click "Create Project"
3. Enter project name: "TestFlow"
4. Select language: TypeScript
5. Select framework: React
6. Click Create

**Expected Result:**
- Success message appears
- Project appears in project list
- Check backend logs for:
  ```
  [initWorkspaceFolder] Creating project folder at: /workspace/projects/testflow
  [initWorkspaceFolder] ✅ Project folder created successfully
  [initWorkspaceFolder] ✅ Project localPath updated in database
  ```

**If Failed:**
- Check logs for `[initWorkspaceFolder] ❌` errors
- Verify permissions on /workspace/projects
- Check if fs.mkdir is working

---

### Test 4: Verify Folder Created
**Purpose:** Confirm folder exists on filesystem

```bash
docker-compose exec backend ls -la /workspace/projects/testflow
```

**Expected Result:**
```
drwxr-xr-x  4 node root 4096 ... .
drwxr-xr-x  3 node root 4096 ... ..
-rw-r--r--  1 node root  ... .gitignore
-rw-r--r--  1 node root  ... README.md
drwxr-xr-x  2 node root 4096 ... src
drwxr-xr-x  2 node root 4096 ... tests
-rw-r--r--  1 node root  ... testflow.code-workspace
```

**If Failed:**
- initWorkspaceFolder didn't run or failed
- Check error logs from Test 3

---

### Test 5: Verify Database Entry
**Purpose:** Confirm project has localPath in database

```bash
docker-compose exec backend node -e "
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
  const result = await ds.query(
    'SELECT id, name, \"localPath\" FROM projects ORDER BY \"createdAt\" DESC LIMIT 1'
  );
  console.log(JSON.stringify(result[0], null, 2));
  await ds.destroy();
});
"
```

**Expected Result:**
```json
{
  "id": "...",
  "name": "TestFlow",
  "localPath": "/workspace/projects/testflow"
}
```

**If Failed:**
- initWorkspaceFolder didn't update database
- Check if project.save() is working

---

### Test 6: Test Conversation Creation with Project
**Purpose:** Verify conversation links to project

**Steps:**
1. Select the TestFlow project in workspace UI
2. Open chat panel
3. Send message: "hello"
4. Check backend logs for:
   ```
   [CREATE CONVERSATION] ProjectId from DTO: <project-id>
   [CREATE CONVERSATION] Saved conversation ID: <conv-id>, ProjectId: <project-id>
   ```

**Expected Result:**
- Conversation created with projectId
- Logs show projectId is not null

**If Failed:**
- CollaborationPanel not passing projectId
- Check frontend code

---

### Test 7: Test System Prompt Building
**Purpose:** Verify project context is added to system prompt

**Steps:**
1. With project selected, send message: "create a React component"
2. Check backend logs for:
   ```
   🔍 ReACT decision for "create a React component": true
   🔍 Matched keywords: create a
   🔄 Using ReAct pattern for tool-based query
   ================================================================================
   🔨 [buildSystemPrompt] CALLED
   ================================================================================
   [buildSystemPrompt] Conversation ID: <id>, ProjectId: <project-id>
   [buildSystemPrompt] Found project: TestFlow (<project-id>)
   [buildSystemPrompt] ✅ Added project context for: TestFlow
   [buildSystemPrompt] Project directory: /workspace/projects/testflow
   📝 ReAct: System prompt contains "Current Project Context": true
   📝 ReAct: Project name in prompt: TestFlow
   ```

**Expected Result:**
- ReAct mode triggers
- buildSystemPrompt is called
- Project context is added
- System prompt contains project name

**If Failed:**
- shouldUseReAct() not matching keywords
- buildSystemPrompt not being called
- Project not found in database

---

### Test 8: Test Working Directory Resolution
**Purpose:** Verify correct working directory is used

**Steps:**
1. Continue from Test 7
2. Check logs for:
   ```
   ⚙️ ReAct: Calling executeReActLoop with model ... (workingDir: /workspace/projects/testflow)
   ```

**Expected Result:**
- Working directory is project path
- Not /workspace

**If Failed:**
- getWorkingDirectory() not working
- Project localPath is null

---

### Test 9: Test Tool Execution
**Purpose:** Verify tools execute in project directory

**Steps:**
1. Continue from Test 8
2. Wait for tool execution
3. Check logs for:
   ```
   [MCP] Tool: execute_command
   [MCP] Working dir param: /workspace/projects/testflow
   [MCP] Effective working dir: /workspace/projects/testflow
   ```

**Expected Result:**
- Tool receives correct working directory
- Commands execute in project folder

**If Failed:**
- Working directory not passed to MCP
- Check ReAct agent service

---

### Test 10: Verify Files Created in Project
**Purpose:** Confirm files are in correct location

**Steps:**
1. After command completes, check filesystem:
   ```bash
   docker-compose exec backend ls -la /workspace/projects/testflow
   ```

**Expected Result:**
- New files/folders created by command
- Files are in project root, not in subdirectory

**If Failed:**
- Command executed in wrong directory
- LLM created subdirectory (check system prompt)

---

### Test 11: Verify VSCode Can See Files
**Purpose:** Confirm VSCode container has access

```bash
docker-compose exec vscode ls -la /workspace/projects/testflow
```

**Expected Result:**
- Same files as Test 10
- VSCode can access project folder

**If Failed:**
- Volume mount issue
- VSCode container not sharing workspace volume

---

## Test Results Template

Copy this template and fill in results:

```
## Test Results - [Date]

### Environment
- Backend container: [ ] Running
- VSCode container: [ ] Running
- Database: [ ] Running

### Test 1: Workspace Mount
- Status: [ ] PASS [ ] FAIL
- Notes: 

### Test 2: Projects Directory
- Status: [ ] PASS [ ] FAIL
- Notes:

### Test 3: Create Project via UI
- Status: [ ] PASS [ ] FAIL
- Project ID: 
- Notes:

### Test 4: Verify Folder Created
- Status: [ ] PASS [ ] FAIL
- Folder path: 
- Notes:

### Test 5: Verify Database Entry
- Status: [ ] PASS [ ] FAIL
- localPath value: 
- Notes:

### Test 6: Conversation Creation
- Status: [ ] PASS [ ] FAIL
- Conversation ID: 
- ProjectId in conversation: 
- Notes:

### Test 7: System Prompt Building
- Status: [ ] PASS [ ] FAIL
- ReAct triggered: [ ] Yes [ ] No
- buildSystemPrompt called: [ ] Yes [ ] No
- Project context added: [ ] Yes [ ] No
- Notes:

### Test 8: Working Directory Resolution
- Status: [ ] PASS [ ] FAIL
- Working directory: 
- Notes:

### Test 9: Tool Execution
- Status: [ ] PASS [ ] FAIL
- Tool working dir: 
- Notes:

### Test 10: Files Created
- Status: [ ] PASS [ ] FAIL
- Files location: 
- Notes:

### Test 11: VSCode Access
- Status: [ ] PASS [ ] FAIL
- Notes:

### Summary
- Total tests: 11
- Passed: 
- Failed: 
- First failure at: Test #

### Root Cause
[Describe the root cause based on first failure]

### Fix Applied
[Describe the fix]
```

## Common Failure Patterns

### Pattern 1: Folder Not Created
**Symptoms:**
- Test 3 passes
- Test 4 fails

**Root Cause:** initWorkspaceFolder failed
**Check:** Backend logs for [initWorkspaceFolder] errors
**Fix:** Check permissions, verify WORKSPACE_PATH

### Pattern 2: No Project Context in Prompt
**Symptoms:**
- Tests 1-6 pass
- Test 7 fails (buildSystemPrompt not called)

**Root Cause:** ReAct mode not triggering
**Check:** shouldUseReAct() keywords
**Fix:** Add missing keywords

### Pattern 3: Wrong Working Directory
**Symptoms:**
- Tests 1-7 pass
- Test 8 fails (wrong directory)

**Root Cause:** getWorkingDirectory() not working
**Check:** Project localPath in database
**Fix:** Ensure localPath is set correctly

### Pattern 4: Files in Wrong Location
**Symptoms:**
- Tests 1-9 pass
- Test 10 fails (files in subdirectory)

**Root Cause:** LLM ignoring system prompt
**Check:** System prompt content
**Fix:** Make prompt more explicit

### Pattern 5: VSCode Can't See Files
**Symptoms:**
- Tests 1-10 pass
- Test 11 fails

**Root Cause:** Volume mount issue
**Check:** docker-compose.yml volumes
**Fix:** Ensure VSCode shares workspace volume

## Automated Test Execution

Run all tests in sequence:

```bash
# 1. Test logic
node backend/test-working-directory.js

# 2. Test infrastructure
./backend/test-project-context-flow.sh

# 3. Manual verification
# Follow Tests 3-11 above
```

## Next Steps After Test Failure

1. **Identify first failing test**
2. **Check logs for that specific test**
3. **Review "Common Failure Patterns" above**
4. **Apply targeted fix**
5. **Re-run tests to verify fix**
6. **Document results**

This systematic approach will pinpoint the exact issue quickly!
