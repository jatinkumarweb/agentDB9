# Feature Locations in AgentDB9

## Important: Both Pages Now Have All Features!

### `/chat` Page - Conversation Service (1-on-1 Chat)
**Location:** `frontend/src/app/chat/page.tsx`

**Features Available:**
- ✅ **Chain of Thought Display** - See agent's reasoning process
  - Shows ReAct (Reasoning + Acting) steps
  - Displays: Thought → Action → Observation → Answer
  - Collapsible to avoid clutter
  - Shows tools used and action inputs

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

**Use Case:**
- Traditional 1-on-1 chat with agents
- Conversation history management
- General purpose agent interactions

**How to Access:**
1. Navigate to: `http://localhost:3000/chat`
2. Select or create an agent
3. Start a conversation
4. Features will appear as you interact with the agent

---

### `/workspace` Page - Agentic Service (Workspace Collaboration)
**Location:** `frontend/src/app/workspace/page.tsx` + `frontend/src/components/CollaborationPanel.tsx`

**Features Available:**
- ✅ **Chain of Thought Display** - Same as /chat
  - See agent's reasoning in workspace context
  - Shows file operations and code changes reasoning
  - Particularly useful for understanding workspace modifications

- ✅ **Message Feedback System** - Same as /chat
  - Rate agent responses in workspace context
  - Feedback stored with workspace project context

- ✅ **Approval System** - Same as /chat
  - Approve/reject agent actions in workspace
  - Context-aware for project operations

- ✅ **Task Progress Bar** - Same as /chat
  - Shows progress of workspace tasks
  - Real-time updates via WebSocket

- ✅ VSCode container integration
- ✅ Project management
- ✅ Collaboration panel with agentic chat

**Use Case:**
- Working with code in VSCode
- Chatting with agents in workspace context
- Project-specific agent interactions
- Collaborative development

**How to Access:**
1. Navigate to: `http://localhost:3000/workspace`
2. Select workspace type (VSCode)
3. Select or create a project
4. Open collaboration panel (chat icon)
5. Select an agent and start chatting
6. Features will appear as you interact

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

| Feature | Page | URL | Service |
|---------|------|-----|---------|
| 1-on-1 Chat + Feedback + Approval | Chat | `/chat` | Conversation Service |
| Workspace Chat + Feedback + Approval | Workspace | `/workspace` | Agentic Service |
| VSCode + Projects | Workspace | `/workspace` | - |
| Model management | Models | `/models` | - |
| Agent creation/management | Dashboard | `/dashboard` | - |

## Key Differences

### Conversation Service (/chat)
- Traditional chat interface
- Conversation history
- General purpose interactions
- No project context

### Agentic Service (/workspace)
- Workspace-integrated chat
- Project-specific context
- VSCode integration
- Collaborative development
- Same features as /chat but with workspace context

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

### Test Chain of Thought
1. Go to `/workspace` (better for ReAct)
2. Open collaboration panel
3. Select an agent
4. Send message: "Create a new file called test.js with a hello world function"
5. Wait for agent response
6. Click "Show Chain of Thought" below the message
7. See the reasoning steps:
   - Thought: "I need to create a file..."
   - Action: "write_file"
   - Observation: "File created successfully"
   - Answer: "I've created the file..."

## Recent Changes

### Chain of Thought Display (Added: 2025-01-21)
- Shows agent's ReAct reasoning process
- Component: `frontend/src/components/ChainOfThoughtDisplay.tsx`
- Displays: Thought → Action → Observation → Answer
- Available on both /chat and /workspace
- Collapsible UI with step count indicator
- Shows tools used and action inputs

### Workspace Features Integration (Added: 2025-01-21)
- Added all chat features to CollaborationPanel (workspace agentic chat)
- Both /chat and /workspace now have feedback, approval, progress, and chain of thought
- Component: `frontend/src/components/CollaborationPanel.tsx`
- Uses same backend APIs as /chat page

### Feedback System (Added: 2025-01-21)
- Component: `frontend/src/components/MessageFeedback.tsx`
- Backend: `backend/src/conversations/conversations.controller.ts`
- Stores feedback in message metadata and creates memories
- Available on both /chat and /workspace

### Approval System (Added: 2025-01-20)
- Component: `frontend/src/components/ApprovalDialogSimple.tsx`
- Backend: `backend/src/common/services/approval.service.ts`
- Real-time via WebSocket events
- Available on both /chat and /workspace

### Model Search/Filter (Added: 2025-01-21)
- Component: `frontend/src/components/ModelManager.tsx`
- Search by name/description
- Filter by status (all/downloaded/available)
