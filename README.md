# AgentDB9 - Coding Agent Environment

A multi-container TypeScript development environment for building AI-powered coding agents.

## Architecture

This project implements a microservices architecture with the following components:

- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and Socket.IO for real-time communication
- **LLM Service**: AI processing service for code generation and analysis
- **Vector Database**: Qdrant for code embeddings and semantic search
- **Database**: PostgreSQL for metadata and user data
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

### Quick Start

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
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - LLM Service: http://localhost:9000
   - Qdrant Vector DB: http://localhost:6333
   - PostgreSQL: localhost:5432

### Development Commands

```bash
# Install all dependencies
npm run install:all

# Start development environment
npm run dev

# Run individual services
npm run dev:frontend
npm run dev:backend
npm run dev:llm

# Run tests
npm run test

# Lint code
npm run lint

# Clean up
npm run clean
```

### Development Workflow

1. **Hot Reload**: All services support live reloading during development
2. **Shared Types**: TypeScript types are automatically synced across services
3. **API-First**: Services communicate via REST APIs and WebSocket
4. **Testing**: Jest with TypeScript support in all containers

## Service Responsibilities

### Frontend (Port 3000)
- **Code Editor**: Monaco/VS Code Web integration
- **Chat Interface**: Real-time communication with AI agent
- **Project Browser**: File system navigation and management
- **Visualization**: Code analysis and dependency graphs

### Backend (Port 8000)
- **API Gateway**: Routes requests to appropriate services
- **Authentication**: User management and sessions
- **Project Management**: CRUD operations for code projects
- **WebSocket Hub**: Real-time communication coordination

### LLM Service (Port 9000)
- **Model Inference**: Local or remote LLM calls
- **Code Generation**: Structured code output
- **Code Analysis**: Understanding and reasoning
- **Vector Operations**: Embedding generation and search

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
MODEL_PATH=/models
GPU_ENABLED=true
```

## Data Persistence

- **Vector Store**: Qdrant data in `./qdrant_data/`
- **Database**: PostgreSQL data in `./postgres_data/`
- **Models**: LLM models in `./models/`
- **Projects**: User projects mounted to containers

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

### Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f llm-service
```

## Contributing

1. Follow TypeScript strict mode guidelines
2. Add tests for new features
3. Update documentation for API changes
4. Use conventional commit messages

## License

MIT License - see LICENSE file for details.