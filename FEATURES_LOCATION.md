# Feature Locations in AgentDB9

## Important: Different Pages Have Different Features

### `/chat` Page - Agent Chat Interface
**Location:** `frontend/src/app/chat/page.tsx`

**Features Available:**
- ✅ **Message Feedback System** - Rate agent responses (negative/neutral/positive)
  - Shows on agent messages after they complete
  - Located below each agent message
  - Three buttons: 👎 (negative), ➖ (neutral), 👍 (positive)

- ✅ **Approval System** - Approve/reject agent actions
  - Shows as modal dialog when agent requests approval
  - Appears when agent wants to execute commands or make changes
  - Has "Approve" and "Reject" buttons

- ✅ **Task Progress Bar** - Shows agent task progress
  - Displays at bottom of screen during task execution
  - Shows current step and overall progress
  - Updates in real-time via WebSocket

**How to Access:**
1. Navigate to: `http://localhost:3000/chat`
2. Select or create an agent
3. Start a conversation
4. Features will appear as you interact with the agent

---

### `/workspace` Page - VSCode Integration
**Location:** `frontend/src/app/workspace/page.tsx`

**Features Available:**
- ✅ VSCode container integration
- ✅ Project management
- ✅ Collaboration panel
- ❌ NO chat features (feedback, approval, progress)

**Purpose:**
- This page is for working with code in VSCode
- Not for chatting with agents
- Different use case from `/chat`

---

### `/models` Page - Model Management
**Location:** `frontend/src/app/models/page.tsx`

**Features Available:**
- ✅ Search and filter Ollama models
- ✅ Download/remove models
- ✅ Configure API keys for external providers
- ✅ View model descriptions and links to Ollama library

---

## Quick Navigation

| Feature | Page | URL |
|---------|------|-----|
| Chat with agents + Feedback + Approval | Chat | `/chat` |
| VSCode + Projects | Workspace | `/workspace` |
| Model management | Models | `/models` |
| Agent creation/management | Dashboard | `/dashboard` |

## Troubleshooting

### "I don't see feedback buttons"
- ✅ Make sure you're on `/chat` page (not `/workspace`)
- ✅ Send a message and wait for agent response
- ✅ Feedback buttons appear below completed agent messages
- ✅ They don't show on user messages or streaming messages

### "I don't see approval dialog"
- ✅ Make sure you're on `/chat` page
- ✅ Agent must request approval for an action
- ✅ Dialog appears as modal overlay when approval needed
- ✅ Check browser console for WebSocket connection

### "I don't see task progress"
- ✅ Make sure you're on `/chat` page
- ✅ Agent must be executing a task with multiple steps
- ✅ Progress bar appears at bottom during execution
- ✅ Requires WebSocket connection to be active

## Testing the Features

### Test Feedback System
1. Go to `/chat`
2. Select an agent
3. Send message: "Hello, how are you?"
4. Wait for agent response
5. Look below the agent's message for three feedback buttons
6. Click any button to rate the response

### Test Approval System
1. Go to `/chat`
2. Select an agent with workspace actions enabled
3. Send message: "Create a new file called test.txt"
4. Agent will request approval
5. Modal dialog should appear with Approve/Reject buttons

### Test Task Progress
1. Go to `/chat`
2. Select an agent
3. Send message: "Analyze this codebase and create a summary"
4. Progress bar should appear at bottom showing steps
5. Updates in real-time as agent works

## Recent Changes

### Feedback System (Added: 2025-01-21)
- Component: `frontend/src/components/MessageFeedback.tsx`
- Backend: `backend/src/conversations/conversations.controller.ts`
- Stores feedback in message metadata and creates memories

### Approval System (Added: 2025-01-20)
- Component: `frontend/src/components/ApprovalDialogSimple.tsx`
- Backend: `backend/src/common/services/approval.service.ts`
- Real-time via WebSocket events

### Model Search/Filter (Added: 2025-01-21)
- Component: `frontend/src/components/ModelManager.tsx`
- Search by name/description
- Filter by status (all/downloaded/available)
