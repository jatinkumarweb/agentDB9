# Integration Testing Guide for AgentDB9

This guide covers testing the complete integration of the coding agent system with Ollama, MCP tools, and WebSocket communication.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js - Port 3000)                │
│  • Chat UI with Monaco Editor                                    │
│  • Single WebSocket connection to Backend                        │
│  • Agent Activity Panel (real-time updates)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket (Socket.IO)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS - Port 8000)                  │
│  • WebSocket Gateway (unified hub)                               │
│  • Conversations Service (orchestrator)                          │
│  • MCP Service Client                                            │
│  • Broadcasts: messages, agent_activity, tool_execution         │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐        ┌──────────────────────────────────┐
│   LLM Service    │        │         MCP Server               │
│   Port 9000      │        │         Port 9001                │
│                  │        │  • 67+ Tools (file, git, etc)    │
│  • Ollama API    │        │  • Broadcasts to Backend         │
│  • Streaming     │        │  • VSCode Bridge                 │
│  • Tool calling  │        └──────────────────────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Ollama       │
│   Port 11434     │
│  • Local models  │
│  • GPU support   │
└──────────────────┘
```

## Prerequisites

### Required
- Node.js 18+
- npm 9+
- Git

### Optional (for full functionality)
- Docker & Docker Compose
- Ollama (for local LLM inference)
- GPU (for faster model inference)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm run install:all

# Build shared package
npm run build:shared
```

### 2. Environment Configuration

Create `.env` files if needed (optional - defaults work for local dev):

**Backend** (`backend/.env`):
```env
NODE_ENV=development
PORT=8000
OLLAMA_HOST=http://localhost:11434
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Start Services

#### Option A: Using Docker Compose (Recommended)
```bash
npm run dev
```

#### Option B: Individual Services (Local Development)
```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: LLM Service
cd llm-service && npm run dev

# Terminal 4: MCP Server
cd mcp-server && npm run dev

# Terminal 5: Ollama (if installed locally)
ollama serve
```

### 4. Setup Ollama Models (Optional)

```bash
# Download recommended models
npm run setup:ollama

# Or manually:
ollama pull qwen2.5-coder:7b
ollama pull codellama:7b
ollama pull deepseek-coder:6.7b
```

## Testing the Integration

### Automated Tests

Run the integration test suite:

```bash
./scripts/test-integration.sh
```

This tests:
- ✅ Service health checks
- ✅ Ollama model availability
- ✅ Backend API endpoints
- ✅ WebSocket connectivity
- ✅ MCP tools availability
- ✅ Database connectivity
- ✅ Environment configuration

### Manual Testing

#### Test 1: Basic Chat with Ollama

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign up / Log in
3. Create a new conversation
4. Send a message: "Hello, can you help me with coding?"
5. **Expected**: Agent responds using Ollama model with streaming

**Verify**:
- Message appears in real-time (streaming)
- Agent response is relevant
- No errors in browser console
- Backend logs show Ollama API calls

#### Test 2: Tool Calling (File Operations)

1. In the conversation, send: "Create a file called test.txt with the content 'Hello World'"
2. **Expected**: 
   - Agent acknowledges the request
   - Tool execution appears in Agent Activity Panel
   - File is created in workspace
   - Tool result is shown in chat

**Verify**:
- Agent Activity Panel shows "file_create" activity
- WebSocket events in browser console
- Backend logs show MCP tool execution
- File exists in workspace

#### Test 3: Git Operations

1. Send: "Initialize a git repository and check the status"
2. **Expected**:
   - Agent executes `git_init` tool
   - Agent executes `git_status` tool
   - Results are displayed in chat

**Verify**:
- `.git` directory created
- Agent Activity Panel shows "git_operation" activities
- Tool results include git status output

#### Test 4: Terminal Commands

1. Send: "List all files in the current directory"
2. **Expected**:
   - Agent executes `execute_command` tool with `ls` or `dir`
   - Command output is displayed

**Verify**:
- Agent Activity Panel shows "terminal_command" activity
- Command output is accurate
- No security issues (sandboxed execution)

#### Test 5: WebSocket Real-time Updates

1. Open browser DevTools → Network → WS
2. Send a message in chat
3. **Expected**: See WebSocket messages:
   - `new_message` (user message)
   - `message_update` (streaming agent response)
   - `agent_activity` (tool executions)
   - `tool_execution` (tool results)

**Verify**:
- All events arrive in correct order
- No connection drops
- Streaming is smooth

#### Test 6: Multi-tool Workflow

1. Send: "Create a React component called Button.tsx with TypeScript"
2. **Expected**:
   - Agent creates file
   - Agent writes TypeScript code
   - Multiple tool calls executed
   - All activities shown in real-time

**Verify**:
- File created with correct content
- Multiple agent activities in panel
- Proper TypeScript syntax
- No tool execution errors

## Troubleshooting

### Issue: Ollama Not Available

**Symptoms**: Agent responds with "Local Development Mode" message

**Solutions**:
1. Check if Ollama is running: `curl http://localhost:11434/api/version`
2. Start Ollama: `ollama serve`
3. Download models: `npm run setup:ollama`
4. Check backend logs for Ollama connection errors

### Issue: WebSocket Not Connecting

**Symptoms**: No real-time updates, console errors

**Solutions**:
1. Check backend is running: `curl http://localhost:8000/health`
2. Verify CORS settings in backend
3. Check browser console for connection errors
4. Ensure no firewall blocking WebSocket connections

### Issue: MCP Tools Not Working

**Symptoms**: Tool calls fail, no agent activities

**Solutions**:
1. Check MCP server is running: `curl http://localhost:9001/health`
2. Verify MCP server can reach backend
3. Check workspace permissions
4. Review MCP server logs for errors

### Issue: Database Errors

**Symptoms**: Migration errors, null value errors

**Solutions**:
```bash
# Clean database
npm run clean:db

# Deep clean (removes all data)
npm run clean:db:deep

# Restart services
npm run dev
```

### Issue: Port Conflicts

**Symptoms**: Services fail to start

**Solutions**:
1. Check which ports are in use:
   ```bash
   lsof -i :3000  # Frontend
   lsof -i :8000  # Backend
   lsof -i :9000  # LLM Service
   lsof -i :9001  # MCP Server
   lsof -i :11434 # Ollama
   ```
2. Kill conflicting processes or change ports in config

## Performance Testing

### Load Testing Chat

```bash
# Install artillery (if not installed)
npm install -g artillery

# Run load test
artillery quick --count 10 --num 5 http://localhost:8000/health
```

### Streaming Performance

1. Send a long prompt (500+ words)
2. Measure time to first token
3. Measure tokens per second
4. **Expected**: 
   - First token < 2 seconds
   - 30-60 tokens/second (depends on model and hardware)

### Tool Execution Performance

1. Execute multiple tools in sequence
2. Measure total execution time
3. **Expected**: Each tool < 1 second (file ops), < 5 seconds (git ops)

## Integration Checklist

Use this checklist to verify complete integration:

- [ ] Backend starts without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] LLM service responds to health check
- [ ] MCP server responds to health check
- [ ] Ollama is accessible (optional)
- [ ] WebSocket connection established
- [ ] User can sign up / log in
- [ ] User can create conversation
- [ ] Agent responds to messages
- [ ] Streaming works smoothly
- [ ] Agent Activity Panel shows activities
- [ ] File operations work (create, read, write)
- [ ] Git operations work (init, status, commit)
- [ ] Terminal commands execute
- [ ] Tool results appear in chat
- [ ] No console errors
- [ ] No backend errors in logs
- [ ] Database operations work
- [ ] Multiple conversations can be created
- [ ] Conversation history persists

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Build shared package
        run: npm run build:shared
      
      - name: Start services
        run: |
          docker-compose up -d
          sleep 30
      
      - name: Run integration tests
        run: ./scripts/test-integration.sh
      
      - name: Cleanup
        run: docker-compose down
```

## Monitoring in Production

### Key Metrics to Track

1. **WebSocket Connections**
   - Active connections
   - Connection duration
   - Reconnection rate

2. **Message Throughput**
   - Messages per second
   - Average response time
   - Streaming latency

3. **Tool Execution**
   - Tool calls per conversation
   - Tool success rate
   - Average execution time

4. **Model Performance**
   - Tokens per second
   - Model availability
   - Fallback usage rate

5. **Error Rates**
   - WebSocket errors
   - Tool execution failures
   - Database errors
   - API errors

## Next Steps

After successful integration testing:

1. **Performance Optimization**
   - Implement caching for frequent operations
   - Optimize database queries
   - Add connection pooling

2. **Security Hardening**
   - Add rate limiting
   - Implement request validation
   - Add authentication to MCP endpoints

3. **Feature Enhancements**
   - Add more MCP tools
   - Implement multi-user collaboration
   - Add code analysis features

4. **Monitoring & Logging**
   - Set up application monitoring
   - Add structured logging
   - Implement error tracking

## Support

For issues or questions:
- Check logs: `npm run logs`
- Review documentation: `README.md`, `MCP_INTEGRATION.md`
- Run diagnostics: `./scripts/test-integration.sh`
