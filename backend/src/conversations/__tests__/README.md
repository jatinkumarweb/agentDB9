# Project Context Flow Tests

This directory contains comprehensive tests for the project context flow in workspace chat.

## Test Files

### 1. `project-context.spec.ts`
**Unit tests for project context in conversations service**

Tests:
- ✅ Conversation creation with projectId
- ✅ Conversation creation without projectId (regular chat)
- ✅ `getWorkingDirectory()` method
  - Returns project localPath when projectId exists
  - Returns default workspace when no projectId
  - Handles project not found
  - Handles database errors gracefully
- ✅ `buildSystemPrompt()` method
  - Includes project context when projectId exists
  - Excludes project context when no projectId
  - Handles project not found
  - Uses agent system prompt as base
- ✅ Edge cases
  - Conversation without agent
  - Project with missing localPath
  - Undefined conversation

### 2. `project-context-integration.spec.ts`
**Integration tests for end-to-end project context flow**

Tests:
- ✅ Complete flow from conversation creation to tool execution
- ✅ Workspace chat with project context
- ✅ Regular chat without project context
- ✅ Error recovery
  - Project not found
  - Database errors
- ✅ Consistency across multiple calls
  - Working directory consistency
  - System prompt consistency

### 3. `../mcp/__tests__/mcp-working-directory.spec.ts`
**Unit tests for MCP service working directory handling**

Tests:
- ✅ Tool execution with provided working directory
- ✅ Tool execution with default workspace
- ✅ Working directory passed to all tool types:
  - `execute_command`
  - `read_file`
  - `write_file`
  - `list_directory`
- ✅ Commands execute in correct directory
- ✅ Files created/read in correct directory
- ✅ Error handling
  - Non-existent directory
  - Command timeout
- ✅ Path resolution
  - Relative paths
  - Absolute paths
- ✅ Multiple tool executions maintain working directory

## Running Tests

### Run all project context tests:
```bash
npm test -- project-context
```

### Run specific test file:
```bash
npm test -- project-context.spec.ts
```

### Run with coverage:
```bash
npm test -- --coverage project-context
```

### Run in watch mode:
```bash
npm test -- --watch project-context
```

## Test Coverage

The tests cover the following flow:

```
Frontend (CollaborationPanel)
  ↓ projectId
Conversation Creation
  ↓ conversation.projectId
System Prompt Building
  ↓ includes project context
Working Directory Resolution
  ↓ project.localPath
ReAct Agent Service
  ↓ workingDir parameter
MCP Service
  ↓ executes in project directory
Tool Execution
```

## What These Tests Verify

### 1. **Conversation has projectId**
- Workspace chat conversations include projectId
- Regular chat conversations don't include projectId

### 2. **System Prompt includes project context**
- Project name, directory, language, framework
- Working directory rules
- Instructions for file creation

### 3. **Working directory is correct**
- Derived from project.localPath
- Falls back to /workspace if no project
- Handles errors gracefully

### 4. **Tools execute in project directory**
- Commands run in project directory
- Files created in project directory
- Files read from project directory

## Debugging Failed Tests

If tests fail, check:

1. **Mock data matches actual entities**
   - Check entity definitions in `backend/src/entities/`
   - Ensure mock objects have all required fields

2. **Repository methods are mocked correctly**
   - `findOne`, `save`, `create`, etc.
   - Return values match expected types

3. **Private method access**
   - Tests use `(service as any).methodName()` to access private methods
   - This is intentional for unit testing

4. **Async/await handling**
   - All async operations use `await`
   - Promises are properly resolved in mocks

## Adding New Tests

When adding new tests:

1. **Follow existing patterns**
   - Use descriptive test names
   - Group related tests in `describe` blocks
   - Use `beforeEach` for setup, `afterEach` for cleanup

2. **Mock external dependencies**
   - Database repositories
   - External services (WebSocket, MCP, etc.)
   - File system operations

3. **Test both success and failure cases**
   - Happy path
   - Error handling
   - Edge cases

4. **Keep tests isolated**
   - Each test should be independent
   - Clear mocks between tests
   - Don't rely on test execution order

## Common Issues and Solutions

### Issue: "Cannot find module"
**Solution:** Ensure all imports use correct relative paths

### Issue: "Repository method not mocked"
**Solution:** Add mock in `beforeEach` setup

### Issue: "Private method not accessible"
**Solution:** Use type assertion: `(service as any).privateMethod()`

### Issue: "Async test timeout"
**Solution:** Increase timeout or ensure promises resolve

## Integration with CI/CD

These tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

Minimum coverage requirement: 80%

## Related Documentation

- [Project Context Flow](../../docs/project-context-flow.md)
- [Testing Guide](../../docs/testing-guide.md)
- [MCP Service Documentation](../../mcp/README.md)
