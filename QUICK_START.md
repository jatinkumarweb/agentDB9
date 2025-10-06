# Quick Start Guide - AgentDB9

Get up and running with the AgentDB9 coding agent in 5 minutes.

## Prerequisites

- Node.js 18+
- npm 9+
- (Optional) Docker & Docker Compose
- (Optional) Ollama for local LLM

## Installation

```bash
# 1. Clone repository
git clone <your-repo-url>
cd agentdb9

# 2. Install dependencies
npm run install:all

# 3. Build shared package
npm run build:shared
```

## Start Services

### Option A: Docker (Recommended)

```bash
# Start all services
npm run dev

# Wait for services to start (30-60 seconds)
# Check status
npm run status
```

### Option B: Local Development

```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Terminal 3: LLM Service
cd llm-service && npm run dev

# Terminal 4: MCP Server
cd mcp-server && npm run dev
```

## Setup Ollama (Optional)

```bash
# Install Ollama from https://ollama.ai
# Then download models:
npm run setup:ollama

# Or manually:
ollama pull qwen2.5-coder:7b
ollama pull codellama:7b
```

## Test Integration

```bash
# Run automated tests
./scripts/test-integration.sh

# Should see:
# ✅ Backend service running
# ✅ Frontend service running
# ✅ LLM service running
# ✅ MCP server running
# ✅ WebSocket connection
```

## Use the Agent

1. **Open**: [http://localhost:3000](http://localhost:3000)
2. **Sign up**: Create an account
3. **Create**: New conversation
4. **Chat**: Send a message

### Example Prompts

```
"Hello, can you help me with coding?"

"Create a file called test.js with a hello world function"

"Initialize a git repository and check the status"

"List all files in the current directory"

"Create a React component called Button.tsx"
```

## Verify Everything Works

### Check Services

```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000

# LLM Service
curl http://localhost:9000/health

# MCP Server
curl http://localhost:9001/health

# Ollama (optional)
curl http://localhost:11434/api/version
```

### Check WebSocket

Open browser DevTools → Network → WS tab
- Should see connection to `localhost:8000`
- Should see events: `connect`, `message_update`, `agent_activity`

### Check Agent Activity

In the chat interface:
1. Send: "Create a file called test.txt"
2. Watch Agent Activity Panel (right side)
3. Should see: "file_create" activity
4. File should be created in workspace

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # or :8000, :9000, :9001

# Kill process
kill -9 <PID>
```

### Ollama Not Available

```bash
# Check if running
curl http://localhost:11434/api/version

# Start Ollama
ollama serve

# Download models
ollama pull qwen2.5-coder:7b
```

### Database Errors

```bash
# Clean database
npm run clean:db

# Restart services
npm run dev
```

### WebSocket Not Connecting

```bash
# Check backend logs
npm run logs:backend

# Verify CORS settings
# Check backend/.env for FRONTEND_URL
```

## Project Structure

```
agentdb9/
├── backend/          # NestJS backend (port 8000)
├── frontend/         # Next.js frontend (port 3000)
├── llm-service/      # LLM service (port 9000)
├── mcp-server/       # MCP tools server (port 9001)
├── shared/           # Shared types
└── scripts/          # Utility scripts
```

## Key Endpoints

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Backend Health**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/api/docs
- **LLM Service**: http://localhost:9000/api
- **MCP Server**: http://localhost:9001/api

## Environment Variables

Create `.env` files if needed (optional - defaults work):

**backend/.env**:
```env
NODE_ENV=development
PORT=8000
OLLAMA_HOST=http://localhost:11434
```

**frontend/.env.local**:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Development Workflow

```bash
# Start services
npm run dev

# Make changes to code
# Services auto-reload

# Run tests
./scripts/test-integration.sh

# View logs
npm run logs

# Stop services
docker-compose down
# or Ctrl+C in each terminal
```

## Next Steps

1. **Read Documentation**:
   - `README.md` - Project overview
   - `INTEGRATION_TESTING.md` - Testing guide
   - `MCP_INTEGRATION.md` - MCP tools

2. **Explore Features**:
   - Try different Ollama models
   - Test file operations
   - Use git commands
   - Execute terminal commands

3. **Customize**:
   - Add new MCP tools
   - Configure models
   - Adjust UI theme
   - Add custom prompts

## Useful Commands

```bash
# Development
npm run dev              # Start all services
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Testing
npm run test             # Run all tests
npm run test:env         # Test environment
./scripts/test-integration.sh  # Integration tests

# Logs
npm run logs             # All service logs
npm run logs:backend     # Backend logs only
npm run logs:frontend    # Frontend logs only

# Cleanup
npm run clean            # Clean all
npm run clean:db         # Clean database
npm run clean:docker     # Clean Docker

# Health
npm run health           # Check all services
npm run status           # Docker status
```

## Tips

- **Use Ollama**: Much faster than external APIs
- **Check Logs**: When something doesn't work
- **Test Often**: Run integration tests frequently
- **Read Errors**: Error messages are helpful
- **Ask Agent**: The agent can help debug issues!

## Getting Help

1. **Check Logs**: `npm run logs`
2. **Run Tests**: `./scripts/test-integration.sh`
3. **Review Docs**: `INTEGRATION_TESTING.md`
4. **Check Health**: `npm run health`

## Success Checklist

- [ ] All services running
- [ ] WebSocket connected
- [ ] Can create conversation
- [ ] Agent responds to messages
- [ ] Streaming works
- [ ] Agent Activity Panel shows activities
- [ ] File operations work
- [ ] No console errors

## You're Ready! 🎉

Start chatting with your AI coding agent at:
**[http://localhost:3000](http://localhost:3000)**

Try: *"Create a React component called Button.tsx with TypeScript"*
