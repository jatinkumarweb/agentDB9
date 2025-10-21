# Testing Guide - Interactive Approval System

## Overview

This document provides comprehensive testing information for the Interactive Approval & Task Planning System.

## Test Coverage

### Backend Tests

#### 1. ApprovalService Tests (`backend/src/common/services/approval.service.spec.ts`)

**Coverage:**
- ✅ Risk assessment for all command types (critical, high, medium, low)
- ✅ Command approval workflow
- ✅ Approval rejection handling
- ✅ Approval timeout handling
- ✅ Command modification
- ✅ Dependency approval
- ✅ Selective package installation
- ✅ Dev dependencies handling
- ✅ File operation approval
- ✅ Git operation approval
- ✅ Utility methods (shouldRequireApproval, estimateCommandDuration)
- ✅ Pending approvals management
- ✅ Approval cancellation

**Test Count:** 25+ tests

**Run Tests:**
```bash
cd backend
npm test approval.service.spec.ts
```

#### 2. MCP Service Tests (`backend/src/mcp/mcp.service.spec.ts`)

**Coverage:**
- ✅ Low-risk command execution without approval
- ✅ High-risk command approval request
- ✅ Approval rejection handling
- ✅ Approval timeout handling
- ✅ Modified command usage
- ✅ Approval bypass when requireApproval is false
- ✅ Dependency installation detection (npm, yarn, pnpm, bun)
- ✅ Dev dependency detection
- ✅ Selective package installation
- ✅ File deletion approval
- ✅ Git commit/push approval
- ✅ Utility methods (isDependencyInstallCommand, extractPackagesFromCommand, detectPackageManager)
- ✅ Error handling

**Test Count:** 20+ tests

**Run Tests:**
```bash
cd backend
npm test mcp.service.spec.ts
```

#### 3. ReACT Service Tests (`backend/src/conversations/react-agent.service.spec.ts`)

**Coverage:**
- ✅ Task plan generation for complex tasks
- ✅ Task plan skipping for simple queries
- ✅ Valid task plan structure
- ✅ Invalid LLM response handling
- ✅ Milestone status updates (in_progress, completed, failed)
- ✅ Percentage completion calculation
- ✅ Task plan broadcasting
- ✅ Milestone progress tracking
- ✅ Milestone ID in steps
- ✅ Tool execution progress updates

**Test Count:** 15+ tests

**Run Tests:**
```bash
cd backend
npm test react-agent.service.spec.ts
```

### Frontend Tests

#### 4. ApprovalDialog Tests (`frontend/src/components/__tests__/ApprovalDialog.test.tsx`)

**Coverage:**
- ✅ Command execution approval rendering
- ✅ Risk badge display
- ✅ Approve/Reject button functionality
- ✅ Command modification
- ✅ High-risk warnings
- ✅ Dependency installation approval
- ✅ Package selection
- ✅ Select all/Deselect all buttons
- ✅ Approve button disabled when no packages selected
- ✅ Package manager badge
- ✅ Dev dependency badge
- ✅ File operation approval
- ✅ Content preview
- ✅ Git operation approval
- ✅ Affected files display
- ✅ Commit message display
- ✅ Risk indicators (low, medium, high, critical)
- ✅ Dialog behavior (open/close)
- ✅ Remember choice checkbox

**Test Count:** 30+ tests

**Run Tests:**
```bash
cd frontend
npm test ApprovalDialog.test.tsx
```

#### 5. TaskProgressBar Tests (`frontend/src/components/__tests__/TaskProgressBar.test.tsx`)

**Coverage:**
- ✅ Task objective rendering
- ✅ Task description rendering
- ✅ Completion count badge
- ✅ Estimated duration display
- ✅ Percentage calculation
- ✅ Custom percentage usage
- ✅ Completed/in progress/failed counts
- ✅ All milestones rendering
- ✅ Milestone descriptions
- ✅ Milestone type badges
- ✅ "Requires Approval" badges
- ✅ Tool badges
- ✅ Completed status indicators
- ✅ In progress status indicators
- ✅ Pending status indicators
- ✅ Failed status with error message
- ✅ Milestone type colors (analysis, file_operation, command_execution, validation, git_operation)
- ✅ Edge cases (no milestones, all completed, no duration, no tools)
- ✅ Custom props (className, currentStep, totalSteps)
- ✅ Accessibility (heading structure, screen reader text)

**Test Count:** 35+ tests

**Run Tests:**
```bash
cd frontend
npm test TaskProgressBar.test.tsx
```

#### 6. useApprovalWorkflow Hook Tests (`frontend/src/hooks/__tests__/useApprovalWorkflow.test.ts`)

**Coverage:**
- ✅ Socket connection on mount
- ✅ Conversation room joining
- ✅ Connection status tracking
- ✅ Disconnection handling
- ✅ Cleanup on unmount
- ✅ Approval request reception
- ✅ Pending approval clearing after approval
- ✅ Pending approval clearing after rejection
- ✅ Modified command sending
- ✅ Selected packages sending
- ✅ Task progress updates reception
- ✅ Task plan storage
- ✅ Milestone status updates
- ✅ Connection error handling
- ✅ Approval without pending request
- ✅ Rejection without pending request
- ✅ Working without conversationId

**Test Count:** 20+ tests

**Run Tests:**
```bash
cd frontend
npm test useApprovalWorkflow.test.ts
```

### Integration Tests

#### 7. Approval Workflow Integration Tests (`tests/integration/approval-workflow.integration.test.ts`)

**Coverage:**
- ✅ Full command approval flow
- ✅ Command rejection flow
- ✅ Modified command flow
- ✅ Dependency installation flow
- ✅ Task planning flow
- ✅ Real-time milestone updates
- ✅ File operation flow
- ✅ Git operation flow
- ✅ Approval timeout handling
- ✅ WebSocket disconnection handling
- ✅ Multiple concurrent approvals

**Test Count:** 15+ tests

**Run Tests:**
```bash
npm test approval-workflow.integration.test.ts
```

## Running All Tests

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
npm test tests/integration
```

### Coverage Report
```bash
# Backend
cd backend
npm test -- --coverage

# Frontend
cd frontend
npm test -- --coverage
```

## Test Scenarios

### Scenario 1: Command Approval Flow

**Steps:**
1. User sends message: "Install express"
2. Agent detects npm install command
3. MCP service requests approval
4. Approval service emits event
5. WebSocket broadcasts to frontend
6. Frontend displays ApprovalDialog
7. User clicks "Approve"
8. Frontend emits approval response
9. Approval service resolves promise
10. MCP service executes command
11. Result returned to user

**Expected Result:** Command executes successfully

**Test Files:**
- `approval.service.spec.ts` - Lines 100-150
- `mcp.service.spec.ts` - Lines 50-100
- `ApprovalDialog.test.tsx` - Lines 50-100
- `useApprovalWorkflow.test.ts` - Lines 100-150
- `approval-workflow.integration.test.ts` - Lines 50-100

### Scenario 2: Dependency Selection Flow

**Steps:**
1. User sends message: "Install react, vue, and angular"
2. Agent detects dependency installation
3. MCP service extracts packages
4. Approval service requests dependency approval
5. Frontend displays package list with checkboxes
6. User unchecks "angular"
7. User clicks "Approve"
8. Frontend sends selected packages
9. MCP service modifies command
10. Only react and vue installed

**Expected Result:** Only selected packages installed

**Test Files:**
- `approval.service.spec.ts` - Lines 200-250
- `mcp.service.spec.ts` - Lines 150-200
- `ApprovalDialog.test.tsx` - Lines 150-200
- `approval-workflow.integration.test.ts` - Lines 150-200

### Scenario 3: Task Planning Flow

**Steps:**
1. User sends message: "Create a React app"
2. ReACT service detects complex task
3. LLM generates task plan with milestones
4. Task plan broadcast via WebSocket
5. Frontend displays TaskProgressBar
6. For each milestone:
   - Status updates to 'in_progress'
   - Progress broadcast
   - Tools executed (with approval if needed)
   - Status updates to 'completed'
   - Progress broadcast
7. Final answer returned

**Expected Result:** Task completed with milestone tracking

**Test Files:**
- `react-agent.service.spec.ts` - Lines 50-200
- `TaskProgressBar.test.tsx` - All tests
- `useApprovalWorkflow.test.ts` - Lines 200-300
- `approval-workflow.integration.test.ts` - Lines 200-300

### Scenario 4: Approval Rejection Flow

**Steps:**
1. User sends message: "Delete all files"
2. Agent detects dangerous command
3. Risk assessed as CRITICAL
4. Approval dialog shows with warning
5. User clicks "Reject"
6. Operation cancelled
7. Agent responds: "Operation rejected by user"

**Expected Result:** No files deleted, operation cancelled

**Test Files:**
- `approval.service.spec.ts` - Lines 150-200
- `mcp.service.spec.ts` - Lines 100-150
- `ApprovalDialog.test.tsx` - Lines 100-150

### Scenario 5: Command Modification Flow

**Steps:**
1. User sends message: "Install react"
2. Approval dialog shows: "npm install react"
3. User modifies to: "npm install react@18.2.0"
4. User clicks "Approve"
5. Modified command sent to backend
6. Specific version installed

**Expected Result:** React 18.2.0 installed

**Test Files:**
- `approval.service.spec.ts` - Lines 250-300
- `mcp.service.spec.ts` - Lines 200-250
- `ApprovalDialog.test.tsx` - Lines 200-250

## Manual Testing Checklist

### Command Approval
- [ ] Low-risk command executes without approval
- [ ] Medium-risk command requests approval
- [ ] High-risk command shows warning
- [ ] Critical-risk command shows critical warning
- [ ] Approve button works
- [ ] Reject button works
- [ ] Command modification works
- [ ] Timeout handling works

### Dependency Installation
- [ ] Package list displays correctly
- [ ] All packages checked by default
- [ ] Checkbox selection works
- [ ] Select all button works
- [ ] Deselect all button works
- [ ] Approve button disabled when no packages selected
- [ ] Dev dependency badge shows correctly
- [ ] Package manager badge shows correctly

### Task Planning
- [ ] Task plan displays before execution
- [ ] Milestones show in correct order
- [ ] Progress bar updates in real-time
- [ ] Milestone status icons update correctly
- [ ] Percentage calculation is accurate
- [ ] Completed/in progress/failed counts are correct
- [ ] Tool badges display correctly
- [ ] "Requires Approval" badge shows when needed

### File Operations
- [ ] File deletion requests approval
- [ ] Content preview shows when available
- [ ] File path displays correctly
- [ ] Operation type badge shows correctly

### Git Operations
- [ ] Git push requests approval
- [ ] Git commit requests approval
- [ ] Branch name displays correctly
- [ ] Commit message displays correctly
- [ ] Affected files list displays correctly

### Error Handling
- [ ] Approval timeout shows error message
- [ ] WebSocket disconnection handled gracefully
- [ ] Invalid approval response handled
- [ ] Multiple concurrent approvals work correctly

## Performance Testing

### Load Testing
```bash
# Test multiple concurrent approvals
npm run test:load approval-workflow
```

### Stress Testing
```bash
# Test system under high load
npm run test:stress approval-workflow
```

### Memory Leak Testing
```bash
# Check for memory leaks
npm run test:memory approval-workflow
```

## Debugging Tests

### Backend
```bash
cd backend
npm test -- --verbose --detectOpenHandles
```

### Frontend
```bash
cd frontend
npm test -- --verbose --watchAll=false
```

### Integration
```bash
npm test tests/integration -- --verbose --runInBand
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Test Approval System

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run backend tests
        run: cd backend && npm test
      - name: Run frontend tests
        run: cd frontend && npm test
      - name: Run integration tests
        run: npm test tests/integration
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Test Maintenance

### Adding New Tests

1. **Backend:**
   - Add test file in `backend/src/**/*.spec.ts`
   - Follow existing test structure
   - Mock dependencies appropriately
   - Test both success and error cases

2. **Frontend:**
   - Add test file in `frontend/src/**/__tests__/*.test.tsx`
   - Use React Testing Library
   - Test user interactions
   - Test accessibility

3. **Integration:**
   - Add test file in `tests/integration/*.integration.test.ts`
   - Test end-to-end flows
   - Use real WebSocket connections
   - Test error scenarios

### Updating Tests

When modifying features:
1. Update corresponding test files
2. Add new test cases for new functionality
3. Update test documentation
4. Run full test suite before committing

## Test Coverage Goals

- **Backend:** > 80% coverage
- **Frontend:** > 75% coverage
- **Integration:** > 70% coverage
- **Overall:** > 75% coverage

## Known Issues

1. **WebSocket Tests:** May be flaky in CI environment
   - Solution: Use longer timeouts, retry logic

2. **Async Tests:** May timeout occasionally
   - Solution: Increase timeout, use proper async/await

3. **Mock Data:** May become outdated
   - Solution: Regular review and updates

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Socket.IO Testing](https://socket.io/docs/v4/testing/)

---

**Last Updated:** 2025-10-19  
**Test Coverage:** 145+ tests across all components  
**Status:** ✅ All tests passing
