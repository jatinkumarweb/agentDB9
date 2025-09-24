# AgentDB9 Environment Testing Guide

This document provides comprehensive testing and validation procedures for the AgentDB9 coding agent environment.

## Quick Start Testing

### 🚀 Run All Tests
```bash
# Complete environment validation
npm run validate

# Quick health check
npm run health

# Test specific components
npm run test:env      # Environment connectivity
npm run test:models   # Model availability
npm run test:databases # Database connections
npm run test:vscode   # VS Code integration
```

### 🌐 Web Interface Testing
Access the development testing interface at:
```
http://localhost:3000/test/env
```
*Note: Only available in development mode*

## Test Categories

### 1. Service Connectivity Tests
Tests basic connectivity to all services:
- ✅ Frontend (port 3000)
- ✅ Backend API (port 8000)
- ✅ LLM Service (port 9000)
- ✅ VS Code Server (port 8080)
- ✅ Ollama (port 11434)
- ✅ Qdrant Vector DB (port 6333)

```bash
# Test all service health endpoints
npm run test:env
```

### 2. Model Availability Tests
Validates AI model functionality:
- 🤖 Ollama local models (CodeLlama, DeepSeek, Mistral)
- 🌐 External API models (OpenAI, Anthropic, Cohere)
- 🧪 Model inference testing
- ⚡ Response time validation

```bash
# Test model availability and inference
npm run test:models
```

### 3. Database Connection Tests
Verifies database connectivity and functionality:
- 🐘 PostgreSQL (metadata and user data)
- 🔴 Redis (caching and sessions)
- 🔍 Qdrant (vector embeddings)

```bash
# Test all database connections
npm run test:databases
```

### 4. VS Code Integration Tests
Validates development environment:
- 🎨 VS Code Server accessibility
- 📁 Workspace mounting
- 🔌 Extension management
- 💻 Terminal functionality
- 🔧 Git integration

```bash
# Test VS Code server integration
npm run test:vscode
```

## Test Results Interpretation

### ✅ Healthy Environment
- All critical services running
- Models responding correctly
- Databases connected
- VS Code accessible

### ⚠️ Degraded Environment
- Core services working
- Some optional features unavailable
- Minor configuration issues

### ❌ Unhealthy Environment
- Critical services down
- Major connectivity issues
- Requires immediate attention

## Troubleshooting Guide

### Common Issues and Solutions

#### 🐳 Docker Container Issues
```bash
# Check container status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]

# Rebuild containers
docker-compose up --build
```

#### 🤖 Model Issues
```bash
# Check Ollama models
docker-compose exec ollama ollama list

# Pull missing models
npm run setup:ollama

# Test model inference
curl -X POST http://localhost:9000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","modelId":"codellama:7b","provider":"ollama"}'
```

#### 💾 Database Issues
```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready -U postgres

# Check Redis
docker-compose exec redis redis-cli ping

# Check Qdrant
curl http://localhost:6333/health
```

#### 🎨 VS Code Issues
```bash
# Check VS Code container
docker-compose logs vscode

# Restart VS Code service
docker-compose restart vscode

# Access VS Code
open http://localhost:8080
```

### Environment Variables
Ensure these are configured in `.env`:
```bash
# API Keys (optional for external models)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
COHERE_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here

# VS Code Server
VSCODE_PASSWORD=secure_password_here

# Database URLs
DATABASE_URL=postgresql://postgres:password@postgres:5432/coding_agent
REDIS_URL=redis://redis:6379
```

## Automated Testing

### Continuous Monitoring
The environment supports real-time monitoring:
- WebSocket-based status updates
- Automatic health checks every 30 seconds
- Performance metrics tracking
- Issue detection and alerting

### CI/CD Integration
Include these tests in your CI/CD pipeline:
```yaml
# Example GitHub Actions step
- name: Validate Environment
  run: |
    npm run setup
    npm run validate
```

## Performance Benchmarks

### Expected Response Times
- Frontend: < 2 seconds
- Backend API: < 500ms
- LLM Service: < 1 second (health check)
- Model Inference: 1-10 seconds (depending on model)
- Database Queries: < 100ms

### Resource Usage
- Memory: 8-16GB recommended
- CPU: 4+ cores recommended
- Storage: 20GB+ for models and data
- GPU: Optional but recommended for local models

## Test Coverage

### Service Health Endpoints
- ✅ `/health` endpoints for all services
- ✅ Version information
- ✅ Uptime tracking
- ✅ Environment details

### API Functionality
- ✅ CRUD operations
- ✅ Authentication flows
- ✅ WebSocket connections
- ✅ File operations

### Model Operations
- ✅ Model listing
- ✅ Inference requests
- ✅ Streaming responses
- ✅ Error handling

### Database Operations
- ✅ Connection pooling
- ✅ Query performance
- ✅ Data persistence
- ✅ Backup/restore

## Reporting Issues

When reporting issues, include:
1. Test results from `npm run validate`
2. Service logs: `npm run logs`
3. Container status: `npm run status`
4. Environment details: OS, Docker version, available resources

## Advanced Testing

### Load Testing
```bash
# Test concurrent requests
ab -n 1000 -c 10 http://localhost:8000/health

# Test model inference under load
for i in {1..10}; do
  curl -X POST http://localhost:9000/api/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test","modelId":"codellama:7b"}' &
done
```

### Security Testing
```bash
# Check for exposed secrets
grep -r "password\|key\|secret" . --exclude-dir=node_modules

# Validate HTTPS redirects (production)
curl -I http://localhost:3000

# Test CORS policies
curl -H "Origin: http://evil.com" http://localhost:8000/api/status
```

### Integration Testing
```bash
# End-to-end workflow test
npm run test:e2e

# Cross-service communication test
npm run test:integration
```

## Maintenance

### Regular Health Checks
Run these commands regularly:
```bash
# Daily health check
npm run health

# Weekly full validation
npm run validate

# Monthly performance review
npm run test:performance
```

### Updates and Upgrades
```bash
# Update dependencies
npm run update:deps

# Rebuild containers with latest images
docker-compose pull && docker-compose up --build

# Validate after updates
npm run validate
```