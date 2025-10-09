# AgentDB9 - Coding Agent Environment

A multi-container TypeScript development environment for building AI-powered coding agents.

## Architecture

This project implements a comprehensive microservices architecture with the following components:

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, and VS Code integration
- **Backend**: Node.js with Express, Socket.IO, and Redis for real-time communication
- **LLM Service**: Multi-provider AI service (Ollama, OpenAI, Anthropic, Cohere)
- **MCP Server**: Model Context Protocol server for VS Code tool integration
- **VS Code Container**: Full code-server IDE experience in the browser
- **Ollama**: Local LLM inference server with GPU acceleration
- **Vector Database**: Qdrant for code embeddings and semantic search
- **Database**: PostgreSQL for metadata and user data
- **Redis**: Caching and session management
- **Shared**: Common TypeScript types and utilities

## Machine Type Selection

For optimal performance, choose the appropriate machine type:

- **GPU-enabled instance (A100/T4)**: For local LLM inference
- **CPU-optimized (16+ cores, 32GB+ RAM)**: For development and lighter workloads
- **Standard (8 cores, 16GB RAM)**: For basic TypeScript development

## Project Structure

```
agentdb9/
├── .devcontainer/
│   └── devcontainer.json          # Dev Container configuration
├── docker-compose.yml             # Multi-container orchestration
├── frontend/                      # Next.js frontend application
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── backend/                       # Express.js backend API
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── llm-service/                   # AI processing service
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── mcp-server/                    # Model Context Protocol server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── vscode-proxy/                  # VS Code authentication proxy
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── vscode-config/                 # VS Code container configuration
│   ├── settings.json
│   ├── keybindings.json
│   └── extensions.json
└── shared/                        # Shared types and utilities
    ├── package.json
    ├── tsconfig.json
    └── src/types/
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### 📚 Important Guides

- **[Interactive Prompts Solution](./INTERACTIVE_PROMPTS_SOLUTION.md)** - Handle CLI prompts (Next.js, React, Vite, etc.)
- **[Docker-in-Docker Guide](./DOCKER_IN_DOCKER_GUIDE.md)** - Use Docker inside the dev container
- **[Security Implementation](./SECURITY_IMPLEMENTATION.md)** - Rate limiting and session management
- **[Cleanup Report](./CLEANUP_REPORT.md)** - Code cleanup and optimization
- **[Issues Resolved](./ISSUES_RESOLVED.md)** - Recent fixes and solutions

### Quick Start

### 🚨 Local Chat Not Working?

If you're running locally and seeing "Local Development Mode" instead of AI responses:

```bash
# Quick fix - run this script
./scripts/fix-local-chat.sh
```

Or follow the [Local Setup Troubleshooting Guide](./LOCAL_SETUP_TROUBLESHOOTING.md).

### 💾 Docker Storage Issues?

Docker consuming too much space? Use our storage management tools:

```bash
# Quick storage check and cleanup
./scripts/docker-cleanup.sh

# Monitor storage usage
./scripts/docker-storage-monitor.sh

# Setup automated cleanup
./scripts/setup-auto-cleanup.sh
```

See the [Docker Storage Management Guide](./DOCKER_STORAGE_MANAGEMENT.md) for comprehensive storage optimization.

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd agentdb9
   ```

2. **Start all services**:
   ```bash
   docker-compose up --build
   ```

3. **Access the services**:
   - **Frontend**: http://localhost:3000
   - **VS Code Workspace**: http://localhost:3000/workspace
   - **VS Code Server**: http://localhost:8080 (password: `codeserver123`)
   - **Backend API**: http://localhost:8000
   - **LLM Service**: http://localhost:9000
   - **MCP Server**: http://localhost:9001
   - **Ollama**: http://localhost:11434
   - **Qdrant Vector DB**: http://localhost:6333
   - **PostgreSQL**: localhost:5432
   - **Redis**: localhost:6379

### Development Commands

```bash
# Install all dependencies
npm run install:all

# Start development environment
npm run dev

# Setup Ollama models (run after first startup)
npm run setup:ollama

# Setup VS Code extensions
npm run setup:vscode

# Run individual services
npm run dev:frontend
npm run dev:backend
npm run dev:llm
npm run dev:mcp

# View logs
npm run logs
npm run logs:frontend
npm run logs:backend
npm run logs:llm

# Run tests
npm run test

# Lint code
npm run lint

# Clean up
npm run clean

# Database cleanup (resolves migration issues)
npm run clean:db
npm run clean:db:deep
```

### Database Management

#### Database Reset (Schema Changes)

When you add or modify database entities, use the database reset script:

```bash
# Reset database only (recommended)
npm run db:reset

# Full reset (database + Redis + Qdrant)
npm run db:reset:full
```

This script safely:
- Removes existing database
- Temporarily enables schema synchronization
- Creates all tables from entities
- Seeds default data
- Restores production-safe configuration

See [Database Reset Guide](./docs/DATABASE_RESET.md) for detailed information.

#### Database Cleanup (Migration Issues)

If you encounter database migration errors (e.g., "column contains null values"):

```bash
# Standard cleanup (recommended)
npm run clean:db

# Deep cleanup (removes all unused Docker volumes)
npm run clean:db:deep
```

See [Database Cleanup Guide](./docs/database-cleanup.md) for detailed information.

### Development Workflow

1. **Hot Reload**: All services support live reloading during development
2. **Shared Types**: TypeScript types are automatically synced across services
3. **API-First**: Services communicate via REST APIs and WebSocket
4. **Testing**: Jest with TypeScript support in all containers

## Service Responsibilities

### Frontend (Port 3000)
- **Monaco Editor Integration**: Full-featured code editor with IntelliSense
- **Model Selection UI**: Switch between Ollama, OpenAI, Anthropic, etc.
- **Chat Interface**: Real-time communication with AI agent
- **Project Browser**: File system navigation with real-time updates
- **Code Visualization**: Dependency graphs and architecture diagrams

### Backend (Port 8000)
- **API Gateway**: Routes requests to appropriate services and models
- **Model Management**: Orchestrate between Ollama, external APIs, and local models
- **Authentication**: User management and API key handling
- **Project Management**: CRUD operations with Git integration
- **WebSocket Hub**: Real-time communication between VS Code and agent

### LLM Service (Port 9000)
- **Multi-Provider Support**: Ollama, OpenAI, Anthropic, Cohere, HuggingFace
- **Model Routing**: Intelligent selection based on task type and complexity
- **Context Management**: Maintain conversation state and project context
- **Code Generation**: Structured output with TypeScript interfaces
- **Vector Operations**: Embedding generation for code search and RAG

### Ollama Service (Port 11434)
- **Local Model Management**: Pull, update, and serve local models
- **GPU Acceleration**: Optimized inference with CUDA/ROCm support
- **Model Library**: CodeLlama, DeepSeek-Coder, Mistral, Llama3, Qwen2.5-Coder
- **Streaming Support**: Real-time token generation for better UX

### VS Code Container (Port 8081 via Proxy)
- **Full IDE Experience**: Complete code-server environment in browser
- **Integrated Authentication**: Seamless JWT-based authentication with the main application
- **Secure Access**: All access goes through authenticated proxy (no password required)
- **Extension Ecosystem**: Auto-install project-specific extensions
- **Terminal Integration**: Direct command execution in containers
- **Git Integration**: Version control with GitLens and conventional commits
- **Real-time Collaboration**: Multi-user workspace sharing
- **Agent Monitoring**: Live agent activity overlay and tracking

### MCP Server (Port 9001)
- **Tool Execution**: 67+ tools for file, git, terminal, editor, testing operations
- **VS Code Bridge**: Direct integration with code-server for agent actions
- **WebSocket Events**: Real-time agent activity broadcasting
- **Security Layer**: Sandboxed operations with input validation
- **Protocol Compliance**: Full Model Context Protocol implementation

## Environment Variables

Create `.env` files in each service directory:

### Backend (.env)
```
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:password@postgres:5432/coding_agent
LLM_SERVICE_URL=http://llm-service:9000
VECTOR_DB_URL=http://qdrant:6333
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### LLM Service (.env)
```
NODE_ENV=development
PORT=9000
OLLAMA_HOST=http://ollama:11434
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
HUGGINGFACE_API_KEY=your_hf_key_here
MODEL_CACHE_DIR=/models/cache
REDIS_URL=redis://redis:6379
```

## Data Persistence

- **Vector Store**: Qdrant data in `./qdrant_data/`
- **Database**: PostgreSQL data in `./postgres_data/`
- **Cache**: Redis data in `./redis_data/`
- **Models**: Ollama models in `./ollama_data/`
- **LLM Cache**: Model cache in `./models/`
- **VS Code Config**: Extensions and settings in `./vscode-config/`
- **Projects**: User projects mounted to containers

## Model Management & Selection

### 🤖 **Ollama Integration**

Recommended local models for different tasks:

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `codellama:7b` | 3.8GB | Fast | Good | Quick code completion |
| `codellama:13b` | 7.3GB | Medium | High | Complex code generation |
| `deepseek-coder:6.7b` | 3.7GB | Fast | High | Code analysis & completion |
| `mistral:7b` | 4.1GB | Fast | Good | General chat & documentation |
| `qwen2.5-coder:7b` | 4.2GB | Fast | High | Multilingual code support |

### ⚡ **Smart Model Routing**

The system automatically selects the best model based on:
- **Task Type**: Code generation, completion, analysis, documentation
- **Complexity**: Simple vs complex requirements
- **Performance**: Speed vs quality trade-offs
- **Cost**: Budget considerations for external APIs
- **Availability**: Local vs remote model availability

### 🔄 **Fallback Chains**

If a model fails or is unavailable, the system automatically falls back:
- `gpt-4` → `claude-3-sonnet` → `codellama:13b` → `codellama:7b`
- `codellama:13b` → `codellama:7b` → `deepseek-coder:6.7b` → `mistral:7b`

## VS Code Workspace Integration

### 🖥️ **Full IDE Experience**

Access a complete VS Code environment at `/workspace` with:
- **File Explorer**: Navigate project structure
- **Editor**: Syntax highlighting for 20+ languages
- **Terminal**: Integrated bash shell with full access
- **Git Panel**: Visual diff, commit, and branch management
- **Debug Panel**: Multi-language debugging support
- **Extensions**: Pre-installed development tools

### 🤖 **Real-time Agent Monitoring**

Watch AI agents work in real-time with:
- **Activity Overlay**: Live agent operations display
- **File Change Tracking**: See edits as they happen
- **Command Execution**: Monitor terminal operations
- **Status Indicators**: Visual progress and error reporting
- **Activity History**: Complete operation timeline

### 👥 **Collaboration Features**

Multi-user workspace sharing with:
- **Real-time Chat**: Communicate with team and AI agent
- **User Presence**: See who's online and active
- **Shared Cursors**: Multiple user editing indicators
- **Activity Broadcasting**: Share operations across users
- **URL Sharing**: Easy workspace access links

### 🎨 **Pre-configured Extensions**

Automatically installed extensions:
- **TypeScript**: Enhanced language support and IntelliSense
- **Prettier**: Code formatting with auto-save
- **ESLint**: Linting with auto-fix capabilities
- **GitLens**: Advanced git visualization and history
- **Docker**: Container management and debugging
- **Tailwind CSS**: CSS framework support
- **Python**: Python development tools
- **REST Client**: API testing and development

### 🔧 **Optimized Settings**

Pre-configured for productivity:
- **Theme**: Dark+ with Fira Code font and ligatures
- **Auto-save**: 1-second delay with format on save
- **Git Integration**: Auto-fetch and smart commits
- **Terminal**: Bash shell with custom prompt
- **Debugging**: Pre-configured launch configurations
- **IntelliSense**: Enhanced TypeScript and JavaScript support

### 🛠️ **MCP Tool Integration**

The workspace integrates with 67+ MCP tools:
- **File Operations**: Create, edit, delete, rename files
- **Git Operations**: Commit, push, branch, merge operations
- **Terminal Tools**: Command execution and process management
- **Editor Tools**: Text manipulation and code formatting
- **Testing Tools**: Test execution and coverage analysis
- **Project Tools**: Scaffolding and dependency management

### 📊 **Agent Activity Types**

Monitor these agent operations:
- 📝 **File Edit**: Real-time file modifications
- 📁 **File Create**: New file creation
- 🗑️ **File Delete**: File removal operations
- 🌿 **Git Operation**: Version control actions
- 💻 **Terminal Command**: Shell command execution
- 🧪 **Test Run**: Test execution and analysis

## Development Tips

1. **TypeScript**: Strict mode enabled across all services
2. **Code Style**: Prettier and ESLint configured
3. **Testing**: Jest with TypeScript support
4. **Debugging**: VS Code debugging configurations included
5. **Monitoring**: Morgan logging and health check endpoints

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 8000, 9000, 6333, 5432 are available
2. **Docker permissions**: Make sure Docker daemon is running
3. **Memory issues**: Increase Docker memory allocation for GPU workloads
4. **Network issues**: Check Docker network configuration
5. **Docker corruption**: See [Docker Corruption Fix Guide](docs/DOCKER_CORRUPTION_FIX.md)

### Docker Corruption Fix

If you encounter errors like `unable to get image` or `blob corruption`, use our automated fix:

```bash
# Quick fix for Docker corruption
./scripts/fix-docker-corruption.sh --full-clean
# Restart Docker Desktop manually
./scripts/fix-docker-corruption.sh --verify
./scripts/fix-docker-corruption.sh --rebuild
```

For detailed instructions, see [docs/DOCKER_CORRUPTION_FIX.md](docs/DOCKER_CORRUPTION_FIX.md)

### Logs

```bash
# View all service logs
npm run logs

# View specific service logs
npm run logs:frontend
npm run logs:backend
npm run logs:llm

# Direct docker-compose commands
docker-compose logs -f
docker-compose logs -f ollama
docker-compose logs -f vscode
```

## Advanced Features

### 🧠 **Context-Aware Code Generation**

The system maintains rich context including:
- Project structure and dependencies
- Active file and cursor position
- Recent changes and git history
- Code style preferences
- Test files and patterns

### 🔄 **Real-time Collaboration**

- **Multi-user editing**: Share workspaces with invite codes
- **AI-human collaboration**: Suggest improvements and review code
- **Model collaboration**: Consult multiple models for consensus

### 📊 **Performance Monitoring**

- **Model response times**: Track and optimize performance
- **Success rates**: Monitor generation quality
- **Resource utilization**: CPU, memory, and GPU usage
- **Auto-optimization**: Adjust model selection based on metrics

## Performance Optimization

The docker-compose.yml includes production-ready performance settings:

### Resource Limits
- **LLM Service**: 4 CPU cores, 4GB RAM (optimized for AI inference)
- **Ollama**: 6 CPU cores, 8GB RAM (maximum resources for model inference)
- **Backend**: 2 CPU cores, 2GB RAM
- **Qdrant**: 2 CPU cores, 2GB RAM (vector database)
- **Frontend/VSCode/MCP**: 1 CPU core, 1GB RAM each
- **PostgreSQL**: 1 CPU core, 1GB RAM
- **Redis**: 1 CPU core, 512MB RAM (with LRU eviction)

### Log Rotation
All services include automatic log rotation:
- High-traffic services: 10MB max size, 3 files
- Standard services: 5MB max size, 2 files

### Environment Variables
- `NODE_ENV=production` for LLM service (reduced logging overhead)
- `LOG_LEVEL=warn` for all services (configurable via .env)
- Ollama tuning: `OLLAMA_NUM_PARALLEL=2`, `OLLAMA_MAX_LOADED_MODELS=2`

These settings provide optimal performance out of the box. Adjust resource limits in docker-compose.yml based on your hardware capabilities.

### 🎯 **Intelligent Features**

- **Auto-completion**: Context-aware code suggestions
- **Code review**: Automated analysis and suggestions
- **Documentation**: Generate docs from code
- **Testing**: Generate test cases and scenarios
- **Refactoring**: Suggest and apply code improvements

## Contributing

1. Follow TypeScript strict mode guidelines
2. Add tests for new features
3. Update documentation for API changes
4. Use conventional commit messages

## License

MIT License - see LICENSE file for details.