#!/bin/bash

# Setup Ollama for Local Development
# This script sets up Ollama to work with AgentDB9 in local environments

echo "🚀 Setting up Ollama for AgentDB9 local development..."

# Check if Ollama is already running
if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "✅ Ollama is already running on port 11434"
else
    echo "📦 Starting Ollama..."
    
    # Kill any existing Ollama processes
    docker stop ollama-agentdb9 2>/dev/null || true
    docker rm ollama-agentdb9 2>/dev/null || true
    
    # Start Ollama in CPU-only mode
    docker run -d \
        --name ollama-agentdb9 \
        -p 11434:11434 \
        -v ollama_data:/root/.ollama \
        -e OLLAMA_ORIGINS=* \
        -e OLLAMA_HOST=0.0.0.0 \
        -e OLLAMA_NUM_PARALLEL=1 \
        -e OLLAMA_MAX_LOADED_MODELS=1 \
        --restart unless-stopped \
        ollama/ollama:latest
    
    echo "⏳ Waiting for Ollama to start..."
    sleep 10
    
    # Wait for Ollama to be ready
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
            echo "✅ Ollama is ready!"
            break
        fi
        echo "⏳ Waiting for Ollama... ($i/30)"
        sleep 2
    done
fi

# Check if model is already available
if curl -s http://localhost:11434/api/tags | grep -q "qwen2.5-coder:7b"; then
    echo "✅ Model qwen2.5-coder:7b is already available"
else
    echo "📥 Downloading qwen2.5-coder:7b model (this may take a few minutes)..."
    curl -X POST http://localhost:11434/api/pull \
        -H "Content-Type: application/json" \
        -d '{"name": "qwen2.5-coder:7b"}' \
        --silent --show-error
    echo "✅ Model downloaded successfully!"
fi

# Test the model
echo "🧪 Testing model..."
response=$(curl -s -X POST http://localhost:11434/api/chat \
    -H "Content-Type: application/json" \
    -d '{
        "model": "qwen2.5-coder:7b",
        "messages": [{"role": "user", "content": "Hello, are you working?"}],
        "stream": false
    }')

if echo "$response" | grep -q "assistant"; then
    echo "✅ Ollama is working correctly!"
    echo "🎉 Setup complete! You can now use AI chat in AgentDB9"
    echo ""
    echo "📝 Next steps:"
    echo "1. Restart your AgentDB9 backend: docker-compose restart backend"
    echo "2. Try sending a message in the chat interface"
    echo "3. The AI should now respond instead of showing the fallback message"
else
    echo "❌ Model test failed. Please check the logs."
    echo "Response: $response"
fi

echo ""
echo "🔧 Troubleshooting:"
echo "- If you still see fallback messages, restart the backend: docker-compose restart backend"
echo "- Check Ollama status: curl http://localhost:11434/api/version"
echo "- View available models: curl http://localhost:11434/api/tags"
echo "- Stop Ollama: docker stop ollama-agentdb9"