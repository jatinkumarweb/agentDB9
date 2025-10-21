# Integration Guide - Interactive Approval System

## Quick Start

This guide shows how to integrate the interactive approval system into your chat interface.

## Step 1: Install Dependencies (If Needed)

The system uses existing dependencies. Verify these are installed:

```bash
# Backend
cd backend
npm install @nestjs/event-emitter

# Frontend (should already have these)
cd frontend
# socket.io-client, lucide-react, etc. already installed
```

## Step 2: Backend Setup (Already Done ✅)

The backend is fully integrated. No additional steps needed.

**What's already configured:**
- ✅ Approval service registered in `common.module.ts`
- ✅ MCP service integrated with approval workflow
- ✅ ReACT service with task planning
- ✅ WebSocket events for approval and progress
- ✅ Event listener connecting approval to WebSocket

## Step 3: Frontend Integration

### Option A: Add to Existing Chat Component

If you have an existing chat component (e.g., `ChatInterface.tsx`):

```typescript
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { ApprovalDialog } from '@/components/ApprovalDialog';
import { TaskProgressBar } from '@/components/TaskProgressBar';

function ChatInterface({ conversationId }: { conversationId: string }) {
  // Your existing state and hooks
  const [messages, setMessages] = useState([]);
  
  // Add approval workflow hook
  const {
    pendingApproval,
    taskProgress,
    currentTaskPlan,
    approveRequest,
    rejectRequest,
    isConnected,
  } = useApprovalWorkflow(conversationId);

  return (
    <div className="chat-container">
      {/* Add Task Progress Bar */}
      {currentTaskPlan && (
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <TaskProgressBar
            taskPlan={currentTaskPlan}
            percentage={taskProgress?.percentage}
          />
        </div>
      )}

      {/* Your existing chat UI */}
      <div className="messages">
        {messages.map(msg => (
          <MessageComponent key={msg.id} message={msg} />
        ))}
      </div>

      {/* Add Approval Dialog */}
      <ApprovalDialog
        request={pendingApproval}
        open={!!pendingApproval}
        onApprove={approveRequest}
        onReject={rejectRequest}
      />
    </div>
  );
}
```

### Option B: Create New Wrapper Component

Create a new component that wraps your chat:

```typescript
// components/InteractiveChatWrapper.tsx
import React from 'react';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { ApprovalDialog } from '@/components/ApprovalDialog';
import { TaskProgressBar } from '@/components/TaskProgressBar';

interface InteractiveChatWrapperProps {
  conversationId: string;
  children: React.ReactNode;
}

export function InteractiveChatWrapper({ 
  conversationId, 
  children 
}: InteractiveChatWrapperProps) {
  const {
    pendingApproval,
    taskProgress,
    currentTaskPlan,
    approveRequest,
    rejectRequest,
  } = useApprovalWorkflow(conversationId);

  return (
    <>
      {/* Task Progress */}
      {currentTaskPlan && (
        <div className="mb-4">
          <TaskProgressBar
            taskPlan={currentTaskPlan}
            percentage={taskProgress?.percentage}
          />
        </div>
      )}

      {/* Original Chat UI */}
      {children}

      {/* Approval Dialog */}
      <ApprovalDialog
        request={pendingApproval}
        open={!!pendingApproval}
        onApprove={approveRequest}
        onReject={rejectRequest}
      />
    </>
  );
}

// Usage:
<InteractiveChatWrapper conversationId={conversationId}>
  <YourExistingChatComponent />
</InteractiveChatWrapper>
```

## Step 4: Verify UI Components Exist

Make sure you have the required UI components. If not, install shadcn/ui:

```bash
# If you don't have these components
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
```

## Step 5: Test the Integration

### Test 1: Command Approval

```
User: "Install express"
Expected:
1. Task plan appears (if complex task)
2. Approval dialog shows: "npm install express"
3. User clicks "Approve"
4. Command executes
5. Progress updates in real-time
```

### Test 2: Dependency Selection

```
User: "Install react, vue, and angular"
Expected:
1. Approval dialog shows 3 packages
2. All packages checked by default
3. User unchecks "angular"
4. User clicks "Approve"
5. Only react and vue installed
```

### Test 3: Task Planning

```
User: "Create a React app with TypeScript"
Expected:
1. Task plan appears with milestones:
   - Initialize project structure
   - Install dependencies
   - Configure TypeScript
   - Create components
   - Verify setup
2. Progress bar shows 0%
3. Each milestone updates in real-time
4. Approval requested for risky operations
```

### Test 4: Approval Rejection

```
User: "Delete all files in the project"
Expected:
1. Approval dialog shows HIGH RISK badge
2. Warning message displayed
3. User clicks "Reject"
4. Operation cancelled
5. Agent responds: "Operation rejected by user"
```

## Step 6: Customize (Optional)

### Adjust Risk Levels

Edit `backend/src/common/services/approval.service.ts`:

```typescript
private assessCommandRisk(command: string): RiskLevel {
  // Add your custom patterns
  const customHighRisk = [
    /your-custom-pattern/,
  ];
  
  if (customHighRisk.some(pattern => pattern.test(command))) {
    return RiskLevel.HIGH;
  }
  
  // ... existing logic
}
```

### Adjust Timeouts

Edit `backend/src/common/services/approval.service.ts`:

```typescript
async requestCommandApproval(...) {
  const request: CommandApprovalRequest = {
    // ...
    timeout: 120000, // Change to 2 minutes
  };
}
```

### Customize UI

Edit `frontend/src/components/ApprovalDialog.tsx`:

```typescript
// Change colors, layout, add custom fields, etc.
```

## Step 7: Monitor and Debug

### Backend Logs

Watch for these log messages:

```
🔧 Executing MCP tool: execute_command
⏸️ Requesting approval for command: npm install express
✅ Approval approved for request req_123
✅ Tool execute_command completed in 2500ms
```

### Frontend Console

Watch for these messages:

```
Connected to backend for approval workflow
Approval request received: { id: 'req_123', type: 'command_execution', ... }
Approving request: req_123
Task progress update: { type: 'milestone_complete', ... }
```

### WebSocket Events

Monitor WebSocket traffic in browser DevTools:

```
← approval_request
→ approval_response
← task_progress
← message_update
```

## Common Issues

### Issue 1: Approval Dialog Not Appearing

**Symptoms:** Command executes without approval

**Solutions:**
1. Check WebSocket connection: `isConnected` should be `true`
2. Verify `conversationId` is passed to `useApprovalWorkflow`
3. Check browser console for errors
4. Verify backend logs show approval request

### Issue 2: Task Progress Not Updating

**Symptoms:** Progress bar doesn't update

**Solutions:**
1. Check WebSocket events in DevTools
2. Verify `task_progress` events are being received
3. Check `currentTaskPlan` state in React DevTools
4. Verify backend is emitting progress updates

### Issue 3: Approval Timeout

**Symptoms:** Operation cancelled after 60 seconds

**Solutions:**
1. Increase timeout in `approval.service.ts`
2. Check network latency
3. Verify WebSocket connection is stable

### Issue 4: Commands Execute Without Approval

**Symptoms:** High-risk commands run immediately

**Solutions:**
1. Check risk assessment in `approval.service.ts`
2. Verify `requireApproval: true` is passed to `executeTool`
3. Check if command matches risk patterns
4. Review backend logs for approval flow

## Advanced Usage

### Remember User Choices

Future enhancement - store user preferences:

```typescript
// In approval.service.ts
interface ApprovalPreferences {
  userId: string;
  autoApproveCommands: string[];
  autoApproveDependencies: string[];
}

// Check preferences before requesting approval
if (this.shouldAutoApprove(command, userId)) {
  return { approved: true };
}
```

### Parallel Milestone Execution

Future enhancement - execute independent milestones in parallel:

```typescript
// In react-agent.service.ts
const independentMilestones = taskPlan.milestones.filter(
  m => !m.dependencies || m.dependencies.length === 0
);

await Promise.all(
  independentMilestones.map(m => this.executeMilestone(m))
);
```

### Rollback Capability

Future enhancement - undo operations:

```typescript
// Store operation history
interface OperationHistory {
  operation: string;
  rollbackCommand: string;
  timestamp: Date;
}

// Rollback function
async rollback(operationId: string) {
  const operation = this.history.get(operationId);
  await this.executeTool({ 
    name: 'execute_command', 
    arguments: { command: operation.rollbackCommand } 
  });
}
```

## Performance Considerations

- Approval requests are non-blocking
- Task plans are cached during execution
- WebSocket events are batched when possible
- Timeout handling prevents hanging operations
- Memory-efficient milestone tracking

## Security Notes

- All high-risk commands require approval
- Command modification is sanitized
- Approval timeouts prevent indefinite waiting
- Audit trail for all approvals (future enhancement)
- User preferences stored securely (future enhancement)

## Next Steps

1. ✅ Integrate components into chat interface
2. ✅ Test with various commands and operations
3. ✅ Customize risk levels and timeouts as needed
4. ✅ Monitor logs and WebSocket events
5. ✅ Gather user feedback
6. ⚠️ Implement approval preferences (optional)
7. ⚠️ Add approval history view (optional)
8. ⚠️ Implement rollback capability (optional)

## Support

For issues or questions:
1. Check `INTERACTIVE_APPROVAL_SYSTEM.md` for detailed documentation
2. Review `INTERACTIVE_IMPROVEMENTS_SUMMARY.md` for feature overview
3. Check backend logs for approval flow
4. Monitor WebSocket events in browser DevTools

---

**Status:** Ready for integration  
**Estimated Integration Time:** 15-30 minutes  
**Difficulty:** Easy (copy-paste integration)
