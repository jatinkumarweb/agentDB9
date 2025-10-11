# Test Case: Conversation Memory Flow

## Test ID: MEM-001
**Title**: New Conversation Creates Short-Term and Long-Term Memories  
**Priority**: High  
**Type**: Integration Test  
**Status**: Ready for Testing

---

## Objective

Verify that when a new conversation is created with tool execution:
1. Tool execution memories are saved to **long-term memory** (database)
2. Conversation summary is saved to **long-term memory** (database)
3. Memories are immediately visible via API
4. Memories persist after backend restart
5. Memory stats reflect correct counts

---

## Prerequisites

### 1. Agent Configuration
```sql
-- Verify agent has memory enabled
SELECT 
    id, 
    name, 
    configuration::jsonb->'memory'->'enabled' as memory_enabled
FROM agents 
WHERE id = 'a8a015af-b2fa-4cba-951c-a0e4869205a9';

-- Expected: memory_enabled = true
```

### 2. Initial State
```sql
-- Record initial memory count
SELECT COUNT(*) as initial_count 
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9';

-- Save this number for comparison
```

### 3. Services Running
- ✅ Backend: http://localhost:8000/health
- ✅ Database: PostgreSQL (coding_agent)
- ✅ Frontend: https://3000--0199cf7d-959f-764b-8e82-beddffff5a48.us-east-1-01.gitpod.dev

---

## Test Steps

### Step 1: Create New Conversation

**Action**: Start a new conversation with the Test Agent

**Method**: Via Frontend UI
1. Navigate to Chat page
2. Select "Test Agent" from dropdown
3. Type message: "List all files in the current directory"
4. Send message
5. Wait for agent response

**Expected Behavior**:
- Agent processes request
- Agent calls `list_files` tool
- Agent returns list of files
- Backend logs show memory creation

**Backend Logs to Watch**:
```bash
tail -f backend/backend.log | grep -i "memory\|tool"
```

**Expected Log Entries**:
```
🔄 Starting ReAct loop for: "List all files in the current directory"
🛠️  Tool execution: list_files
✅ Saved tool execution memory to database: list_files (success)
💾 ReAct: Saving final answer
✅ Stored ReAct conversation summary in database
```

---

### Step 2: Verify Long-Term Memory Creation

**Timing**: Immediately after conversation completes

**Query 1: Check Memory Count**
```sql
SELECT COUNT(*) as new_count 
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9';

-- Expected: new_count = initial_count + 2
-- (1 for tool execution + 1 for conversation summary)
```

**Query 2: View New Memories**
```sql
SELECT 
    id,
    category,
    summary,
    LEFT(details, 100) as details_preview,
    importance,
    metadata->'tags' as tags,
    metadata->'source' as source,
    "createdAt"
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
ORDER BY "createdAt" DESC 
LIMIT 2;
```

**Expected Results**:

**Memory 1: Conversation Summary**
- `category`: "interaction"
- `summary`: "Conversation: List all files in the current directory..."
- `importance`: 0.8 (high because tools were used)
- `tags`: ["gpt-4o-mini", "ollama", "react", "conversation"]
- `source`: "conversation"

**Memory 2: Tool Execution**
- `category`: "interaction"
- `summary`: "list_files: Success"
- `importance`: 0.7 (standard for successful tool)
- `tags`: ["gpt-4o-mini", "tool-execution", "list_files", "success"]
- `source`: "tool-execution"

---

### Step 3: Verify Memory via API

**Action**: Call memory API endpoint

**Request** (via frontend proxy):
```bash
# This simulates what the frontend does
curl -s http://localhost:8000/memory/a8a015af-b2fa-4cba-951c-a0e4869205a9
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "interaction",
      "summary": "Conversation: List all files...",
      "details": "User: List all files...\n\nAgent: Here are the files...",
      "importance": 0.8,
      "metadata": {
        "tags": ["gpt-4o-mini", "ollama", "react", "conversation"],
        "keywords": ["tool-usage", "list_files"],
        "source": "conversation"
      },
      "createdAt": "2025-10-11T21:00:00.000Z"
    },
    {
      "id": "uuid",
      "category": "interaction",
      "summary": "list_files: Success",
      "details": "Tool: list_files\nResult: Success\nObservation: Found 15 files...",
      "importance": 0.7,
      "metadata": {
        "tags": ["gpt-4o-mini", "tool-execution", "list_files", "success"],
        "keywords": ["list_files", "success"],
        "source": "tool-execution"
      },
      "createdAt": "2025-10-11T21:00:00.000Z"
    }
  ],
  "count": 2,
  "breakdown": {
    "shortTerm": 0,
    "longTerm": 2
  }
}
```

**Validation**:
- ✅ `success` is true
- ✅ `data` is an array with 2 items
- ✅ `count` equals 2
- ✅ `breakdown.longTerm` equals 2
- ✅ `breakdown.shortTerm` equals 0 (we save directly to long-term)

---

### Step 4: Verify Memory in Frontend UI

**Action**: View memories in agent settings

**Steps**:
1. Navigate to Agents page
2. Click on "Test Agent"
3. Go to "Settings" tab
4. Click on "Memory" sub-tab
5. Click on "View Memories" button

**Expected Display**:
- Memory list shows 2 new entries
- Each memory card displays:
  - ✅ Summary text
  - ✅ Category badge (blue "interaction")
  - ✅ Importance score (0.7 or 0.8)
  - ✅ Timestamp (just now)
  - ✅ Tags (when expanded)

**Screenshot Location**: `tests/memory/screenshots/conversation-memory-ui.png`

---

### Step 5: Verify Memory Stats

**Action**: Check memory statistics

**Query**:
```sql
SELECT 
    COUNT(*) as total_memories,
    AVG(importance)::numeric(3,2) as avg_importance,
    MIN("createdAt") as oldest_memory,
    MAX("createdAt") as newest_memory
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9';
```

**Expected**:
- `total_memories`: initial_count + 2
- `avg_importance`: Between 0.70 and 0.80
- `newest_memory`: Within last minute

**Frontend Stats Tab**:
1. In Memory settings, click "Stats" tab
2. Verify displays:
   - ✅ Total memories count
   - ✅ Short-term count: 0
   - ✅ Long-term count: matches database
   - ✅ Average importance
   - ✅ Recent activity chart

---

### Step 6: Test Memory Persistence

**Action**: Restart backend and verify memories persist

**Steps**:
```bash
# 1. Record current memory count
BEFORE=$(docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -t -c \
  "SELECT COUNT(*) FROM long_term_memories WHERE \"agentId\" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9';" | tr -d ' ')
echo "Memories before restart: $BEFORE"

# 2. Restart backend
pkill -f "nest start"
sleep 3
cd backend && npm run start:dev &
sleep 10

# 3. Check memory count after restart
AFTER=$(docker exec agentdb9-postgres-1 psql -U postgres -d coding_agent -t -c \
  "SELECT COUNT(*) FROM long_term_memories WHERE \"agentId\" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9';" | tr -d ' ')
echo "Memories after restart: $AFTER"

# 4. Compare
if [ "$BEFORE" -eq "$AFTER" ]; then
  echo "✅ PASS: Memories persisted"
else
  echo "❌ FAIL: Memory count changed"
fi
```

**Expected**:
- ✅ Memory count unchanged
- ✅ All memory data intact
- ✅ API still returns same memories

---

### Step 7: Test Multiple Tool Executions

**Action**: Create conversation with multiple tool calls

**Message**: "Read the package.json file and tell me what dependencies we have"

**Expected Behavior**:
1. Agent calls `list_files` tool (to find package.json)
2. Agent calls `read_file` tool (to read package.json)
3. Agent responds with dependency list

**Expected Memories Created**: 3 total
- 1 memory for `list_files` tool execution
- 1 memory for `read_file` tool execution
- 1 memory for conversation summary

**Verification Query**:
```sql
SELECT 
    summary,
    importance,
    metadata->'source' as source,
    "createdAt"
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
AND "createdAt" > NOW() - INTERVAL '5 minutes'
ORDER BY "createdAt" DESC;
```

**Expected Results**:
```
summary                                    | importance | source          | createdAt
-------------------------------------------|------------|-----------------|---------------------------
Conversation: Read the package.json...    | 0.8        | conversation    | 2025-10-11 21:05:00
read_file: Success                         | 0.7        | tool-execution  | 2025-10-11 21:04:58
list_files: Success                        | 0.7        | tool-execution  | 2025-10-11 21:04:55
```

---

### Step 8: Test Error Case Memory

**Action**: Trigger a tool error

**Message**: "Write to /etc/system.conf with content 'test'"

**Expected Behavior**:
- Agent attempts `write_file` tool
- Tool fails with permission error
- Error memory created with higher importance

**Expected Memory**:
- `summary`: "write_file: Error"
- `importance`: 0.9 (higher for errors)
- `tags`: includes "error"
- `details`: Contains error message

**Verification**:
```sql
SELECT 
    summary,
    details,
    importance,
    metadata->'tags' as tags
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
AND summary LIKE '%Error%'
ORDER BY "createdAt" DESC 
LIMIT 1;
```

**Expected**:
- ✅ Error memory exists
- ✅ Importance is 0.9
- ✅ Details contain error message
- ✅ Tags include "error"

---

## Test Data

### Test Agent ID
```
a8a015af-b2fa-4cba-951c-a0e4869205a9
```

### Test Messages
1. "List all files in the current directory"
2. "Read the package.json file and tell me what dependencies we have"
3. "Write to /etc/system.conf with content 'test'" (error case)

### Expected Memory Counts
- After Message 1: +2 memories (1 tool + 1 conversation)
- After Message 2: +3 memories (2 tools + 1 conversation)
- After Message 3: +2 memories (1 tool error + 1 conversation)
- **Total new memories**: 7

---

## Validation Queries

### Query 1: Memory Count by Source
```sql
SELECT 
    metadata->'source' as source,
    COUNT(*) as count
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
GROUP BY metadata->'source';
```

**Expected**:
```
source          | count
----------------|-------
"tool-execution"| 4
"conversation"  | 3
```

### Query 2: Memory Count by Importance
```sql
SELECT 
    CASE 
        WHEN importance >= 0.8 THEN 'High (>=0.8)'
        WHEN importance >= 0.6 THEN 'Medium (0.6-0.8)'
        ELSE 'Low (<0.6)'
    END as importance_level,
    COUNT(*) as count
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
GROUP BY importance_level
ORDER BY importance_level DESC;
```

**Expected**:
```
importance_level | count
-----------------|-------
High (>=0.8)     | 4  (3 conversations + 1 error)
Medium (0.6-0.8) | 3  (3 successful tools)
```

### Query 3: Recent Memory Timeline
```sql
SELECT 
    TO_CHAR("createdAt", 'HH24:MI:SS') as time,
    summary,
    importance,
    metadata->'source' as source
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" ASC;
```

**Expected**: Chronological list showing tool executions followed by conversation summaries

---

## Success Criteria

### Must Pass (Critical)
- ✅ Tool execution memories created immediately
- ✅ Conversation summary memories created after response
- ✅ All memories saved to long-term (database)
- ✅ Memories persist after backend restart
- ✅ API returns correct format with all memories
- ✅ Frontend displays memories correctly
- ✅ Memory count matches database count

### Should Pass (Important)
- ✅ Importance scores correct (0.7 success, 0.9 error, 0.8 conversation)
- ✅ Metadata properly structured (tags, keywords, source)
- ✅ Timestamps accurate
- ✅ Memory stats accurate
- ✅ Multiple tool executions all captured

### Nice to Have (Optional)
- ✅ Memory search/filter works
- ✅ Memory details expandable
- ✅ Memory export functionality
- ✅ Memory analytics charts

---

## Known Issues / Limitations

1. **Short-term memory not used**: Current implementation saves directly to long-term
   - This is by design for persistence
   - Short-term memory exists but not actively used

2. **No memory consolidation**: Memories are not consolidated/summarized
   - Each tool execution creates separate memory
   - Future enhancement: consolidate related memories

3. **No semantic search**: Memories retrieved by time/importance only
   - Future enhancement: vector embeddings for semantic search

---

## Cleanup

After testing, optionally clean up test memories:

```sql
-- View test memories
SELECT id, summary, "createdAt" 
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;

-- Delete test memories (optional)
-- DELETE FROM long_term_memories 
-- WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
-- AND "createdAt" > NOW() - INTERVAL '1 hour';
```

---

## Test Execution Log

### Test Run 1
- **Date**: _____________
- **Tester**: _____________
- **Result**: ☐ PASS ☐ FAIL
- **Notes**: _____________

### Test Run 2
- **Date**: _____________
- **Tester**: _____________
- **Result**: ☐ PASS ☐ FAIL
- **Notes**: _____________

---

## Related Documentation

- `docs/MEMORY_TEST_CASES.md` - All test cases
- `MEMORY_TESTING_SUMMARY.md` - Testing summary
- `MEMORY_FRONTEND_TESTING.md` - Frontend testing guide
- `docs/AGENT_MEMORY_ARCHITECTURE.md` - Architecture guide
- `docs/MEMORY_IMPLEMENTATION_GUIDE.md` - Implementation guide
