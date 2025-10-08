# Docker-in-Docker (DinD) Guide

**Status:** ✅ Already Configured and Working

This guide explains how Docker-in-Docker is configured in the VSCode dev container and how to use it.

---

## Current Configuration

### 1. Dev Container Setup

**File:** `.devcontainer/devcontainer.json`

```json
{
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest",
      "enableNonRootDocker": "true"
    }
  },
  "mounts": [
    "source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind"
  ]
}
```

### What This Does:

1. **Docker-in-Docker Feature**: Installs Docker inside the container
2. **Non-Root Docker**: Allows running Docker without sudo
3. **Socket Mount**: Shares the host Docker socket with the container

---

## Verification

### Check Docker Installation:
```bash
docker --version
# Output: Docker version 28.3.3-1, build 980b85681696fbd95927fd8ded8f6d91bdca95b0
```

### Check Docker is Running:
```bash
docker ps
# Should show running containers
```

### Test Docker Functionality:
```bash
docker run --rm hello-world
# Should pull and run the hello-world image
```

### Check Docker Socket:
```bash
ls -la /var/run/docker.sock
# Output: srw-rw-rw- 1 root 989 0 Oct  8 06:01 /var/run/docker.sock
```

---

## Usage Examples

### 1. Build Docker Images

```bash
# Build an image from a Dockerfile
docker build -t my-app:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t my-app:prod .

# Build with build args
docker build --build-arg NODE_VERSION=20 -t my-app .
```

### 2. Run Containers

```bash
# Run a container
docker run -d --name my-container nginx

# Run with port mapping
docker run -d -p 8080:80 nginx

# Run with volume mount
docker run -d -v $(pwd):/app node:20

# Run with environment variables
docker run -d -e NODE_ENV=production my-app
```

### 3. Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

### 4. Manage Containers

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop a container
docker stop my-container

# Remove a container
docker rm my-container

# View container logs
docker logs my-container

# Execute command in container
docker exec -it my-container bash
```

### 5. Manage Images

```bash
# List images
docker images

# Remove an image
docker rmi my-image:tag

# Pull an image
docker pull node:20

# Tag an image
docker tag my-app:latest my-app:v1.0.0

# Push to registry
docker push my-registry/my-app:latest
```

---

## Docker Compose in Dev Container

### Example: Running a Database

Create `docker-compose.dev.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres-data:
```

Usage:
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps

# Stop services
docker-compose -f docker-compose.dev.yml down
```

---

## Building Multi-Stage Docker Images

### Example Dockerfile:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:
```bash
# Build the image
docker build -t my-app:latest .

# Run the container
docker run -d -p 3000:3000 my-app:latest

# Test the application
curl http://localhost:3000
```

---

## Docker Networks

### Create and Use Custom Networks:

```bash
# Create a network
docker network create my-network

# Run containers on the network
docker run -d --name app --network my-network my-app
docker run -d --name db --network my-network postgres

# Containers can communicate using service names
# app can connect to postgres using hostname "db"
```

---

## Docker Volumes

### Persistent Data Storage:

```bash
# Create a volume
docker volume create my-data

# Use the volume
docker run -d -v my-data:/app/data my-app

# List volumes
docker volume ls

# Inspect a volume
docker volume inspect my-data

# Remove a volume
docker volume rm my-data
```

---

## Best Practices

### 1. Use .dockerignore

Create `.dockerignore`:
```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
dist
build
coverage
.vscode
.idea
*.md
```

### 2. Multi-Stage Builds

- Reduces final image size
- Separates build and runtime dependencies
- Improves security

### 3. Layer Caching

```dockerfile
# Good: Copy package files first
COPY package*.json ./
RUN npm install

# Then copy source code
COPY . .
```

### 4. Use Specific Tags

```dockerfile
# Bad
FROM node

# Good
FROM node:20-alpine
```

### 5. Run as Non-Root User

```dockerfile
FROM node:20-alpine

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
WORKDIR /app
COPY --chown=nodejs:nodejs . .

# Switch to app user
USER nodejs

CMD ["node", "index.js"]
```

---

## Troubleshooting

### Issue: Permission Denied

```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# If needed, add user to docker group (already configured)
sudo usermod -aG docker $USER
```

### Issue: Cannot Connect to Docker Daemon

```bash
# Check if Docker is running
docker info

# Restart Docker service (if needed)
sudo systemctl restart docker
```

### Issue: Out of Disk Space

```bash
# Clean up unused resources
docker system prune -a

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Issue: Container Won't Start

```bash
# Check container logs
docker logs container-name

# Inspect container
docker inspect container-name

# Check container status
docker ps -a
```

---

## Docker Commands Cheat Sheet

### Container Management
```bash
docker run                  # Create and start a container
docker start                # Start a stopped container
docker stop                 # Stop a running container
docker restart              # Restart a container
docker rm                   # Remove a container
docker exec                 # Execute command in container
docker logs                 # View container logs
docker inspect              # View container details
```

### Image Management
```bash
docker build                # Build an image
docker pull                 # Pull an image from registry
docker push                 # Push an image to registry
docker images               # List images
docker rmi                  # Remove an image
docker tag                  # Tag an image
```

### System Management
```bash
docker ps                   # List running containers
docker ps -a                # List all containers
docker system df            # Show disk usage
docker system prune         # Clean up unused resources
docker volume ls            # List volumes
docker network ls           # List networks
```

### Docker Compose
```bash
docker-compose up           # Start services
docker-compose down         # Stop services
docker-compose ps           # List services
docker-compose logs         # View logs
docker-compose build        # Build services
docker-compose restart      # Restart services
```

---

## Advanced Usage

### 1. Build and Push to Registry

```bash
# Login to registry
docker login

# Build with multiple tags
docker build -t myregistry/myapp:latest -t myregistry/myapp:v1.0.0 .

# Push to registry
docker push myregistry/myapp:latest
docker push myregistry/myapp:v1.0.0
```

### 2. Docker BuildKit

Enable BuildKit for faster builds:
```bash
# Set environment variable
export DOCKER_BUILDKIT=1

# Build with BuildKit
docker build --progress=plain -t my-app .
```

### 3. Health Checks

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "index.js"]
```

### 4. Resource Limits

```bash
# Limit CPU and memory
docker run -d \
  --cpus="1.5" \
  --memory="512m" \
  --memory-swap="1g" \
  my-app
```

---

## Integration with Project

### Current Project Docker Setup

The project already uses Docker Compose for services:

```bash
# Start all services
npm run dev

# View logs
npm run logs

# Stop services
docker-compose down
```

### Services Running:
- Frontend (Next.js) - Port 3000
- Backend (NestJS) - Port 9000
- LLM Service - Port 8000
- PostgreSQL - Port 5432
- Ollama - Port 11434

---

## Security Considerations

### 1. Don't Expose Docker Socket Unnecessarily

The current setup mounts the Docker socket, which is necessary for DinD but should be used carefully.

### 2. Use Official Images

```dockerfile
# Good
FROM node:20-alpine

# Avoid
FROM random-user/node
```

### 3. Scan Images for Vulnerabilities

```bash
# Using Docker Scout
docker scout cves my-app:latest

# Using Trivy
trivy image my-app:latest
```

### 4. Keep Images Updated

```bash
# Pull latest base images
docker pull node:20-alpine

# Rebuild your images
docker build -t my-app:latest .
```

---

## Summary

✅ **Docker-in-Docker is configured and working**  
✅ **Can build and run containers inside dev container**  
✅ **Docker Compose is available**  
✅ **Non-root Docker access enabled**  
✅ **Host Docker socket is mounted**  

### Quick Test:
```bash
# Test Docker is working
docker run --rm hello-world

# Test Docker Compose
docker-compose --version

# Build a test image
echo "FROM alpine" | docker build -t test -

# Clean up
docker rmi test
```

---

**Status:** ✅ FULLY FUNCTIONAL  
**Configuration:** `.devcontainer/devcontainer.json`  
**Documentation:** This guide
