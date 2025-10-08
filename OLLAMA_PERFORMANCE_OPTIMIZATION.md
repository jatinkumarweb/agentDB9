# Ollama Performance Optimization

## Current Issue

**Symptom:** Ollama responses are very slow
**Log shows:** `llama runner started in 9.90 seconds`

## Understanding the Logs

### What the 9.9 seconds means:

```
time=2025-10-08T17:02:24.613Z level=INFO source=server.go:1289 msg="llama runner started in 9.90 seconds"
```

This is **model loading time**, not response time. This happens when:
1. First request after Ollama starts
2. Model is loaded from disk into memory
3. Model initialization and setup

**This is normal** for the first request. Subsequent requests should be much faster.

### Key Information from Logs:

```
llama_context: n_ctx_per_seq (4096) < n_ctx_train (131072)
```
- **Context window:** 4096 tokens (current)
- **Model capacity:** 131072 tokens (maximum)
- **Issue:** Using only 3% of model's capacity

```
llama_context:        CPU  output buffer size =     0.50 MiB
llama_kv_cache_unified:        CPU KV buffer size =   512.00 MiB
llama_context:        CPU compute buffer size =   300.01 MiB
```
- **Running on CPU** (no GPU acceleration)
- **Memory allocated:** ~812 MB for model

## Root Causes of Slow Performance

### 1. CPU-Only Execution (Main Issue)
**Impact:** 10-100x slower than GPU
**Current:** Running on CPU
**Ideal:** GPU acceleration

### 2. Small Context Window
**Current:** 4096 tokens
**Model supports:** 131072 tokens
**Impact:** Limits conversation length, not performance

### 3. Model Size
**Larger models = Slower on CPU**
- 7B parameters: Moderate speed
- 13B parameters: Slow
- 70B+ parameters: Very slow

### 4. Resource Constraints
**Current allocation:**
- CPUs: 6 cores
- Memory: 8GB
- No GPU

## Optimizations

### Optimization 1: Increase Context Window (Quick Win)

**Current:**
```yaml
environment:
  - OLLAMA_NUM_PARALLEL=2
  - OLLAMA_MAX_LOADED_MODELS=2
  - OLLAMA_KEEP_ALIVE=5m
```

**Add:**
```yaml
environment:
  - OLLAMA_NUM_PARALLEL=2
  - OLLAMA_MAX_LOADED_MODELS=2
  - OLLAMA_KEEP_ALIVE=5m
  - OLLAMA_NUM_CTX=8192          # Increase context window
  - OLLAMA_NUM_THREAD=6          # Use all 6 CPU cores
  - OLLAMA_NUM_GPU=0             # Explicitly disable GPU (not available)
```

**Benefits:**
- Larger context for conversations
- Better CPU utilization
- Explicit configuration

### Optimization 2: Use Smaller/Faster Models

**Slow models (CPU):**
- `llama3:70b` - Very slow
- `codellama:34b` - Slow
- `mistral:7b-instruct` - Moderate

**Fast models (CPU):**
- `llama3.2:3b` - Fast
- `phi3:mini` - Very fast
- `qwen2.5-coder:1.5b` - Fastest

**Recommendation:**
```bash
# Pull a faster model
docker-compose exec ollama ollama pull qwen2.5-coder:7b

# Or even faster
docker-compose exec ollama ollama pull phi3:mini
```

### Optimization 3: Reduce Parallel Requests

**Current:**
```yaml
- OLLAMA_NUM_PARALLEL=2
```

**Change to:**
```yaml
- OLLAMA_NUM_PARALLEL=1  # Focus on one request at a time
```

**Benefits:**
- All CPU power for single request
- Faster individual responses
- Better for single-user scenarios

### Optimization 4: Increase CPU Allocation

**Current:**
```yaml
deploy:
  resources:
    limits:
      cpus: '6.0'
```

**If you have more cores:**
```yaml
deploy:
  resources:
    limits:
      cpus: '8.0'  # Or more if available
      memory: 12G  # More memory helps
```

### Optimization 5: Model Quantization

Use quantized models for faster inference:

**Full precision (slow):**
- `llama3:7b` (7B parameters, full precision)

**Quantized (faster):**
- `llama3:7b-q4_0` (4-bit quantization, 2-3x faster)
- `llama3:7b-q4_K_M` (4-bit, medium quality)
- `llama3:7b-q5_K_M` (5-bit, better quality)

**Pull quantized model:**
```bash
docker-compose exec ollama ollama pull llama3:7b-q4_0
```

## Recommended Configuration

### For Best Performance on CPU:

```yaml
ollama:
  image: ollama/ollama:latest
  platform: linux/amd64
  ports:
    - "11434:11434"
  volumes:
    - ./ollama_data:/root/.ollama
  environment:
    - OLLAMA_ORIGINS=*
    - OLLAMA_HOST=0.0.0.0
    - OLLAMA_NUM_PARALLEL=1        # Single request at a time
    - OLLAMA_MAX_LOADED_MODELS=1   # Keep one model loaded
    - OLLAMA_KEEP_ALIVE=30m        # Keep model in memory longer
    - OLLAMA_NUM_CTX=8192          # Larger context
    - OLLAMA_NUM_THREAD=8          # Use all available cores
    - OLLAMA_NUM_GPU=0             # No GPU
  runtime: runc
  deploy:
    resources:
      limits:
        cpus: '8.0'                # More CPUs
        memory: 12G                # More memory
      reservations:
        cpus: '6.0'
        memory: 8G
```

### Recommended Models for CPU:

**Fastest (for quick responses):**
```bash
ollama pull phi3:mini           # 3.8B params, very fast
ollama pull qwen2.5-coder:1.5b  # 1.5B params, fastest
```

**Balanced (good quality, reasonable speed):**
```bash
ollama pull qwen2.5-coder:7b-q4_0  # 7B params, quantized
ollama pull llama3.2:3b            # 3B params, good quality
```

**Best Quality (slower but better):**
```bash
ollama pull llama3:8b-q4_0         # 8B params, quantized
ollama pull codellama:7b-q4_0      # 7B params, code-focused
```

## Testing Performance

### Test 1: Check Model Loading Time

```bash
# First request (will load model)
time curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Hello",
  "stream": false
}'
```

**Expected:**
- First request: 5-15 seconds (includes loading)
- Subsequent requests: 1-5 seconds

### Test 2: Check Response Generation Time

```bash
# Subsequent request (model already loaded)
time curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Write a hello world in Python",
  "stream": false
}'
```

**Expected:**
- Small models (1-3B): 1-3 seconds
- Medium models (7-8B): 3-10 seconds
- Large models (13B+): 10-30+ seconds

### Test 3: Streaming Response

```bash
# Streaming gives faster perceived performance
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Explain Docker",
  "stream": true
}'
```

**Expected:**
- Tokens start appearing immediately
- Feels much faster than waiting for complete response

## Understanding Performance Metrics

### Tokens per Second (tok/s)

**CPU Performance:**
- Fast model (3B): 10-20 tok/s
- Medium model (7B): 5-10 tok/s
- Large model (13B+): 1-5 tok/s

**GPU Performance (for comparison):**
- Fast model (3B): 50-100 tok/s
- Medium model (7B): 30-60 tok/s
- Large model (13B+): 10-30 tok/s

### Response Time Breakdown

**Total time = Loading + Generation + Network**

1. **Model Loading (first request only):**
   - Small model: 2-5 seconds
   - Medium model: 5-10 seconds
   - Large model: 10-20 seconds

2. **Token Generation:**
   - Depends on model size and CPU
   - 100 tokens at 10 tok/s = 10 seconds
   - 100 tokens at 5 tok/s = 20 seconds

3. **Network Overhead:**
   - Usually negligible (<100ms)

## Quick Wins (Immediate Improvements)

### 1. Use Smaller Model
```bash
# Switch to faster model
docker-compose exec ollama ollama pull phi3:mini
```

### 2. Increase Keep-Alive
```yaml
- OLLAMA_KEEP_ALIVE=30m  # Keep model loaded longer
```

### 3. Single Parallel Request
```yaml
- OLLAMA_NUM_PARALLEL=1  # Focus on one request
```

### 4. More CPU Threads
```yaml
- OLLAMA_NUM_THREAD=8    # Use all cores
```

### 5. Enable Streaming
In your application, use streaming responses:
```javascript
// Instead of waiting for complete response
const response = await ollama.generate({
  model: 'phi3:mini',
  prompt: 'Hello',
  stream: true  // Enable streaming
});
```

## Realistic Expectations

### On CPU (No GPU):

**Small Models (1-3B):**
- ✅ Usable for development
- ✅ Quick responses (2-5 seconds)
- ✅ Good for simple tasks

**Medium Models (7-8B):**
- ⚠️ Slower but acceptable (5-15 seconds)
- ⚠️ Better quality
- ⚠️ Good for production with patience

**Large Models (13B+):**
- ❌ Very slow (15-60+ seconds)
- ❌ Not practical for interactive use
- ❌ Consider GPU or cloud API

### With GPU:

**Any Model:**
- ✅ 5-10x faster
- ✅ Interactive performance
- ✅ Production-ready

## Monitoring Performance

### Check Current Performance:

```bash
# Watch Ollama logs
docker-compose logs -f ollama

# Check resource usage
docker stats agentdb9-ollama-1

# Test response time
time curl http://localhost:11434/api/generate -d '{
  "model": "phi3:mini",
  "prompt": "Hello",
  "stream": false
}'
```

### Performance Indicators:

**Good Performance:**
- Model loads in <10 seconds
- Responses in <5 seconds
- CPU usage 80-100% during generation
- Memory stable

**Poor Performance:**
- Model loads in >20 seconds
- Responses in >30 seconds
- CPU usage <50%
- Memory swapping

## Summary

**The 9.9 seconds is normal** - it's model loading time, not response time.

**To improve actual response speed:**

1. ✅ **Use smaller models** (phi3:mini, qwen2.5-coder:1.5b)
2. ✅ **Increase OLLAMA_NUM_THREAD** to use all CPU cores
3. ✅ **Set OLLAMA_NUM_PARALLEL=1** for single-user scenarios
4. ✅ **Increase OLLAMA_KEEP_ALIVE** to keep model loaded
5. ✅ **Use quantized models** (q4_0, q4_K_M)
6. ✅ **Enable streaming** for better perceived performance
7. ⚠️ **Consider GPU** for 10x performance boost

**Realistic CPU performance:**
- Small models: 2-5 seconds per response
- Medium models: 5-15 seconds per response
- Large models: 15-60+ seconds per response

---

**Date:** 2025-10-08
**Issue:** Slow Ollama responses on CPU
**Solution:** Optimize configuration and use smaller models
