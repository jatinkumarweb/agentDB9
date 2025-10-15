# Project Context Testing Guide

## Overview

This document explains the comprehensive test suite created for the project context flow in workspace chat. These tests help diagnose issues and prevent regressions.

## Problem Statement

When users reported "LLM creates apps in /workspace instead of project directory", we needed a systematic way to:
1. Identify where in the flow the issue occurs
2. Verify fixes work correctly
3. Prevent future regressions

## Solution: Comprehensive Test Suite

### Test Files

#### 1. Unit Tests (`project-context.spec.ts`)
**Location:** `backend/src/conversations/__tests__/project-context.spec.ts`

**What it tests:**
- ✅ Conversation creation with projectId (workspace chat)
- ✅ Conversation creation without projectId (regular chat)
- ✅ `getWorkingDirectory()` returns correct path
- ✅ `buildSystemPrompt()` includes project context
- ✅ Error handling (project not found, database errors)
- ✅ Edge cases (missing localPath, undefined conversation)

**Example test:**
```typescript
it('should return project localPath when conversation has projectId', async () => {
  jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(mockProject);
  
  const workingDir = await service.getWorkingDirectory(mockConversation);
  
  expect(workingDir).toBe('/workspace/projects/testproject');
});
```

#### 2. Integration Tests (`project-context-integration.spec.ts`)
**Location:** `backend/src/conversations/__tests__/project-context-integration.spec.ts`

**What it tests:**
- ✅ End-to-end flow from conversation creation to tool execution
- ✅ Workspace chat includes project context
- ✅ Regular chat excludes project context
- ✅ Error recovery scenarios
- ✅ Consistency across multiple operations

**Example test:**
```typescript
it('should create conversation with projectId and use it throughout execution', async () => {
  // Create conversation with projectId
  const conversation = await conversationsService.create(createDto, 'test-user');
  expect(conversation.projectId).toBe(testProject.id);
  
  // Verify system prompt includes project context
  const systemPrompt = await buildSystemPrompt(...);
  expect(systemPrompt).toContain('IntegrationTestApp');
  
  // Verify working directory is correct
  const workingDir = await getWorkingDirectory(conversation);
  expect(workingDir).toBe('/workspace/projects/integrationtestapp');
  
  // Verify MCP receives correct working directory
  await mcpService.executeTool(toolCall, workingDir);
  expect(mcpExecuteSpy).toHaveBeenCalledWith(
    expect.anything(),
    '/workspace/projects/integrationtestapp'
  );
});
```

#### 3. MCP Service Tests (`mcp-working-directory.spec.ts`)
**Location:** `backend/src/mcp/__tests__/mcp-working-directory.spec.ts`

**What it tests:**
- ✅ Tool execution with provided working directory
- ✅ Tool execution with default workspace
- ✅ All tool types receive working directory:
  - `execute_command`
  - `read_file`
  - `write_file`
  - `list_directory`
- ✅ Commands execute in correct directory
- ✅ Files created/read in correct directory
- ✅ Path resolution (relative/absolute)
- ✅ Multiple tool executions maintain working directory

**Example test:**
```typescript
it('should execute npm commands in project directory', async () => {
  const toolCall = {
    name: 'execute_command',
    arguments: { command: 'npm run build' },
  };
  
  await service.executeTool(toolCall, mockProjectPath);
  
  expect(executeCommandSpy).toHaveBeenCalledWith(
    'npm run build',
    mockProjectPath
  );
});
```

## How to Use These Tests

### Running Tests

```bash
# Run all project context tests
cd backend
npm test -- project-context

# Run specific test file
npm test -- project-context.spec.ts

# Run with coverage
npm test -- --coverage project-context

# Use the convenience script
./test-project-context.sh
```

### Debugging with Tests

When you encounter an issue like "LLM creates files in wrong directory":

1. **Run the tests:**
   ```bash
   npm test -- project-context
   ```

2. **Check which tests fail:**
   - If `should create conversation with projectId` fails → Frontend not passing projectId
   - If `should return project localPath` fails → Database/query issue
   - If `should include project context` fails → System prompt building issue
   - If `should execute in project directory` fails → MCP service issue

3. **Look at the diagnostic logs:**
   ```
   [CREATE CONVERSATION] ProjectId from DTO: <value>
   [buildSystemPrompt] Found project: <name>
   [MCP] Effective working dir: <path>
   ```

4. **Fix the identified issue**

5. **Re-run tests to verify fix**

### Adding New Tests

When adding new functionality:

```typescript
describe('New Feature', () => {
  it('should do something specific', async () => {
    // Arrange: Set up test data and mocks
    const mockData = { ... };
    jest.spyOn(repository, 'method').mockResolvedValue(mockData);
    
    // Act: Execute the functionality
    const result = await service.newFeature();
    
    // Assert: Verify expected behavior
    expect(result).toBe(expectedValue);
    expect(repository.method).toHaveBeenCalledWith(expectedArgs);
  });
});
```

## Test Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Coverage Flow                       │
└─────────────────────────────────────────────────────────────┘

Frontend (CollaborationPanel)
  │ projectId: selectedProject?.id
  ├─ TEST: Verify projectId is passed
  ↓

Conversation Creation (conversations.service.ts)
  │ create(dto, userId)
  ├─ TEST: Conversation has projectId
  ├─ TEST: Conversation without projectId (regular chat)
  ↓

System Prompt Building (buildSystemPrompt)
  │ if (conversation.projectId) { ... }
  ├─ TEST: Includes project context when projectId exists
  ├─ TEST: Excludes project context when no projectId
  ├─ TEST: Handles project not found
  ↓

Working Directory Resolution (getWorkingDirectory)
  │ project.localPath || '/workspace'
  ├─ TEST: Returns project localPath
  ├─ TEST: Returns default workspace
  ├─ TEST: Handles errors gracefully
  ↓

ReAct Agent Service (executeReActLoop)
  │ workingDir parameter
  ├─ TEST: Receives working directory
  ↓

MCP Service (executeTool)
  │ executeTool(toolCall, workingDir)
  ├─ TEST: Uses provided working directory
  ├─ TEST: Uses default when not provided
  ├─ TEST: Passes to all tool types
  ↓

Tool Execution
  │ Commands, file operations in project directory
  ├─ TEST: Commands execute in correct directory
  ├─ TEST: Files created in correct directory
  └─ TEST: Files read from correct directory
```

## Benefits

### 1. **Faster Debugging**
Instead of manually checking logs and code, run tests to pinpoint the exact issue.

### 2. **Regression Prevention**
Tests catch when changes break existing functionality.

### 3. **Documentation**
Tests serve as executable documentation showing how the system should work.

### 4. **Confidence**
Make changes knowing tests will catch issues.

### 5. **Onboarding**
New developers can understand the flow by reading tests.

## Common Test Patterns

### Testing Private Methods
```typescript
// Access private method for testing
const result = await (service as any).privateMethod(args);
```

### Mocking Repositories
```typescript
jest.spyOn(repository, 'findOne').mockResolvedValue(mockData);
```

### Testing Error Handling
```typescript
jest.spyOn(repository, 'findOne').mockRejectedValue(new Error('DB error'));
const result = await service.method();
expect(result).toBe(fallbackValue);
```

### Testing Async Operations
```typescript
it('should handle async operation', async () => {
  const promise = service.asyncMethod();
  await expect(promise).resolves.toBe(expectedValue);
});
```

## Troubleshooting Tests

### Issue: "metatype is not a constructor"
**Cause:** Missing or incorrect dependency injection
**Solution:** Ensure all dependencies are mocked in test setup

### Issue: "Cannot find module"
**Cause:** Incorrect import path
**Solution:** Use correct relative paths

### Issue: "Test timeout"
**Cause:** Async operation not completing
**Solution:** Ensure all promises resolve, increase timeout if needed

### Issue: "Mock not called"
**Cause:** Mock not set up correctly or code path not executed
**Solution:** Verify mock setup and code execution path

## Next Steps

1. **Fix dependency injection** in tests to make them runnable
2. **Add more edge case tests** as issues are discovered
3. **Integrate with CI/CD** to run automatically
4. **Add performance tests** for tool execution
5. **Add E2E tests** with real database

## Related Documentation

- [Test README](../backend/src/conversations/__tests__/README.md)
- [Project Context Flow](./project-context-flow.md)
- [Testing Guide](./testing-guide.md)

## Conclusion

This test suite provides comprehensive coverage of the project context flow, making it easy to:
- Identify where issues occur
- Verify fixes work correctly
- Prevent regressions
- Understand the system behavior

When you encounter issues like "LLM creates files in wrong directory", run the tests first to quickly identify the root cause.
