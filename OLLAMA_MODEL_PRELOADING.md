# Ollama Model Preloading

## Overview

This configuration automatically preloads Ollama models when the container starts, eliminating the 9-10 second model loading delay on first request.

## How It Works

1. **Startup Script**: `scripts/ollama-preload.sh` runs when the Ollama container starts
2. **Model Download**: Pulls models if not already present
3. **Model Loading**: Runs a simple prompt to load each model into memory
4. **Ready State**: Models stay loaded for 30 minutes (configurable via `OLLAMA_KEEP_ALIVE`)

## Configuration

### Single Model

```yaml
environment:
  - PRELOAD_MODELS=llama3.1:latest
```

### Multiple Models

```yaml
environment:
  - PRELOAD_MODELS=llama3.1:latest,qwen2.5-coder:7b,phi3:mini
  - OLLAMA_MAX_LOADED_MODELS=3  # Increase to match number of models
```

## Current Setup

**Preloaded Models:**
- `llama3.1:latest` - General purpose LLM (4.9 GB)
- `qwen2.5-coder:7b` - Code-focused model (4.7 GB)

**Settings:**
```yaml
OLLAMA_NUM_PARALLEL=1          # Single request for better performance
OLLAMA_MAX_LOADED_MODELS=2     # Keep two models loaded
OLLAMA_KEEP_ALIVE=30m          # Keep models in memory for 30 minutes
OLLAMA_NUM_CTX=4096            # Context window (matches model capability)
OLLAMA_NUM_THREAD=4            # Use all 4 CPU cores
OLLAMA_NUM_GPU=0               # No GPU available
```

## Performance Impact

### Without Preloading
```
First Request:  9-10 seconds (model loading) + 5-15 seconds (generation) = 14-25 seconds
Second Request: 5-15 seconds (generation only)
```

### With Preloading
```
First Request:  5-15 seconds (generation only) ✅
Second Request: 5-15 seconds (generation only)
```

**Benefit:** Eliminates 9-10 second delay on first request after container start.

## Startup Time

**Container Startup:**
- Ollama server: ~5 seconds
- Model 1 download + load: ~30-60 seconds (first time only)
- Model 2 download + load: ~30-60 seconds (first time only)
- **Total first startup:** ~1-2 minutes
- **Subsequent startups:** ~20-40 seconds (models already downloaded)

## Memory Usage

**Per Model (Approximate):**
- Small models (1-3B): 2-4 GB RAM
- Medium models (7-8B): 4-6 GB RAM
- Large models (13B+): 8-12 GB RAM

**Current Configuration:**
- llama3.1:latest: ~5 GB RAM
- qwen2.5-coder:7b: ~5 GB RAM
- **Total:** ~10 GB RAM (within 8 GB limit due to quantization)

## Recommended Models for CPU

### Fast (Best for Development)
```yaml
PRELOAD_MODELS=phi3:mini,qwen2.5-coder:1.5b
```
- Response time: 2-5 seconds
- Memory: ~4 GB total
- Good quality

### Balanced (Good Quality)
```yaml
PRELOAD_MODELS=llama3.1:latest,qwen2.5-coder:7b
```
- Response time: 5-15 seconds
- Memory: ~10 GB total
- Better quality

### Best Quality (Slower)
```yaml
PRELOAD_MODELS=llama3.1:latest,qwen2.5-coder:14b
```
- Response time: 15-30 seconds
- Memory: ~12 GB total
- Best quality

## Troubleshooting

### Models Not Loading

Check container logs:
```bash
docker logs agentdb9-ollama-1 | grep -E "(Processing model|Model.*loaded|All models preloaded)"
```

Expected output:
```
Processing model: llama3.1:latest
Model llama3.1:latest is now loaded!
Processing model: qwen2.5-coder:7b
Model qwen2.5-coder:7b is now loaded!
All models preloaded and ready!
Ollama is ready to accept requests
```

### Out of Memory

**Symptoms:**
- Container crashes
- Models fail to load
- Slow performance

**Solutions:**
1. Reduce number of models:
   ```yaml
   PRELOAD_MODELS=llama3.1:latest  # Only one model
   OLLAMA_MAX_LOADED_MODELS=1
   ```

2. Use smaller models:
   ```yaml
   PRELOAD_MODELS=phi3:mini,qwen2.5-coder:1.5b
   ```

3. Increase memory limit:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 12G  # Increase from 8G
   ```

### Slow Startup

**Normal:** 1-2 minutes on first startup (downloading models)

**If taking longer:**
1. Check download progress:
   ```bash
   docker logs -f agentdb9-ollama-1
   ```

2. Check network speed:
   ```bash
   docker exec agentdb9-ollama-1 curl -o /dev/null https://ollama.ai/
   ```

3. Pre-download models manually:
   ```bash
   docker exec agentdb9-ollama-1 ollama pull llama3.1:latest
   docker exec agentdb9-ollama-1 ollama pull qwen2.5-coder:7b
   docker-compose restart ollama
   ```

## Verification

### Check Loaded Models
```bash
docker exec agentdb9-ollama-1 ollama list
```

### Test Model Response
```bash
# Test llama3.1
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:latest",
  "prompt": "Hello",
  "stream": false
}'

# Test qwen2.5-coder
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5-coder:7b",
  "prompt": "Write a hello world in Python",
  "stream": false
}'
```

### Check Response Time
```bash
time curl -s http://localhost:11434/api/generate -d '{
  "model": "llama3.1:latest",
  "prompt": "Say hello",
  "stream": false
}' | jq -r '.response'
```

Expected: 5-15 seconds (no loading delay)

## Customization

### Change Models

Edit `docker-compose.yml`:
```yaml
environment:
  - PRELOAD_MODELS=your-model-1,your-model-2
  - OLLAMA_MAX_LOADED_MODELS=2  # Match number of models
```

Restart:
```bash
docker-compose restart ollama
```

### Disable Preloading

Remove or comment out:
```yaml
environment:
  # - PRELOAD_MODELS=llama3.1:latest,qwen2.5-coder:7b
```

Or set to empty:
```yaml
environment:
  - PRELOAD_MODELS=
```

### Adjust Keep-Alive Time

```yaml
environment:
  - OLLAMA_KEEP_ALIVE=1h   # Keep models loaded for 1 hour
  # or
  - OLLAMA_KEEP_ALIVE=5m   # Keep models loaded for 5 minutes (default)
```

## Files

- `docker-compose.yml` - Ollama service configuration
- `scripts/ollama-preload.sh` - Startup script that preloads models
- `OLLAMA_PERFORMANCE_OPTIMIZATION.md` - General performance optimization guide

## Benefits

✅ **No First-Request Delay** - Models are already loaded
✅ **Multiple Models Ready** - Switch between models instantly
✅ **Automatic** - Happens on container start
✅ **Configurable** - Easy to add/remove models
✅ **Persistent** - Models stay loaded for 30 minutes

## Trade-offs

⚠️ **Longer Startup** - Container takes 1-2 minutes to start (first time)
⚠️ **More Memory** - Multiple models consume more RAM
⚠️ **Disk Space** - Each model requires 2-5 GB storage

## Summary

Model preloading eliminates the 9-10 second loading delay by loading models into memory during container startup. This is especially useful for:

- Development environments (no waiting on first request)
- Production systems (consistent response times)
- Multi-model applications (switch between models instantly)

The trade-off is longer container startup time and higher memory usage, but the improved user experience is worth it for most use cases.
