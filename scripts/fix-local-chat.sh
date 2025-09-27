#!/bin/bash

# Fix Local Chat Functionality Script
# This script resolves the "Local Development Mode" issue

set -e

echo "🔧 Fixing Local Chat Functionality..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop services
echo "🛑 Stopping services..."
docker-compose down

# Rebuild and start services
echo "🔨 Rebuilding and starting services..."
docker-compose up --build -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "📊 Checking service status..."
docker-compose ps

# Check if Ollama is accessible
echo ""
echo "🔍 Testing Ollama connectivity..."
if curl -s http://localhost:11434/api/version > /dev/null; then
    echo "✅ Ollama is accessible"
    OLLAMA_VERSION=$(curl -s http://localhost:11434/api/version | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "   Version: $OLLAMA_VERSION"
else
    echo "❌ Ollama is not accessible"
    echo "   Checking Ollama logs..."
    docker-compose logs ollama | tail -10
    exit 1
fi

# Check if backend can reach Ollama
echo ""
echo "🔍 Testing backend -> Ollama connectivity..."
if docker-compose exec -T backend curl -s http://ollama:11434/api/version > /dev/null; then
    echo "✅ Backend can reach Ollama"
else
    echo "❌ Backend cannot reach Ollama"
    echo "   Checking backend environment..."
    docker-compose exec -T backend printenv | grep OLLAMA
    exit 1
fi

# Check downloaded models
echo ""
echo "🔍 Checking downloaded models..."
MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | wc -l)
if [ "$MODELS" -gt 0 ]; then
    echo "✅ Found $MODELS downloaded model(s):"
    curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/   - /'
else
    echo "⚠️  No models downloaded. Downloading qwen2.5-coder:7b..."
    echo "   This may take several minutes..."
    docker-compose exec -T ollama ollama pull qwen2.5-coder:7b
    echo "✅ Model downloaded successfully"
fi

# Test LLM service
echo ""
echo "🔍 Testing LLM service..."
if curl -s http://localhost:9000/api/models > /dev/null; then
    echo "✅ LLM service is accessible"
    AVAILABLE_MODELS=$(curl -s http://localhost:9000/api/models | grep -o '"status":"available"' | wc -l)
    echo "   Available models: $AVAILABLE_MODELS"
else
    echo "❌ LLM service is not accessible"
    docker-compose logs llm-service | tail -10
fi

# Test a simple chat request
echo ""
echo "🔍 Testing Ollama chat functionality..."
CHAT_TEST=$(curl -s -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:7b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }' | grep -o '"content":"[^"]*"' | head -1)

if [ -n "$CHAT_TEST" ]; then
    echo "✅ Ollama chat is working"
    echo "   Response: $CHAT_TEST"
else
    echo "❌ Ollama chat test failed"
    echo "   Make sure qwen2.5-coder:7b model is downloaded"
fi

echo ""
echo "🎉 Setup complete! Try the following:"
echo ""
echo "1. Open http://localhost:3000/chat"
echo "2. Login with demo credentials:"
echo "   Email: demo@agentdb9.com"
echo "   Password: demo123"
echo "3. Create a new agent with qwen2.5-coder:7b model"
echo "4. Start a conversation and send a message"
echo ""
echo "If you still see 'Local Development Mode', check the backend logs:"
echo "   docker-compose logs backend | grep -i ollama"
echo ""