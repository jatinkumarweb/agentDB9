#!/bin/bash
# Validate docker-compose files for Mac

echo "Validating docker-compose configuration for Mac..."
echo ""

# Check if on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  This script is for macOS only"
    exit 1
fi

# Validate compose files
echo "Checking compose file syntax..."
if docker-compose -f docker-compose.yml -f docker-compose.arm64.yml -f docker-compose.mac.yml config > /dev/null 2>&1; then
    echo "✅ Compose files are valid"
else
    echo "❌ Compose file validation failed"
    echo ""
    echo "Running validation with output:"
    docker-compose -f docker-compose.yml -f docker-compose.arm64.yml -f docker-compose.mac.yml config
    exit 1
fi

echo ""
echo "Checking vscode service configuration..."
docker-compose -f docker-compose.yml -f docker-compose.arm64.yml -f docker-compose.mac.yml config --services | grep vscode
if [ $? -eq 0 ]; then
    echo "✅ vscode service found"
else
    echo "❌ vscode service not found"
    exit 1
fi

echo ""
echo "✅ All validations passed"
echo ""
echo "You can now run: npm run dev"
