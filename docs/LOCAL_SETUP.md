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

## Support

- Check the troubleshooting section above
- Review Docker logs: `docker-compose logs [service-name]`
- Open an issue on GitHub with detailed error information