# Model Setup Guide

## Issue
The agent is not responding because no LLM models are installed in Ollama.

## Solution

### 1. Pull Required Models

Pull the default model used by agents:

```bash
docker-compose exec ollama ollama pull qwen2.5-coder:7b
```

This will download approximately 4.7GB and may take 5-15 minutes depending on your internet connection.

### 2. Verify Model Installation

```bash
docker-compose exec ollama ollama list
```

You should see:
```
NAME                    ID              SIZE      MODIFIED
qwen2.5-coder:7b        abc123...       4.7 GB    X minutes ago
```

### 3. Alternative Models

You can also install these models:

```bash
# Smaller, faster model (good for testing)
docker-compose exec ollama ollama pull codellama:7b

# Larger, more capable model
docker-compose exec ollama ollama pull deepseek-coder:6.7b
```

### 4. Test the Model

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5-coder:7b",
  "prompt": "Write a hello world in Python",
  "stream": false
}'
```

## Troubleshooting

### Models Not Persisting

If models disappear after restart, ensure the ollama_data volume is properly mounted:

```bash
docker-compose down
docker volume ls | grep ollama
docker-compose up -d ollama
```

### Slow Download

The model download happens inside the container. You can monitor progress:

```bash
docker-compose logs -f ollama
```

### Out of Disk Space

Models require significant disk space:
- qwen2.5-coder:7b: ~4.7GB
- codellama:7b: ~3.8GB  
- deepseek-coder:6.7b: ~3.7GB

Check available space:
```bash
df -h
```

## After Model Installation

1. Restart the backend to refresh model cache:
   ```bash
   docker-compose restart backend
   ```

2. Test in the UI:
   - Go to http://localhost:3000/chat
   - Select an agent
   - Send a message
   - You should see streaming responses

## Model Configuration

Agents are configured with models in the database. To change an agent's model:

1. Go to agent settings
2. Select a different model from the dropdown
3. Save changes

The system will automatically use available models and fall back gracefully if a model is not installed.
