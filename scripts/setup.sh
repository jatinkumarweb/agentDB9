#!/bin/bash

# AgentDB9 Setup Script
set -e

echo "🚀 Setting up AgentDB9 Coding Agent Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your API keys if needed."
fi

# Create Docker Compose override if it doesn't exist
if [ ! -f docker-compose.override.yml ]; then
    echo "📝 Creating docker-compose.override.yml from template..."
    cp docker-compose.override.yml.example docker-compose.override.yml
    echo "✅ Created docker-compose.override.yml for local development."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if Ollama is ready
echo "🤖 Checking Ollama service..."
if curl -f http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is ready"
    
    # Pull recommended models
    echo "📥 Pulling recommended Ollama models..."
    docker-compose exec -T ollama ollama pull codellama:7b
    docker-compose exec -T ollama ollama pull deepseek-coder:6.7b
    docker-compose exec -T ollama ollama pull mistral:7b
    echo "✅ Models downloaded successfully"
else
    echo "⚠️  Ollama is not ready yet. You can pull models later with: npm run setup:ollama"
fi

# Setup VS Code extensions
echo "🔧 Setting up VS Code extensions..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    curl -X POST http://localhost:8000/api/vscode/setup-extensions || echo "⚠️  VS Code extension setup will be available after backend starts"
else
    echo "⚠️  Backend not ready yet. VS Code extensions will be set up automatically."
fi

echo ""
echo "🎉 Setup complete! Your AgentDB9 environment is ready."
echo ""
echo "📍 Access your services:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   LLM Service:  http://localhost:9000"
echo "   VS Code:      http://localhost:8080"
echo "   Ollama:       http://localhost:11434"
echo "   Qdrant:       http://localhost:6333"
echo ""
echo "🔧 Useful commands:"
echo "   npm run dev           - Start development mode"
echo "   npm run logs          - View all service logs"
echo "   npm run setup:ollama  - Download Ollama models"
echo "   docker-compose down   - Stop all services"
echo ""
echo "📚 Check the README.md for more information and advanced usage."