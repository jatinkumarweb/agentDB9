# Memory System Test Suite

## Overview

This directory contains comprehensive tests for the AgentDB9 memory system, specifically testing how conversations create and store memories in both short-term and long-term storage.

## Test Files

### 1. Test Case Documentation
- **`conversation-memory-flow.test.md`** - Detailed test case specification
  - Complete test scenarios
  - Expected behaviors
  - Validation queries
  - Success criteria

### 2. Automated Test Scripts
- **`test-conversation-memory.sh`** - Single conversation memory flow test
- **`test-multiple-conversations.sh`** - Multiple conversations with different scenarios
- **`run-all-tests.sh`** - Master test runner

## Quick Start

### Run All Tests
```bash
./tests/memory/run-all-tests.sh
```

### Run Individual Tests
```bash
# Test single conversation
./tests/memory/test-conversation-memory.sh

# Test multiple conversations
./tests/memory/test-multiple-conversations.sh
```

## Test Scenarios

### Scenario 1: Single Tool Execution
**User Message**: "List all files in the current directory"

**Expected Memories Created**: 2
1. Tool execution memory (list_files: Success)
   - Importance: 0.7
   - Source: tool-execution
   - Category: interaction

2. Conversation summary
   - Importance: 0.8
   - Source: conversation
   - Category: interaction

### Scenario 2: Multiple Tool Executions
**User Message**: "Read the package.json file and tell me the dependencies"

**Expected Memories Created**: 3
1. Tool execution memory (list_files: Success)
2. Tool execution memory (read_file: Success)
3. Conversation summary

### Scenario 3: Tool Error
**User Message**: "Write to /etc/system.conf with content 'test'"

**Expected Memories Created**: 2
1. Tool execution memory (write_file: Error)
   - Importance: 0.9 (higher for errors)
   - Source: tool-execution
   - Tags include "error"

2. Conversation summary
   - Importance: 0.8
   - Keywords include "error"

## Memory Flow Diagram

```
User Message
     ↓
Agent Processes (ReAct Loop)
     ↓
Tool Execution
     ↓
[IMMEDIATE] Save Tool Memory → Long-Term Storage (PostgreSQL)
     ↓
Tool Result
     ↓
Agent Response
     ↓
[IMMEDIATE] Save Conversation Summary → Long-Term Storage (PostgreSQL)
     ↓
Memories Visible in UI
```

## Key Behaviors

### 1. Direct Long-Term Storage
- **All memories saved directly to PostgreSQL database**
- No short-term memory buffer (by design)
- Immediate persistence
- Survives backend restarts

### 2. Memory Types

#### Tool Execution Memory
```json
{
  "category": "interaction",
  "summary": "list_files: Success",
  "details": "Tool: list_files\nResult: Success\nObservation: ...",
  "importance": 0.7,  // 0.9 for errors
  "metadata": {
    "tags": ["gpt-4o-mini", "tool-execution", "list_files", "success"],
    "keywords": ["list_files", "success"],
    "source": "tool-execution",
    "confidence": 1.0,
    "relevance": 1.0
  }
}
```

#### Conversation Summary
```json
{
  "category": "interaction",
  "summary": "Conversation: User asked about...",
  "details": "User: ...\n\nAgent: ...\n\nTools used: ...",
  "importance": 0.8,  // 0.5 if no tools used
  "metadata": {
    "tags": ["gpt-4o-mini", "ollama", "react", "conversation"],
    "keywords": ["tool-usage", "list_files"],
    "source": "conversation",
    "confidence": 1.0,
    "relevance": 1.0
  }
}
```

### 3. Importance Scoring

| Memory Type | Condition | Importance |
|-------------|-----------|------------|
| Tool Execution | Success | 0.7 |
| Tool Execution | Error | 0.9 |
| Conversation | With tools | 0.8 |
| Conversation | No tools | 0.5 |

### 4. Memory Persistence

✅ **Persists across**:
- Backend restarts
- Database restarts (data in PostgreSQL)
- Container restarts

❌ **Does NOT persist**:
- If database is deleted
- If long_term_memories table is dropped

## Validation Queries

### Check Memory Count
```sql
SELECT COUNT(*) 
FROM long_term_memories 
WHERE "agentId" = 'YOUR_AGENT_ID';
```

### View Recent Memories
```sql
SELECT 
    summary,
    importance,
    metadata->'source' as source,
    "createdAt"
FROM long_term_memories 
WHERE "agentId" = 'YOUR_AGENT_ID'
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Memory by Source
```sql
SELECT 
    metadata->'source' as source,
    COUNT(*) as count,
    AVG(importance)::numeric(3,2) as avg_importance
FROM long_term_memories 
WHERE "agentId" = 'YOUR_AGENT_ID'
GROUP BY metadata->'source';
```

### Memory by Importance
```sql
SELECT 
    CASE 
        WHEN importance >= 0.8 THEN 'High (>=0.8)'
        WHEN importance >= 0.6 THEN 'Medium (0.6-0.8)'
        ELSE 'Low (<0.6)'
    END as importance_level,
    COUNT(*) as count
FROM long_term_memories 
WHERE "agentId" = 'YOUR_AGENT_ID'
GROUP BY importance_level
ORDER BY importance_level DESC;
```

## Expected Test Results

### After Running All Tests

**Total Memories Created**: 7 (from test scripts)
- 4 tool execution memories (3 success + 1 error)
- 3 conversation summaries

**Memory Distribution**:
- Source: tool-execution = 4
- Source: conversation = 3

**Importance Distribution**:
- High (>=0.8) = 4 (3 conversations + 1 error)
- Medium (0.6-0.8) = 3 (3 successful tools)

## Troubleshooting

### Test Fails: "Memory count incorrect"
**Cause**: Previous test memories still in database

**Solution**:
```sql
-- View existing memories
SELECT id, summary, "createdAt" 
FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
ORDER BY "createdAt" DESC;

-- Optional: Clean up old test memories
DELETE FROM long_term_memories 
WHERE "agentId" = 'a8a015af-b2fa-4cba-951c-a0e4869205a9'
AND "createdAt" < NOW() - INTERVAL '1 day';
```

### Test Fails: "Backend not responding"
**Cause**: Backend service not running

**Solution**:
```bash
cd backend && npm run start:dev
```

### Test Fails: "Database connection failed"
**Cause**: PostgreSQL container not running

**Solution**:
```bash
cd backend && docker-compose up -d postgres
```

### Test Fails: "Memory not enabled"
**Cause**: Agent doesn't have memory configuration

**Solution**:
```sql
UPDATE agents 
SET configuration = jsonb_set(
    configuration::jsonb, 
    '{memory}', 
    '{"enabled": true, "shortTerm": {"enabled": true}, "longTerm": {"enabled": true}}'::jsonb
)::text 
WHERE id = 'a8a015af-b2fa-4cba-951c-a0e4869205a9';
```

## Test Maintenance

### Before Running Tests
1. Ensure backend is running
2. Ensure database is running
3. Verify agent has memory enabled
4. Note initial memory count

### After Running Tests
1. Verify all memories created
2. Check memory distribution
3. Validate importance scores
4. Optional: Clean up test data

### Updating Tests
When modifying memory system:
1. Update test case documentation
2. Update expected results in scripts
3. Update validation queries
4. Re-run all tests
5. Update this README

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Memory System Tests

on: [push, pull_request]

jobs:
  test-memory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Start services
        run: |
          cd backend && docker-compose up -d postgres
          npm install
          npm run start:dev &
          sleep 10
      
      - name: Run memory tests
        run: ./tests/memory/run-all-tests.sh
      
      - name: Cleanup
        run: docker-compose down
```

## Performance Benchmarks

### Expected Execution Times
- Single conversation test: ~5 seconds
- Multiple conversations test: ~10 seconds
- Full test suite: ~20 seconds

### Memory Usage
- Each memory: ~1-2 KB in database
- 1000 memories: ~1-2 MB
- Negligible impact on performance

## Future Enhancements

### Planned Tests
- [ ] Memory search/filter functionality
- [ ] Memory consolidation (when implemented)
- [ ] Vector embedding tests (when implemented)
- [ ] Memory importance decay
- [ ] Memory archival/cleanup

### Planned Features to Test
- [ ] Semantic search with vector embeddings
- [ ] Memory consolidation strategies
- [ ] Automatic importance adjustment
- [ ] Memory analytics and insights
- [ ] Cross-agent memory sharing

## Related Documentation

- `../docs/MEMORY_TEST_CASES.md` - Detailed test cases
- `../MEMORY_TESTING_SUMMARY.md` - Testing summary
- `../MEMORY_FRONTEND_TESTING.md` - Frontend testing
- `../docs/AGENT_MEMORY_ARCHITECTURE.md` - Architecture
- `../docs/MEMORY_IMPLEMENTATION_GUIDE.md` - Implementation guide

## Support

For issues or questions:
1. Check backend logs: `tail -f backend/backend.log | grep memory`
2. Check database: Run validation queries above
3. Review test output for specific errors
4. Consult related documentation

## License

Part of AgentDB9 project. See main LICENSE file.
