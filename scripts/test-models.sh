#!/bin/bash

# Model Testing Script for AgentDB9
set -e

echo "🤖 Testing AgentDB9 Model Availability..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Ollama service
echo -e "\n📡 Testing Ollama Service..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama service is running${NC}"
    
    # Get available models
    echo -e "\n🔍 Checking available Ollama models..."
    MODELS=$(curl -s http://localhost:11434/api/tags | jq -r '.models[]?.name // empty' 2>/dev/null || echo "")
    
    if [ -n "$MODELS" ]; then
        echo "Available models:"
        echo "$MODELS" | while read -r model; do
            if [ -n "$model" ]; then
                echo -e "  ${GREEN}✅${NC} $model"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No models found. Run: npm run setup:ollama${NC}"
    fi
    
    # Test model inference
    echo -e "\n🧪 Testing model inference..."
    TEST_MODELS=("codellama:7b" "deepseek-coder:6.7b" "mistral:7b")
    
    for model in "${TEST_MODELS[@]}"; do
        echo -n "Testing $model... "
        
        RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
            -H "Content-Type: application/json" \
            -d "{\"model\":\"$model\",\"prompt\":\"Hello\",\"stream\":false}" \
            --max-time 30 2>/dev/null || echo "")
        
        if [ -n "$RESPONSE" ] && echo "$RESPONSE" | jq -e '.response' > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Working${NC}"
        else
            echo -e "${RED}❌ Not available${NC}"
        fi
    done
else
    echo -e "${RED}❌ Ollama service is not running${NC}"
fi

# Test LLM Service
echo -e "\n🔧 Testing LLM Service..."
if curl -s http://localhost:9000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ LLM Service is running${NC}"
    
    # Test model endpoint
    echo -n "Testing model API... "
    RESPONSE=$(curl -s http://localhost:9000/api/models 2>/dev/null || echo "")
    
    if [ -n "$RESPONSE" ] && echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Working${NC}"
        
        # Show available models
        echo -e "\n📋 Available models through LLM Service:"
        echo "$RESPONSE" | jq -r '.models[]? | "  \(.status == "available" and "✅" or "❌") \(.id) (\(.provider))"' 2>/dev/null || echo "  Could not parse models"
    else
        echo -e "${RED}❌ Not working${NC}"
    fi
    
    # Test model generation
    echo -e "\n🧪 Testing model generation..."
    GEN_RESPONSE=$(curl -s -X POST http://localhost:9000/api/generate \
        -H "Content-Type: application/json" \
        -d '{"prompt":"Hello, this is a test","modelId":"codellama:7b","provider":"ollama","maxTokens":50}' \
        --max-time 30 2>/dev/null || echo "")
    
    if [ -n "$GEN_RESPONSE" ] && echo "$GEN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Model generation working${NC}"
    else
        echo -e "${YELLOW}⚠️  Model generation may not be working${NC}"
    fi
else
    echo -e "${RED}❌ LLM Service is not running${NC}"
fi

# Test external API availability (check for API keys)
echo -e "\n🌐 Testing External API Configuration..."

# Check OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${GREEN}✅ OpenAI API key configured${NC}"
else
    echo -e "${YELLOW}⚠️  OpenAI API key not configured${NC}"
fi

# Check Anthropic
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo -e "${GREEN}✅ Anthropic API key configured${NC}"
else
    echo -e "${YELLOW}⚠️  Anthropic API key not configured${NC}"
fi

# Check HuggingFace
if [ -n "$HUGGINGFACE_API_KEY" ]; then
    echo -e "${GREEN}✅ HuggingFace API key configured${NC}"
else
    echo -e "${YELLOW}⚠️  HuggingFace API key not configured${NC}"
fi

echo -e "\n📊 Model Testing Summary"
echo "========================"

# Count working services
WORKING_SERVICES=0
TOTAL_SERVICES=2

if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    ((WORKING_SERVICES++))
fi

if curl -s http://localhost:9000/health > /dev/null 2>&1; then
    ((WORKING_SERVICES++))
fi

echo "Services: $WORKING_SERVICES/$TOTAL_SERVICES working"

if [ $WORKING_SERVICES -eq $TOTAL_SERVICES ]; then
    echo -e "${GREEN}✅ All model services are operational${NC}"
    exit 0
elif [ $WORKING_SERVICES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some model services are not working${NC}"
    exit 1
else
    echo -e "${RED}❌ No model services are working${NC}"
    exit 2
fi