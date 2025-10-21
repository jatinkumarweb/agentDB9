# Running Tests in Gitpod Environment

## Current Situation

I'm unable to directly execute npm/node commands in the current shell environment. This appears to be because:
1. The dev container may not be fully initialized
2. Node.js is not available in the current shell context
3. I may need to execute commands within the dev container

## ✅ Solution: Run Tests Manually

Since I cannot execute the tests directly, please follow these steps to run them yourself in the Gitpod environment:

### Step 1: Ensure Dev Container is Running

The project uses a dev container with Node.js 22. Make sure you're working inside the dev container:

```bash
# Check if Node.js is available
node --version
npm --version

# If not available, rebuild the dev container
# In VS Code: Cmd/Ctrl + Shift + P -> "Dev Containers: Rebuild Container"
```

### Step 2: Install Missing Dependencies

```bash
# Install EventEmitter for backend
cd backend
npm install @nestjs/event-emitter

# Install testing libraries for frontend
cd ../frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Step 3: Create Required Mock Files

#### Frontend UI Component Mocks

Create `frontend/src/components/ui/__mocks__/dialog.tsx`:
```typescript
import React from 'react';

export const Dialog = ({ children, open, onOpenChange }: any) => 
  open ? <div role="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null;

export const DialogContent = ({ children }: any) => <div>{children}</div>;
export const DialogHeader = ({ children }: any) => <div>{children}</div>;
export const DialogTitle = ({ children }: any) => <h2>{children}</h2>;
export const DialogDescription = ({ children }: any) => <p>{children}</p>;
export const DialogFooter = ({ children }: any) => <div>{children}</div>;
```

Create `frontend/src/components/ui/__mocks__/button.tsx`:
```typescript
import React from 'react';

export const Button = ({ children, onClick, disabled, variant, size, ...props }: any) => (
  <button onClick={onClick} disabled={disabled} {...props}>
    {children}
  </button>
);
```

Create `frontend/src/components/ui/__mocks__/input.tsx`:
```typescript
import React from 'react';

export const Input = (props: any) => <input {...props} />;
```

Create `frontend/src/components/ui/__mocks__/checkbox.tsx`:
```typescript
import React from 'react';

export const Checkbox = ({ checked, onCheckedChange, ...props }: any) => (
  <input 
    type="checkbox" 
    role="checkbox"
    checked={checked} 
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...props}
  />
);
```

Create `frontend/src/components/ui/__mocks__/badge.tsx`:
```typescript
import React from 'react';

export const Badge = ({ children, className, variant }: any) => (
  <span className={className}>{children}</span>
);
```

Create `frontend/src/components/ui/__mocks__/progress.tsx`:
```typescript
import React from 'react';

export const Progress = ({ value, className }: any) => (
  <div role="progressbar" aria-valuenow={value} className={className}>
    {value}%
  </div>
);
```

#### Socket.io Mock

Create `frontend/src/__mocks__/socket.io-client.ts`:
```typescript
export const io = jest.fn(() => ({
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
}));
```

#### Jest Setup File

Create `frontend/jest.setup.js`:
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

// Mock UI components
jest.mock('./src/components/ui/dialog');
jest.mock('./src/components/ui/button');
jest.mock('./src/components/ui/input');
jest.mock('./src/components/ui/checkbox');
jest.mock('./src/components/ui/badge');
jest.mock('./src/components/ui/progress');
```

#### Update Frontend Jest Config

Update `frontend/jest.config.js` (or create if it doesn't exist):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^socket.io-client$': '<rootDir>/src/__mocks__/socket.io-client.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
```

### Step 4: Run Backend Tests

```bash
cd backend

# Run all backend tests
npm test

# Or run specific test files
npm test approval.service.spec.ts
npm test mcp.service.spec.ts
npm test react-agent.service.spec.ts

# Run with coverage
npm test -- --coverage
```

### Step 5: Run Frontend Tests

```bash
cd frontend

# Run all frontend tests
npm test

# Or run specific test files
npm test ApprovalDialog.test.tsx
npm test TaskProgressBar.test.tsx
npm test useApprovalWorkflow.test.ts

# Run with coverage
npm test -- --coverage
```

### Step 6: Run Integration Tests

```bash
# From project root
npm test tests/integration/approval-workflow.integration.test.ts
```

## Expected Results

### Backend Tests
```
PASS  src/common/services/approval.service.spec.ts
  ApprovalService
    Risk Assessment
      ✓ should assess critical risk for dangerous commands
      ✓ should assess high risk for potentially dangerous commands
      ✓ should assess medium risk for common operations
      ✓ should assess low risk for safe commands
    Command Approval
      ✓ should request command approval and emit event
      ✓ should handle approval rejection
      ... (25+ tests total)

PASS  src/mcp/mcp.service.spec.ts
  MCPService - Approval Integration
    Command Execution with Approval
      ✓ should execute low-risk command without approval
      ✓ should request approval for high-risk command
      ... (20+ tests total)

PASS  src/conversations/react-agent.service.spec.ts
  ReActAgentService - Task Planning
    Task Plan Generation
      ✓ should generate task plan for complex tasks
      ✓ should not generate task plan for simple queries
      ... (15+ tests total)

Test Suites: 3 passed, 3 total
Tests:       60+ passed, 60+ total
```

### Frontend Tests
```
PASS  src/components/__tests__/ApprovalDialog.test.tsx
  ApprovalDialog
    Command Execution Approval
      ✓ should render command approval dialog
      ✓ should display risk badge
      ... (30+ tests total)

PASS  src/components/__tests__/TaskProgressBar.test.tsx
  TaskProgressBar
    Header Section
      ✓ should render task objective
      ✓ should render task description
      ... (35+ tests total)

PASS  src/hooks/__tests__/useApprovalWorkflow.test.ts
  useApprovalWorkflow
    Socket Connection
      ✓ should connect to backend on mount
      ✓ should join conversation room when conversationId is provided
      ... (20+ tests total)

Test Suites: 3 passed, 3 total
Tests:       85+ passed, 85+ total
```

## Troubleshooting

### Issue: "Cannot find module '@nestjs/event-emitter'"

**Solution:**
```bash
cd backend
npm install @nestjs/event-emitter
```

### Issue: "Cannot find module 'socket.io-client'"

**Solution:**
```bash
cd frontend
npm install socket.io-client
```

### Issue: UI component imports fail

**Solution:** Use the mock files created in Step 3 above.

### Issue: Tests timeout

**Solution:** Some tests have longer timeouts (10-65 seconds). This is expected for approval timeout tests.

### Issue: "TextEncoder is not defined"

**Solution:** Add to `frontend/jest.setup.js`:
```javascript
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```

## Quick Setup Script

Create and run this script to automate the setup:

```bash
#!/bin/bash
# setup-tests.sh

echo "🔧 Setting up test environment..."

# Backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install @nestjs/event-emitter

# Frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Create mock directories
echo "📁 Creating mock directories..."
mkdir -p src/components/ui/__mocks__
mkdir -p src/__mocks__

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create the mock files (see RUN_TESTS_IN_GITPOD.md)"
echo "2. Run: cd backend && npm test"
echo "3. Run: cd frontend && npm test"
```

Make it executable and run:
```bash
chmod +x setup-tests.sh
./setup-tests.sh
```

## Reporting Results

After running the tests, please share:

1. **Test output** - Copy the full test results
2. **Any failures** - Include error messages and stack traces
3. **Coverage report** - Run with `--coverage` flag

I can then help fix any failing tests or issues you encounter.

## Alternative: Use Docker

If you prefer to run tests in a clean environment:

```bash
# Build and run tests in Docker
docker-compose run backend npm test
docker-compose run frontend npm test
```

---

**Note:** I cannot execute these commands directly due to environment limitations, but you can run them in your Gitpod workspace terminal. Please share the results and I'll help fix any issues!
