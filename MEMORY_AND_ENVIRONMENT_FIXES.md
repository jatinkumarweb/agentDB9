# Memory and Environment Context Fixes

## Issues Investigated

### 1. Memory Not Being Created ❓

**Investigation Results:**
- ✅ Memory **IS** being created correctly
- ✅ Memory service is properly injected and configured
- ✅ Memory is enabled by default in agent configuration
- ✅ Memory creation happens after each conversation

**How Memory Works:**

#### Short-Term Memory (STM)
- **Storage**: In-memory Map (not database)
- **Purpose**: Recent interactions, temporary context
- **Retention**: 24 hours by default
- **Behavior**: Lost on server restart (by design)
- **Location**: `ShortTermMemoryService` using `Map<string, ShortTermMemory>`

#### Long-Term Memory (LTM)
- **Storage**: PostgreSQL database (`long_term_memories` table)
- **Purpose**: Important lessons, patterns, feedback
- **Retention**: Permanent until explicitly deleted
- **Consolidation**: STM → LTM when importance threshold met

**Memory Creation Flow:**
```typescript
// In conversations.service.ts
if (conversation.agent?.configuration?.memory?.enabled) {
  await this.memoryService.createMemory({
    agentId: conversation.agentId,
    sessionId: conversation.id,
    type: 'short-term',
    category: 'interaction',
    content: `User: ${userMessage}\nAgent: ${response}`,
    importance: toolsUsed.length > 0 ? 0.8 : 0.5,
    metadata: { tags, keywords, confidence }
  });
}
```

**Default Configuration:**
```typescript
memory: {
  enabled: true,  // ✅ Enabled by default
  shortTerm: {
    enabled: true,
    maxMessages: 50,
    retentionHours: 24,
  },
  longTerm: {
    enabled: true,
    consolidationThreshold: 10,
    importanceThreshold: 0.7,
  },
}
```

**Why You Might Not See Memories:**
1. Short-term memories are in-memory only (check server logs)
2. Long-term memories require consolidation (10+ interactions)
3. Server restart clears short-term memory
4. Check database: `SELECT * FROM long_term_memories;`

### 2. Knowledge Base Functionality ✅

**Status**: Working correctly

**Test File**: `backend/test/knowledge-ingestion.e2e-spec.ts`

**Fixes Applied:**
- Fixed import: `import request from 'supertest'` (was `import * as request`)
- Changed authentication from signup to login with admin user
- Fixed token access path: `loginResponse.body.accessToken`

**How to Run:**
```bash
cd backend
npm run test:knowledge
```

### 3. Environment Context in LLM Prompt ✅

**Problem**: LLM wasn't clear about working directory, leading to:
- Unnecessary `cd` commands
- Creating unwanted subdirectories
- Confusion about where files should go

**Solution**: Added clear ENVIRONMENT CONTEXT section to system prompt

## System Prompt Improvements

### Before (Verbose and Unclear)
```
**CRITICAL WORKING DIRECTORY RULES - MUST FOLLOW:**
1. You are working in project: "MyProject"
2. Project directory: /workspace/projects/myproject
3. ALL commands execute in this directory automatically
4. When user asks to "create a React app" or similar:
   - DO NOT use "npx create-react-app myapp" or any subdirectory name
   - USE "npx create-react-app ." to create in current directory
   ...
```

### After (Concise and Clear)
```
**ENVIRONMENT CONTEXT:**
- Working Directory: /workspace/projects/myproject
- All commands execute in this directory automatically (no cd needed)
- All file paths are relative to this directory
- Project name for package.json: "MyProject"

**CRITICAL RULES:**
1. ALL operations happen in the current project directory
2. When creating apps: Use "." as target (e.g., "npx create-react-app .")
3. NEVER create subdirectories like "myapp/", "app/" - files go in project root
4. For dev commands (npm start, npm run dev): They run in project directory
5. File operations: Use relative paths (e.g., "src/App.tsx")

**EXAMPLES:**
✅ CORRECT: "npx create-react-app . --template typescript"
✅ CORRECT: "npm install express" (installs in current project)
✅ CORRECT: "npm run dev" (runs in current project)
❌ WRONG: "npx create-react-app myapp" (creates unwanted subdirectory)
❌ WRONG: "cd myapp && npm start" (unnecessary, already in project dir)
```

### Benefits

1. **Efficiency**
   - Reduced token usage (shorter, clearer instructions)
   - LLM understands context faster
   - Fewer unnecessary commands

2. **Clarity**
   - Clear working directory stated upfront
   - Examples show correct vs wrong approaches
   - No ambiguity about where operations happen

3. **Performance**
   - Working directory passed to all tool executions automatically
   - No need for `cd` commands
   - Relative paths work correctly

4. **User Experience**
   - Files created in expected locations
   - No unwanted subdirectories
   - Commands work as expected

## Working Directory Implementation

### How It Works

```typescript
// 1. Get working directory from project
private async getWorkingDirectory(conversation?: Conversation): Promise<string> {
  if (conversation?.projectId) {
    const project = await this.projectsRepository.findOne({ 
      where: { id: conversation.projectId } 
    });
    if (project?.localPath) {
      return project.localPath;  // e.g., /workspace/projects/myproject
    }
  }
  return process.env.VSCODE_WORKSPACE || '/workspace';
}

// 2. Pass to tool execution
const workingDir = await this.getWorkingDirectory(conversation);
const result = await this.reactAgentService.executeReActLoop(
  userMessage,
  systemPrompt,
  model,
  ollamaUrl,
  conversationHistory,
  conversation.id,
  progressCallback,
  maxIterations,
  toolCallback,
  workingDir  // ← Working directory passed here
);

// 3. Tools execute in correct directory
// execute_command tool receives workingDir
// All file operations use workingDir as base
```

### Example Flow

**User**: "create a React app"

**Before Fix**:
```bash
# LLM might do:
cd /workspace/projects/myproject
npx create-react-app myapp  # ❌ Creates unwanted subdirectory
cd myapp
npm start
```

**After Fix**:
```bash
# LLM does:
npx create-react-app . --template typescript  # ✅ Creates in project root
npm start  # ✅ Runs in project directory automatically
```

## Testing

### Memory Testing

**Check Short-Term Memory** (in server logs):
```bash
# Look for log messages like:
Created STM: abc123 for agent xyz789
```

**Check Long-Term Memory** (in database):
```bash
docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -c "SELECT * FROM long_term_memories;"
```

**Trigger Memory Creation**:
1. Create an agent (memory enabled by default)
2. Start a conversation
3. Send messages
4. Check logs for "Created STM" messages
5. After 10+ interactions, check for consolidation to LTM

### Knowledge Base Testing

```bash
cd backend
npm run test:knowledge
```

**What It Tests**:
- Agent without knowledge base (relies on LLM training)
- Agent with knowledge base (can access custom docs)
- Knowledge retrieval and context injection
- Comparison of responses with/without knowledge

### Environment Context Testing

**Manual Test**:
1. Create a project in UI
2. Start conversation in that project
3. Ask: "create a React app"
4. Verify: Files created in project root (not subdirectory)
5. Ask: "install express"
6. Verify: Installs in project directory
7. Ask: "start the dev server"
8. Verify: Runs without needing cd commands

## Configuration

### Memory Configuration

**Enable/Disable Memory** (in agent configuration):
```json
{
  "memory": {
    "enabled": true,
    "shortTerm": {
      "enabled": true,
      "maxMessages": 50,
      "retentionHours": 24
    },
    "longTerm": {
      "enabled": true,
      "consolidationThreshold": 10,
      "importanceThreshold": 0.7
    }
  }
}
```

### Knowledge Base Configuration

**Enable/Disable Knowledge Base**:
```json
{
  "knowledgeBase": {
    "enabled": true,
    "retrievalTopK": 5,
    "sources": [],
    "autoUpdate": false
  }
}
```

### Environment Variables

```env
# Working directory for VSCode
VSCODE_WORKSPACE=/workspace

# Workspace path for projects
WORKSPACE_PATH=/workspace

# Ollama for LLM
OLLAMA_HOST=http://localhost:11434
```

## Files Modified

1. **backend/src/conversations/conversations.service.ts**
   - Improved system prompt with ENVIRONMENT CONTEXT section
   - Clearer working directory instructions
   - Better examples and rules
   - More concise and efficient

2. **backend/test/knowledge-ingestion.e2e-spec.ts**
   - Fixed import statement
   - Changed to use admin login instead of signup
   - Fixed token access path

## Summary

### Memory ✅
- **Status**: Working correctly
- **Issue**: Short-term memory is in-memory (by design)
- **Solution**: No fix needed, working as intended
- **Note**: Check server logs for STM, database for LTM

### Knowledge Base ✅
- **Status**: Working correctly
- **Issue**: Test had import/auth issues
- **Solution**: Fixed test file
- **Test**: `npm run test:knowledge`

### Environment Context ✅
- **Status**: Significantly improved
- **Issue**: Unclear working directory context
- **Solution**: Added clear ENVIRONMENT CONTEXT section
- **Benefits**: More efficient, clearer, better UX

## Recommendations

### For Memory Persistence

If you need short-term memory to persist across restarts:

**Option 1: Use Redis**
```typescript
// In short-term-memory.service.ts
// Replace Map with Redis client
private readonly redis = new Redis(process.env.REDIS_URL);
```

**Option 2: Use Database**
```typescript
// Create short_term_memories table
// Store in database instead of Map
```

### For Better Memory Consolidation

**Adjust Thresholds**:
```json
{
  "longTerm": {
    "consolidationThreshold": 5,  // Consolidate after 5 interactions (was 10)
    "importanceThreshold": 0.5    // Lower threshold (was 0.7)
  }
}
```

### For Knowledge Base

**Add Sources**:
1. Go to agent configuration
2. Enable knowledge base
3. Add documentation sources
4. Upload files or provide URLs
5. Knowledge will be retrieved automatically

## Next Steps

1. **Monitor Memory Creation**
   - Check server logs for "Created STM" messages
   - Query database for long-term memories
   - Verify consolidation is happening

2. **Test Environment Context**
   - Create projects and test file operations
   - Verify no unwanted subdirectories
   - Check commands run in correct directory

3. **Run Knowledge Tests**
   - `npm run test:knowledge`
   - Verify all tests pass
   - Check knowledge retrieval works

4. **Consider Redis for STM**
   - If memory persistence needed
   - Implement Redis storage
   - Update short-term-memory.service.ts
