# Local vs Gitpod Environment Differences

## Key Differences That Affect Chat Functionality

### 1. **Docker Environment Loading**
- **Gitpod**: Environment variables are loaded fresh when services start
- **Local**: May use cached environment variables from previous runs

### 2. **Service Discovery**
- **Gitpod**: Docker network communication works consistently
- **Local**: May have Docker network issues or DNS resolution problems

### 3. **Model Persistence**
- **Gitpod**: Models may need to be re-downloaded each session
- **Local**: Models persist in `./ollama_data` volume

### 4. **Environment Variable Precedence**
- **Gitpod**: Uses docker-compose.yml environment variables
- **Local**: May be overridden by local .env files or shell environment

## Common Local Issues

### Issue 1: Stale Environment Variables
**Problem**: Backend still uses old `OLLAMA_HOST=http://host.docker.internal:11434`
**Solution**:
```bash
# Force rebuild to pick up new environment
docker-compose down
docker-compose up --build -d
```

### Issue 2: Docker Network Problems
**Problem**: Services can't communicate via service names
**Solution**:
```bash
# Recreate Docker network
docker-compose down
docker network prune -f
docker-compose up -d
```

### Issue 3: Model Not Available
**Problem**: Ollama running but no models downloaded
**Solution**:
```bash
# Check models
docker-compose exec ollama ollama list

# Download model if missing
docker-compose exec ollama ollama pull qwen2.5-coder:7b
```

### Issue 4: Port Conflicts
**Problem**: Local services running on same ports
**Solution**:
```bash
# Check what's using port 11434
lsof -i :11434

# Kill conflicting processes or change ports
```

## Debugging Steps for Local Setup

### Step 1: Verify Environment Variables
```bash
# Check backend environment
docker-compose exec backend printenv | grep OLLAMA

# Should show: OLLAMA_HOST=http://ollama:11434
# If it shows localhost or host.docker.internal, rebuild services
```

### Step 2: Test Service Communication
```bash
# Test from backend container
docker-compose exec backend curl -v http://ollama:11434/api/version

# Test from host
curl -v http://localhost:11434/api/version
```

### Step 3: Check Backend Logs
```bash
# Look for Ollama connection attempts
docker-compose logs backend | grep -i ollama

# Look for conversation service logs
docker-compose logs backend | grep -i "conversation\|chat\|message"
```

### Step 4: Use Debug Endpoint
```bash
# Test the new debug endpoint
curl -s http://localhost:8000/api/debug/ollama | jq .

# This will show:
# - What OLLAMA_HOST the backend is using
# - Whether it can connect to Ollama
# - What models are available
```

## Quick Fix Script

Run this script in your local project directory:

```bash
./scripts/fix-local-chat.sh
```

This script will:
1. Pull latest changes
2. Rebuild services with new configuration
3. Test Ollama connectivity
4. Download models if needed
5. Verify everything is working

## Manual Verification

After running the fix script, verify manually:

1. **Check services are running**:
   ```bash
   docker-compose ps
   ```

2. **Test Ollama directly**:
   ```bash
   curl -X POST http://localhost:11434/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen2.5-coder:7b",
       "messages": [{"role": "user", "content": "Hello"}],
       "stream": false
     }'
   ```

3. **Test via backend**:
   ```bash
   curl -s http://localhost:8000/api/debug/ollama
   ```

4. **Test in browser**:
   - Go to http://localhost:3000/chat
   - Login and create an agent with qwen2.5-coder:7b
   - Send a message and verify you get AI responses

## If Still Not Working

If you're still seeing "Local Development Mode" after following these steps:

1. **Check Docker Desktop settings** (if using Docker Desktop)
2. **Verify no firewall blocking** Docker network communication
3. **Check for conflicting local Ollama installation**
4. **Try using a different model** (e.g., `llama2:7b`)
5. **Check system resources** (Ollama needs sufficient RAM)

## Environment-Specific Notes

### macOS
- Docker Desktop may have different network behavior
- Check "Use Docker Compose V2" setting

### Windows
- WSL2 backend recommended
- Check Windows Defender firewall settings

### Linux
- Native Docker usually works best
- Check iptables rules if using custom firewall