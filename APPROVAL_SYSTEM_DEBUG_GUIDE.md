# Approval System Debug Guide

## Issue
User reports not seeing approval dialogs for critical terminal commands and interactivity changes.

## System Architecture

### Backend Flow
1. **MCPService** (`backend/src/mcp/mcp.service.ts`)
   - Receives tool execution requests
   - Checks if approval is required via `checkAndRequestApproval()`
   - Calls ApprovalService to request approval

2. **ApprovalService** (`backend/src/common/services/approval.service.ts`)
   - Assesses risk level of operations
   - Creates approval requests
   - Emits `approval.request` event via EventEmitter
   - Waits for user response (with timeout)

3. **ApprovalWebSocketListener** (`backend/src/websocket/approval-websocket.listener.ts`)
   - Listens for `approval.request` events
   - Broadcasts to WebSocket clients via `WebSocketGateway`

4. **WebSocketGateway** (`backend/src/websocket/websocket.gateway.ts`)
   - Broadcasts `approval_request` event to conversation room
   - Listens for `approval_response` from frontend

### Frontend Flow
1. **WebSocket Connection** (should be in chat page)
   - Connects to WebSocket server
   - Joins conversation room
   - Listens for `approval_request` events

2. **ApprovalDialog Component** (`frontend/src/components/ApprovalDialog.tsx`)
   - Displays approval UI when request received
   - Shows command/operation details
   - Allows approve/reject/modify

3. **useApprovalWorkflow Hook** (`frontend/src/hooks/useApprovalWorkflow.ts`)
   - Manages approval state
   - Sends approval responses back via WebSocket

## Test Results

### Working ✅
- Basic approval request/response flow
- Command rejection
- Modified command execution
- Approval bypass when disabled

### Issues Found ❌
1. **Dev dependency detection** - Not properly identifying `--save-dev` flag
2. **Git operation approval** - Not triggering for git commands
3. **Timeout message** - Returns "Approval timeout" instead of "rejected"

## Debugging Steps

### 1. Check if Approval Requests are Being Created

Add logging in `MCPService.checkAndRequestApproval()`:

```typescript
console.log('🔔 [APPROVAL] Checking approval for:', toolCall.name);
console.log('🔔 [APPROVAL] Context:', { conversationId, agentId, requireApproval });
```

### 2. Check if Events are Being Emitted

Add logging in `ApprovalService.requestApproval()`:

```typescript
console.log('📢 [APPROVAL] Emitting approval.request event:', request.id);
this.eventEmitter.emit('approval.request', request);
console.log('📢 [APPROVAL] Event emitted');
```

### 3. Check if WebSocket is Broadcasting

Add logging in `ApprovalWebSocketListener.handleApprovalRequest()`:

```typescript
console.log('📡 [WEBSOCKET] Received approval.request event:', request.id);
console.log('📡 [WEBSOCKET] Broadcasting to conversation:', request.conversationId);
```

### 4. Check Frontend WebSocket Connection

In browser console:
```javascript
// Check if WebSocket is connected
console.log('WebSocket connected:', socket?.connected);

// Listen for approval requests
socket?.on('approval_request', (data) => {
  console.log('🔔 Received approval request:', data);
});
```

### 5. Check if Frontend is Listening

In chat page component:
```typescript
useEffect(() => {
  if (!socket) return;
  
  console.log('Setting up approval listener for conversation:', conversationId);
  
  socket.on('approval_request', (data) => {
    console.log('🔔 [FRONTEND] Approval request received:', data);
  });
  
  return () => {
    socket.off('approval_request');
  };
}, [socket, conversationId]);
```

## Common Issues

### Issue 1: WebSocket Not Connected
**Symptom**: Approval requests created but not received by frontend
**Check**: 
- Browser console for WebSocket connection errors
- Backend logs for WebSocket connection events
**Fix**: Ensure WebSocket connection is established before sending messages

### Issue 2: Not Joined to Conversation Room
**Symptom**: Events broadcast but not received by specific client
**Check**: 
- Backend logs for room join events
- Verify `socket.join('conversation_${conversationId}')` is called
**Fix**: Ensure client joins conversation room on connection

### Issue 3: Frontend Not Listening
**Symptom**: Events received but no UI shown
**Check**:
- Browser console for event logs
- Verify `useApprovalWorkflow` hook is active
**Fix**: Ensure ApprovalDialog component is rendered and listening

### Issue 4: Approval Service Not Injected
**Symptom**: Approval requests never created
**Check**:
- MCPService constructor has ApprovalService injected
- CommonModule exports ApprovalService
**Fix**: Verify dependency injection setup

## Testing Approval Flow

### Manual Test
1. Start backend: `cd backend && npm run start:dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser console
4. Create a conversation
5. Send message: "run npm install express"
6. Check console for approval request logs
7. Verify approval dialog appears

### Automated Test
```bash
cd backend
npm test -- mcp-approval-flow.spec.ts
```

Expected: 12/12 tests passing

## Configuration

### Enable/Disable Approval
In `MCPService.executeTool()`:
```typescript
// Disable approval for testing
await service.executeTool(toolCall, workingDir, {
  conversationId: 'test',
  agentId: 'test',
  requireApproval: false, // Set to false to bypass
});
```

### Adjust Timeout
In `ApprovalService`:
```typescript
timeout: 60000, // 60 seconds (adjust as needed)
```

## Risk Assessment

Commands are categorized by risk level:

### CRITICAL (Always requires approval)
- `rm -rf /`
- `sudo rm`
- `format`
- `dd if=`

### HIGH (Requires approval)
- `npm install -g`
- `npx create-*`
- `git push --force`
- `docker run`
- `chmod 777`
- `rm -rf`

### MEDIUM (Requires approval)
- `npm install`
- `git push`
- `git commit`
- File deletions

### LOW (May not require approval)
- `npm run`
- `git status`
- File reads
- Directory listings

## Next Steps

1. ✅ Verify approval system is properly wired up (DONE - tests show it works)
2. ⚠️ Check if WebSocket connection is established in frontend
3. ⚠️ Verify ApprovalDialog component is rendered
4. ⚠️ Add logging to track approval flow end-to-end
5. ⚠️ Test with real conversation to see if UI appears

## Expected Behavior

When agent tries to run a critical command:
1. Backend creates approval request
2. Backend emits event
3. WebSocket broadcasts to frontend
4. Frontend shows approval dialog
5. User approves/rejects
6. Frontend sends response via WebSocket
7. Backend receives response
8. Command executes or is rejected

## Current Status

✅ Backend approval system implemented and tested
✅ WebSocket broadcasting configured
✅ Frontend components created (ApprovalDialog, useApprovalWorkflow)
⚠️ Need to verify frontend integration
⚠️ Need to add comprehensive logging
⚠️ Need to test end-to-end flow
