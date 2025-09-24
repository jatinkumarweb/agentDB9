# Docker Setup Guide

This project supports multiple Docker configurations to accommodate different system architectures and GPU availability.

## Quick Start

The easiest way to start the services is using the automated setup script:

```bash
# Start all services (auto-detects your system)
npm run dev

# Or use the script directly
./scripts/docker-setup.sh up -d
```

## System Detection

The setup script automatically detects:

- **Architecture**: x86_64 (Intel/AMD) or ARM64 (Apple Silicon)
- **GPU Support**: NVIDIA GPU availability
- **Platform**: Chooses appropriate Docker images

## Configuration Files

### Base Configuration
- `docker-compose.yml` - Main configuration (CPU-only, x86_64 default)

### GPU Support
- `docker-compose.override.yml` - Adds NVIDIA GPU support for LLM services
- Used automatically when NVIDIA GPU is detected

### Apple Silicon Support
- `docker-compose.arm64.yml` - ARM64-compatible images and configurations
- Used automatically on Apple Silicon Macs

## Manual Configuration

If you need to manually specify the configuration:

### CPU-only (any architecture)
```bash
docker-compose up -d
```

### With GPU Support (x86_64 + NVIDIA)
```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Apple Silicon (ARM64)
```bash
docker-compose -f docker-compose.yml -f docker-compose.arm64.yml up -d
```

## Services

| Service | Description | GPU Support | ARM64 Support |
|---------|-------------|-------------|---------------|
| frontend | Next.js web app | ❌ | ✅ |
| backend | Express.js API | ❌ | ✅ |
| llm-service | LLM processing | ✅ (optional) | ✅ |
| ollama | Local LLM runtime | ✅ (optional) | ✅ |
| qdrant | Vector database | ❌ | ✅ |
| postgres | SQL database | ❌ | ✅ |
| redis | Cache/queue | ❌ | ✅ |
| vscode | Code server | ❌ | ✅ |

## Troubleshooting

### GPU Error: "could not select device driver"
This error occurs when Docker tries to use GPU but it's not available. Solutions:

1. **Automatic**: Use `./scripts/docker-setup.sh` (recommended)
2. **Manual**: Use CPU-only configuration: `docker-compose up -d`

### Apple Silicon Issues
- Use ARM64 configuration: `docker-compose -f docker-compose.yml -f docker-compose.arm64.yml up -d`
- Some images may take longer to pull on first run

### Performance on Apple Silicon
- Ollama runs natively on ARM64 for better performance
- GPU acceleration not available, but CPU performance is good
- Consider using smaller models for better responsiveness

## Environment Variables

Create a `.env` file for configuration:

```bash
# API Keys (optional)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
COHERE_API_KEY=your_cohere_key
HUGGINGFACE_API_KEY=your_hf_key

# VSCode Password
VSCODE_PASSWORD=your_secure_password
```

## Development Workflow

```bash
# Start all services
npm run dev

# View logs
npm run logs

# Check service status
npm run status

# Stop services
./scripts/docker-setup.sh down

# Clean up (removes volumes)
npm run clean
```