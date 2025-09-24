# AgentDB9 Local Development Setup

This guide helps you set up AgentDB9 for local development with full AI functionality.

## Current Status

✅ **Working Features:**
- Frontend accessible at http://localhost:3000
- Backend API at http://localhost:8000
- Database and Redis services
- Chat interface with conversation history
- Agent management
- Project management

⚠️ **Known Issues:**
- Ollama integration requires additional setup for local environments
- GPU drivers not available in most local Docker environments

## Quick Start

1. **Clone and start basic services:**
   ```bash
   git clone https://github.com/jatinkumarweb/agentDB9.git
   cd agentDB9
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/api/docs

## AI Chat Setup (Optional)

To enable AI responses in chat, you have three options:

### Option 1: Use External APIs (Recommended)

Configure API keys in your environment:

```bash
# Create .env file
echo "OPENAI_API_KEY=your_openai_key_here" >> .env
echo "ANTHROPIC_API_KEY=your_anthropic_key_here" >> .env

# Restart services
docker-compose down && docker-compose up -d
```

### Option 2: Local Ollama Setup

Run the automated setup script:

```bash
./scripts/setup-ollama-local.sh
```

This script will:
- Start Ollama in CPU-only mode
- Download the qwen2.5-coder:7b model
- Test the setup
- Provide troubleshooting tips

### Option 3: Use Gitpod

For the full experience with GPU support:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/jatinkumarweb/agentDB9)

## Troubleshooting

### Chat Shows "Local Development Mode" Message

This is expected when Ollama is not available. The message provides helpful guidance:

```
🤖 Local Development Mode

I'm unable to connect to the Ollama service, which is expected in local environments without GPU support.

To enable AI responses:
1. Use external APIs: Configure OpenAI or Anthropic API keys
2. Install Ollama locally: Visit https://ollama.ai
3. Use Gitpod: Full AI functionality works there
```

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using ports
   lsof -i :3000
   lsof -i :8000
   lsof -i :11434
   ```

2. **Docker issues:**
   ```bash
   # Reset everything
   docker-compose down -v
   docker system prune -f
   docker-compose up -d
   ```

3. **Ollama not working:**
   ```bash
   # Check Ollama status
   curl http://localhost:11434/api/version
   
   # Restart Ollama
   docker stop ollama-agentdb9
   ./scripts/setup-ollama-local.sh
   ```

## Development Workflow

1. **Frontend development:**
   - Hot reload enabled
   - Changes reflect immediately
   - Located in `frontend/` directory

## ✅ Final Verification

The setup is working correctly when:

1. **Health Check**: `curl http://localhost:3000/health` returns `{"status":"ok"}`
2. **Database**: Backend can connect to PostgreSQL
3. **Redis**: Backend can connect to Redis
4. **Ollama**: AI responses work in conversations

### Testing AI Functionality

```bash
# 1. Get available agents
curl http://localhost:3000/api/agents

# 2. Create a conversation (use an agent ID from step 1)
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"agentId": "AGENT_ID_HERE", "title": "Test Chat"}'

# 3. Send a message (replace CONVERSATION_ID with the ID from step 2)
curl -X POST http://localhost:3000/api/conversations/CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"role": "user", "content": "Hello! What is 2+2?"}'

# 4. Check for AI response (wait 10-30 seconds)
curl http://localhost:3000/api/conversations/CONVERSATION_ID/messages
```

**Expected Results:**
- ✅ **Immediate Response**: Users see "🤖 *Thinking...*" within 1-2 seconds
- ✅ **Streaming Updates**: Content appears progressively as it's generated
- ✅ **Simple queries**: Complete responses in 15-30 seconds
- ✅ **Complex queries**: May take 60-120 seconds but show progress
- ✅ **Visual Indicators**: Frontend shows streaming status with animated dots
- ✅ Health checks show "HEALTHY" status

## 🚀 Final Working Configuration

The solution uses Docker networking and streaming responses for optimal performance:

### Docker Networking
- **Ollama Container**: `ollama-agentdb9` on `coding-agent-network`
- **Backend Environment**: `OLLAMA_HOST=http://ollama-agentdb9:11434`
- **Model**: `qwen2.5-coder:7b` (4.7GB, CPU-optimized)

### Streaming Implementation
- **Immediate Feedback**: Users see responses start within 1-2 seconds
- **Progressive Updates**: Content streams in real-time as it's generated
- **Timeout Settings**: 60 seconds for streaming, with fallback to non-streaming
- **Frontend Polling**: 1-second intervals during streaming, 5-second when idle
- **Visual Indicators**: Animated dots show streaming status

### Performance Improvements
- **Before**: 60+ second waits with potential timeouts
- **After**: Immediate response start, progressive content delivery
- **User Experience**: No more blank waiting periods
- **Error Handling**: Graceful fallbacks prevent hanging requests

2. **Backend development:**
   - Hot reload enabled with volume mounts
   - Located in `backend/` directory
   - API documentation auto-generated

3. **Database changes:**
   - TypeORM handles migrations automatically
   - Data persisted in Docker volumes

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Databases     │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (Postgres,    │
│   Port 3000     │    │   Port 8000     │    │    Redis,       │
└─────────────────┘    └─────────────────┘    │    Qdrant)      │
                                              └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Ollama      │
                       │   (Optional)    │
                       │   Port 11434    │
                       └─────────────────┘
```

## Contributing

1. Make changes to your local environment
2. Test thoroughly
3. Commit with descriptive messages
4. Push to your fork
5. Create a pull request

## 🔄 Streaming Response Architecture

The system implements real-time streaming responses for better user experience:

### Backend Implementation
```typescript
// Streaming API call with progressive database updates
const response = await fetch(ollamaUrl, {
  method: 'POST',
  body: JSON.stringify({
    model: 'qwen2.5-coder:7b',
    messages: [...],
    stream: true  // Enable streaming
  })
});

// Process streaming chunks and update database in real-time
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  // Update message content progressively
}
```

### Frontend Features
- **Adaptive Polling**: 1s during streaming, 5s when idle
- **Visual Feedback**: Animated indicators for streaming status
- **Real-time Updates**: Content appears as it's generated

### Benefits
- ✅ **No More Waiting**: Immediate response acknowledgment
- ✅ **Progress Visibility**: Users see content being generated
- ✅ **Better UX**: Eliminates blank waiting periods
- ✅ **Timeout Resilience**: Graceful handling of long responses

## Support

- Check the troubleshooting section above
- Review Docker logs: `docker-compose logs [service-name]`
- Open an issue on GitHub with detailed error information