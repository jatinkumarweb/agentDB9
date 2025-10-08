#!/bin/bash
set -e

echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama to be ready..."
sleep 5

# Wait for Ollama API to be available
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        echo "Ollama is ready!"
        break
    fi
    echo "Waiting for Ollama API... ($i/30)"
    sleep 1
done

# Preload models if specified (comma-separated list)
if [ -n "$PRELOAD_MODELS" ]; then
    IFS=',' read -ra MODELS <<< "$PRELOAD_MODELS"
    
    for MODEL in "${MODELS[@]}"; do
        MODEL=$(echo "$MODEL" | xargs)  # Trim whitespace
        echo "Processing model: $MODEL"
        
        # Pull model if not present
        if ! ollama list | grep -q "$MODEL"; then
            echo "Pulling model $MODEL..."
            ollama pull "$MODEL" || echo "Warning: Failed to pull model $MODEL"
        else
            echo "Model $MODEL already exists"
        fi
        
        # Load model into memory with a simple prompt
        echo "Loading model $MODEL into memory..."
        ollama run "$MODEL" "Ready" --verbose=false 2>/dev/null || echo "Warning: Failed to preload model $MODEL"
        
        echo "Model $MODEL is now loaded!"
    done
    
    echo "All models preloaded and ready!"
else
    echo "No PRELOAD_MODELS specified, skipping preload"
fi

# Keep the server running
echo "Ollama is ready to accept requests"
wait $OLLAMA_PID
