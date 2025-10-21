# Interactive Approval & Task Planning System

## Overview

This document describes the comprehensive interactive approval workflow and task planning system implemented for AgentDB9. The system adds user confirmation for risky operations, task milestone tracking, and real-time progress streaming.

## Features Implemented

### ✅ 1. Interactive Approval Workflow

**Command Execution Approval:**
- Automatic risk assessment (low, medium, high, critical)
- User confirmation before executing terminal commands
- Command modification capability
- Estimated duration display
- Affected files preview

**Dependency Installation Approval:**
- Package list preview before installation
- Selective package installation
- Package size and description display
- Support for npm, yarn, pnpm, and bun

**File Operation Approval:**
- Confirmation for file deletions
- Content preview for file operations
- Path modification for move operations

**Git Operation Approval:**
- Confirmation for git push, commit, reset
- Branch and commit message display
- Files affected preview

### ✅ 2. Task Planning & Milestone System

**Automatic Task Breakdown:**
- LLM-generated task plans for complex operations
- 3-7 milestones per task
- Clear milestone descriptions and types
- Tool usage prediction per milestone

**Milestone Types:**
- `analysis` - Code analysis and planning
- `file_operation` - File creation, modification, deletion
- `command_execution` - Terminal commands
- `validation` - Testing and verification
- `git_operation` - Git commands

**Progress Tracking:**
- Real-time milestone status updates
- Percentage completion
- Current step / total steps
- Time estimates

### ✅ 3. Enhanced Progress Streaming

**Task Progress Updates:**
- `plan` - Initial task plan broadcast
- `milestone_start` - Milestone begins
- `milestone_progress` - Milestone in progress
- `milestone_complete` - Milestone completed
- `tool_execution` - Tool being executed
- `approval_required` - Waiting for user approval
- `final_answer` - Task completed

**WebSocket Events:**
- `approval_request` - Approval needed
- `approval_response` - User's decision
- `task_progress` - Progress updates
- `message_update` - Message streaming

## Architecture

### Backend Components

#### 1. Approval Service (`backend/src/common/services/approval.service.ts`)
- Manages approval requests and responses
- Risk assessment for commands
- Timeout handling
- Approval preference management

#### 2. Enhanced MCP Service (`backend/src/mcp/mcp.service.ts`)
- Integrated approval workflow
- Command risk detection
- Dependency extraction and approval
- Context-aware tool execution

#### 3. Enhanced ReACT Service (`backend/src/conversations/react-agent.service.ts`)
- Task plan generation
- Milestone tracking
- Progress streaming
- Tool execution with approval

#### 4. WebSocket Gateway (`backend/src/websocket/websocket.gateway.ts`)
- Approval request broadcasting
- Task progress streaming
- Approval response handling

#### 5. Approval WebSocket Listener (`backend/src/websocket/approval-websocket.listener.ts`)
- Event-driven approval workflow
- Connects approval service to WebSocket

### Frontend Components

#### 1. ApprovalDialog (`frontend/src/components/ApprovalDialog.tsx`)
- Interactive approval UI
- Command modification
- Package selection
- Risk indicators
- Remember choice option

#### 2. TaskProgressBar (`frontend/src/components/TaskProgressBar.tsx`)
- Visual milestone progress
- Status indicators
- Tool usage display
- Error handling

#### 3. useApprovalWorkflow Hook (`frontend/src/hooks/useApprovalWorkflow.ts`)
- WebSocket connection management
- Approval request handling
- Task progress tracking
- State management

## Data Flow

### Approval Workflow

```
User Message
    ↓
ReACT Loop detects tool call
    ↓
MCP Service checks if approval needed
    ↓
Approval Service creates request
    ↓
Event emitted: 'approval.request'
    ↓
WebSocket Listener broadcasts to frontend
    ↓
Frontend displays ApprovalDialog
    ↓
User approves/rejects
    ↓
Frontend emits 'approval_response'
    ↓
Approval Service resolves promise
    ↓
MCP Service executes tool (if approved)
    ↓
Result returned to ReACT Loop
```

### Task Planning Flow

```
User Message (complex task detected)
    ↓
ReACT Service generates task plan
    ↓
Task plan broadcast via WebSocket
    ↓
Frontend displays TaskProgressBar
    ↓
For each milestone:
    - Update status to 'in_progress'
    - Broadcast milestone_start
    - Execute tools (with approval if needed)
    - Broadcast milestone_complete
    ↓
Final answer returned
```

## Usage Examples

### Backend: Executing Tool with Approval

```typescript
const toolResult = await this.mcpService.executeTool(
  {
    name: 'execute_command',
    arguments: { command: 'npm install react' }
  },
  workingDir,
  {
    conversationId: 'conv_123',
    agentId: 'agent_456',
    requireApproval: true
  }
);
```

### Frontend: Using Approval Workflow

```typescript
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { ApprovalDialog } from '@/components/ApprovalDialog';
import { TaskProgressBar } from '@/components/TaskProgressBar';

function ChatInterface({ conversationId }) {
  const {
    pendingApproval,
    taskProgress,
    currentTaskPlan,
    approveRequest,
    rejectRequest,
    isConnected
  } = useApprovalWorkflow(conversationId);

  return (
    <>
      {/* Task Progress */}
      {currentTaskPlan && (
        <TaskProgressBar
          taskPlan={currentTaskPlan}
          percentage={taskProgress?.percentage}
        />
      )}

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
```

## Configuration

### Risk Assessment Patterns

Commands are automatically assessed for risk level:

**Critical Risk:**
- `rm -rf /`
- `sudo rm`
- `format`
- `dd if=`

**High Risk:**
- `npm install -g`
- `npx create-*`
- `git push --force`
- `docker run`
- `chmod 777`

**Medium Risk:**
- `npm install`
- `yarn add`
- `git push`
- `git reset`
- `npm run build`

**Low Risk:**
- Read operations
- List operations
- Status checks

### Approval Timeouts

- Command execution: 60 seconds
- Dependency installation: 90 seconds
- File operations: 45 seconds
- Git operations: 60 seconds

## API Reference

### Approval Interfaces

```typescript
interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  conversationId: string;
  agentId: string;
  timestamp: Date;
  risk: RiskLevel;
  reason: string;
  timeout?: number;
}

interface ApprovalResponse {
  requestId: string;
  status: ApprovalStatus;
  timestamp: Date;
  modifiedCommand?: string;
  selectedPackages?: string[];
  comment?: string;
  rememberChoice?: boolean;
}
```

### Task Planning Interfaces

```typescript
interface TaskPlan {
  id: string;
  objective: string;
  description: string;
  milestones: TaskMilestone[];
  estimatedSteps: number;
  estimatedDuration?: string;
  requiresApproval: boolean;
  createdAt: Date;
}

interface TaskMilestone {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'analysis' | 'file_operation' | 'command_execution' | 'validation' | 'git_operation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  requiresApproval: boolean;
  tools: string[];
  result?: any;
  error?: string;
}
```

### WebSocket Events

**Server → Client:**
- `approval_request` - Approval needed
- `task_progress` - Progress update
- `message_update` - Message streaming

**Client → Server:**
- `approval_response` - User's decision
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room

## Testing

### Manual Testing Checklist

**Command Approval:**
- [ ] Test npm install approval
- [ ] Test command modification
- [ ] Test approval rejection
- [ ] Test approval timeout
- [ ] Test low-risk command (no approval)

**Dependency Approval:**
- [ ] Test package selection
- [ ] Test select all/deselect all
- [ ] Test partial package installation

**Task Planning:**
- [ ] Test task plan generation
- [ ] Test milestone progress updates
- [ ] Test milestone completion
- [ ] Test milestone failure handling

**Progress Streaming:**
- [ ] Test real-time progress updates
- [ ] Test WebSocket reconnection
- [ ] Test multiple concurrent approvals

## Future Enhancements

### Planned Features

1. **Approval Preferences:**
   - Remember user choices
   - Whitelist trusted commands
   - Auto-approve specific packages

2. **Enhanced Task Planning:**
   - Dependency graph visualization
   - Parallel milestone execution
   - Checkpoint/resume capability

3. **Advanced Progress Tracking:**
   - Time remaining estimates
   - Resource usage monitoring
   - Performance metrics

4. **Rollback Capability:**
   - Undo operations
   - Restore previous state
   - Transaction-like execution

5. **Approval History:**
   - View past approvals
   - Audit trail
   - Analytics and insights

## Troubleshooting

### Common Issues

**Approval Dialog Not Appearing:**
- Check WebSocket connection
- Verify conversationId is passed to hook
- Check browser console for errors

**Task Progress Not Updating:**
- Verify WebSocket events are being received
- Check task plan generation in backend logs
- Ensure progressCallback is properly wired

**Approval Timeout:**
- Increase timeout in approval service
- Check network latency
- Verify WebSocket connection stability

## Migration Guide

### Existing Code Updates

**Before:**
```typescript
await this.mcpService.executeTool(toolCall, workingDir);
```

**After:**
```typescript
await this.mcpService.executeTool(
  toolCall,
  workingDir,
  {
    conversationId,
    agentId,
    requireApproval: true
  }
);
```

## Performance Considerations

- Approval requests are non-blocking
- Task plans are cached during execution
- WebSocket events are batched when possible
- Timeout handling prevents hanging operations
- Memory-efficient milestone tracking

## Security

- Risk assessment prevents dangerous commands
- User confirmation for all high-risk operations
- Command modification is sanitized
- Approval timeouts prevent indefinite waiting
- Audit trail for all approvals

## Conclusion

The Interactive Approval & Task Planning System provides a comprehensive solution for safe, transparent, and user-controlled agent operations. It ensures users maintain control over critical operations while providing clear visibility into task progress and execution flow.

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-19  
**Status:** ✅ Implemented
