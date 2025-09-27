# Local Setup Troubleshooting Guide

## Issue: Chat shows "Local Development Mode" instead of AI responses

### Quick Diagnosis Commands

Run these commands in your local project directory:

```bash
# 1. Check all services are running
docker-compose ps

# 2. Check Ollama connectivity
curl -s http://localhost:11434/api/version

# 3. Check downloaded models
curl -s http://localhost:11434/api/tags

# 4. Check backend can reach Ollama
docker-compose exec backend curl -s http://ollama:11434/api/version

# 5. Check backend environment
docker-compose exec backend printenv | grep OLLAMA
```

### Common Issues and Solutions

#### Issue 1: Services Not Running
**Symptoms:** `docker-compose ps` shows services as not running
**Solution:**
```bash
# Pull latest changes
git pull origin main

# Rebuild and start services
docker-compose down
docker-compose up --build -d

# Check status
docker-compose ps
```

#### Issue 2: Ollama Not Accessible
**Symptoms:** `curl http://localhost:11434/api/version` fails
**Solution:**
```bash
# Restart Ollama service
docker-compose restart ollama

# Check Ollama logs
docker-compose logs ollama

# Verify Ollama is running
docker-compose exec ollama ollama --version
```

#### Issue 3: No Models Downloaded
**Symptoms:** `curl http://localhost:11434/api/tags` returns empty models array
**Solution:**
```bash
# Download a model directly (any of these will work)
docker-compose exec ollama ollama pull qwen2.5-coder:7b
docker-compose exec ollama ollama pull starcoder2:7b
docker-compose exec ollama ollama pull codellama:7b

# Or use the web interface
# 1. Go to http://localhost:3000/models
# 2. Login with demo credentials
# 3. Download any available model
```

#### Issue 3b: Wrong Model Configured
**Symptoms:** Chat shows "Local Development Mode" but models are downloaded
**Solution:**
The system now automatically uses any available model if the configured one isn't found. Check backend logs for model fallback messages:
```bash
docker-compose logs backend | grep -i "model.*not available"
```

#### Issue 4: Backend Can't Reach Ollama
**Symptoms:** Backend logs show Ollama connection errors
**Solution:**
```bash
# Restart backend with new configuration
docker-compose restart backend

# Check backend logs
docker-compose logs backend | grep -i ollama

# Verify network connectivity
docker-compose exec backend ping ollama
```

#### Issue 5: Old Environment Variables
**Symptoms:** Backend still uses `host.docker.internal:11434`
**Solution:**
```bash
# Ensure you have latest changes
git pull origin main

# Rebuild services to pick up new environment
docker-compose down
docker-compose up --build -d
```

### Step-by-Step Local Setup

1. **Ensure Latest Code:**
   ```bash
   git pull origin main
   ```

2. **Clean Start:**
   ```bash
   docker-compose down -v
   docker-compose up --build -d
   ```

3. **Wait for Services:**
   ```bash
   # Wait ~30 seconds for all services to start
   docker-compose ps
   ```

4. **Download a Model:**
   ```bash
   # Option A: Via command line
   docker-compose exec ollama ollama pull qwen2.5-coder:7b
   
   # Option B: Via web interface
   # Go to http://localhost:3000/models and download
   ```

5. **Create an Agent:**
   ```bash
   # Go to http://localhost:3000/chat
   # Create a new agent with qwen2.5-coder:7b model
   ```

6. **Test Chat:**
   ```bash
   # Send a message and verify you get AI responses
   ```

### Verification Commands

After setup, verify everything works:

```bash
# 1. All services healthy
docker-compose ps | grep -v "Exit"

# 2. Ollama accessible
curl -s http://localhost:11434/api/version

# 3. Model available
curl -s http://localhost:11434/api/tags | grep qwen2.5-coder

# 4. Backend can reach Ollama
docker-compose exec backend curl -s http://ollama:11434/api/tags

# 5. LLM service shows model as available
curl -s http://localhost:9000/api/models | grep qwen2.5-coder
```

### Expected Outputs

**Healthy docker-compose ps:**
```
NAME                     STATUS
agentdb9-backend-1       Up (healthy)
agentdb9-frontend-1      Up
agentdb9-llm-service-1   Up
agentdb9-ollama-1        Up
agentdb9-postgres-1      Up
agentdb9-qdrant-1        Up
agentdb9-redis-1         Up
```

**Ollama version:**
```json
{"version":"0.12.3"}
```

**Downloaded model:**
```json
{"models":[{"name":"qwen2.5-coder:7b",...}]}
```

### Still Having Issues?

If you're still seeing "Local Development Mode":

1. **Check backend logs:**
   ```bash
   docker-compose logs backend | tail -50
   ```

2. **Check conversation service logs:**
   ```bash
   docker-compose logs backend | grep -i "ollama\|conversation"
   ```

3. **Verify agent configuration:**
   - Ensure your agent is configured to use `qwen2.5-coder:7b`
   - Check that the model name matches exactly

4. **Test Ollama directly:**
   ```bash
   curl -X POST http://localhost:11434/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen2.5-coder:7b",
       "messages": [{"role": "user", "content": "Hello"}],
       "stream": false
     }'
   ```

If this test works but the chat doesn't, the issue is in the backend integration.