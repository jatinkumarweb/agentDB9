# Test Setup and Fixes Required

## ⚠️ Environment Limitation

I cannot directly run npm/jest commands in this environment. However, I can provide you with:
1. Required dependencies to install
2. Fixes needed for the test files
3. Step-by-step instructions to run tests yourself

## 🔧 Required Setup Steps

### Step 1: Install Missing Dependencies

**Backend:**
```bash
cd backend
npm install --save @nestjs/event-emitter
npm install --save-dev @types/jest
```

**Frontend:**
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Step 2: Fix Test Files

I've identified several issues that need to be fixed:

#### Issue 1: EventEmitter2 Import in Tests

**Files affected:**
- `backend/src/common/services/approval.service.spec.ts`

**Fix:** The test imports `EventEmitter2` but the package might not be installed.

**Solution:**
```bash
cd backend
npm install @nestjs/event-emitter
```

Then update `backend/package.json` dependencies:
```json
"dependencies": {
  "@nestjs/event-emitter": "^2.0.4",
  ...
}
```

#### Issue 2: Missing UI Component Mocks

**Files affected:**
- `frontend/src/components/__tests__/ApprovalDialog.test.tsx`
- `frontend/src/components/__tests__/TaskProgressBar.test.tsx`

**Fix:** Create mock files for UI components.

**Solution:** Create `frontend/src/components/ui/__mocks__/` directory with mocks:

```typescript
// frontend/src/components/ui/__mocks__/dialog.tsx
export const Dialog = ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null;
export const DialogContent = ({ children }: any) => <div>{children}</div>;
export const DialogHeader = ({ children }: any) => <div>{children}</div>;
export const DialogTitle = ({ children }: any) => <h2>{children}</h2>;
export const DialogDescription = ({ children }: any) => <p>{children}</p>;
export const DialogFooter = ({ children }: any) => <div>{children}</div>;

// frontend/src/components/ui/__mocks__/button.tsx
export const Button = ({ children, onClick, disabled, ...props }: any) => (
  <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
);

// frontend/src/components/ui/__mocks__/input.tsx
export const Input = (props: any) => <input {...props} />;

// frontend/src/components/ui/__mocks__/checkbox.tsx
export const Checkbox = ({ checked, onCheckedChange, ...props }: any) => (
  <input 
    type="checkbox" 
    checked={checked} 
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...props}
  />
);

// frontend/src/components/ui/__mocks__/badge.tsx
export const Badge = ({ children, className }: any) => (
  <span className={className}>{children}</span>
);

// frontend/src/components/ui/__mocks__/progress.tsx
export const Progress = ({ value }: any) => (
  <div role="progressbar" aria-valuenow={value}>{value}%</div>
);
```

#### Issue 3: Socket.io Mock Configuration

**Files affected:**
- `frontend/src/hooks/__tests__/useApprovalWorkflow.test.ts`

**Fix:** The socket.io-client mock needs proper setup.

**Solution:** Create `frontend/src/__mocks__/socket.io-client.ts`:

```typescript
export const io = jest.fn(() => ({
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
}));
```

And add to `frontend/jest.config.js`:
```javascript
module.exports = {
  // ... existing config
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^socket.io-client$': '<rootDir>/src/__mocks__/socket.io-client.ts',
  },
};
```

#### Issue 4: Missing Jest Setup File

**Files affected:** All frontend tests

**Fix:** Create Jest setup file.

**Solution:** Create `frontend/jest.setup.js`:

```javascript
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

### Step 3: Update Test Files

#### Fix 1: Update ApprovalService Test

**File:** `backend/src/common/services/approval.service.spec.ts`

**Change line 2:**
```typescript
// Before
import { EventEmitter2 } from '@nestjs/event-emitter';

// After (if package not installed, use mock)
import { EventEmitter2 } from '@nestjs/event-emitter';
// OR create a mock if package installation fails
```

#### Fix 2: Update Frontend Test Imports

**Files:** 
- `frontend/src/components/__tests__/ApprovalDialog.test.tsx`
- `frontend/src/components/__tests__/TaskProgressBar.test.tsx`

**Add at the top:**
```typescript
// Mock UI components
jest.mock('../ui/dialog');
jest.mock('../ui/button');
jest.mock('../ui/input');
jest.mock('../ui/checkbox');
jest.mock('../ui/badge');
jest.mock('../ui/progress');
```

### Step 4: Run Tests

Once all fixes are applied:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Specific test file
npm test approval.service.spec.ts

# With coverage
npm test -- --coverage
```

## 🐛 Expected Issues and Solutions

### Issue 1: "Cannot find module '@nestjs/event-emitter'"

**Solution:**
```bash
cd backend
npm install @nestjs/event-emitter
```

### Issue 2: "Cannot find module 'socket.io-client'"

**Solution:**
```bash
cd frontend
npm install socket.io-client
```

### Issue 3: UI component imports fail

**Solution:** Either:
- Install shadcn/ui components: `npx shadcn-ui@latest add dialog button input checkbox badge progress`
- OR use the mocks provided above

### Issue 4: Tests timeout

**Solution:** Increase timeout in test files:
```typescript
it('should do something', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Issue 5: "ReferenceError: TextEncoder is not defined"

**Solution:** Add to `jest.setup.js`:
```javascript
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;
```

## 📝 Manual Test Execution Checklist

Since I cannot run the tests, please follow this checklist:

### Backend Tests

- [ ] Install dependencies: `cd backend && npm install`
- [ ] Install EventEmitter: `npm install @nestjs/event-emitter`
- [ ] Run approval service tests: `npm test approval.service.spec.ts`
  - Expected: 25+ tests pass
- [ ] Run MCP service tests: `npm test mcp.service.spec.ts`
  - Expected: 20+ tests pass
- [ ] Run ReACT service tests: `npm test react-agent.service.spec.ts`
  - Expected: 15+ tests pass
- [ ] Run all backend tests: `npm test`
  - Expected: 60+ tests pass

### Frontend Tests

- [ ] Install dependencies: `cd frontend && npm install`
- [ ] Install testing libraries: `npm install --save-dev @testing-library/react @testing-library/jest-dom`
- [ ] Create UI component mocks (see above)
- [ ] Create socket.io-client mock (see above)
- [ ] Create jest.setup.js (see above)
- [ ] Run ApprovalDialog tests: `npm test ApprovalDialog.test.tsx`
  - Expected: 30+ tests pass
- [ ] Run TaskProgressBar tests: `npm test TaskProgressBar.test.tsx`
  - Expected: 35+ tests pass
- [ ] Run useApprovalWorkflow tests: `npm test useApprovalWorkflow.test.ts`
  - Expected: 20+ tests pass
- [ ] Run all frontend tests: `npm test`
  - Expected: 85+ tests pass

### Integration Tests

- [ ] Setup test environment
- [ ] Run integration tests: `npm test tests/integration`
  - Expected: 15+ tests pass

## 🔍 Debugging Failed Tests

If tests fail, check:

1. **Import errors:** Verify all imports are correct
2. **Mock issues:** Ensure mocks are properly configured
3. **Async issues:** Check for missing `await` or `async`
4. **Timeout issues:** Increase timeout for slow tests
5. **Type errors:** Verify TypeScript types match

## 📊 Expected Test Results

After all fixes:

```
Backend Tests:
  ✓ approval.service.spec.ts (25 tests)
  ✓ mcp.service.spec.ts (20 tests)
  ✓ react-agent.service.spec.ts (15 tests)
  Total: 60+ tests passing

Frontend Tests:
  ✓ ApprovalDialog.test.tsx (30 tests)
  ✓ TaskProgressBar.test.tsx (35 tests)
  ✓ useApprovalWorkflow.test.ts (20 tests)
  Total: 85+ tests passing

Integration Tests:
  ✓ approval-workflow.integration.test.ts (15 tests)
  Total: 15+ tests passing

Overall: 145+ tests passing
```

## 🚀 Quick Start Script

Create this script to automate setup:

```bash
#!/bin/bash
# setup-tests.sh

echo "Setting up test environment..."

# Backend
cd backend
echo "Installing backend dependencies..."
npm install @nestjs/event-emitter

# Frontend
cd ../frontend
echo "Installing frontend dependencies..."
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Create mocks
echo "Creating UI component mocks..."
mkdir -p src/components/ui/__mocks__
# ... create mock files

echo "Setup complete! Run 'npm test' to execute tests."
```

## 📞 Next Steps

1. Run the setup steps above
2. Execute tests and note any failures
3. Share the error messages with me
4. I'll provide specific fixes for each failure

Would you like me to:
- Create the mock files for you?
- Update the test files with the fixes?
- Create a setup script?
- Provide more detailed debugging steps?

---

**Note:** I cannot execute npm/jest commands directly, but I can help you fix any issues you encounter when running the tests yourself.
