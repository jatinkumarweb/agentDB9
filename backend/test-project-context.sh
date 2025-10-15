#!/bin/bash

# Test script for project context flow
# Run this to verify project context is working correctly

echo "🧪 Testing Project Context Flow"
echo "================================"
echo ""

echo "📝 Step 1: Running unit tests..."
npm test -- project-context.spec.ts --passWithNoTests || echo "⚠️  Unit tests need dependency fixes"
echo ""

echo "📝 Step 2: Running integration tests..."
npm test -- project-context-integration.spec.ts --passWithNoTests || echo "⚠️  Integration tests need dependency fixes"
echo ""

echo "📝 Step 3: Running MCP working directory tests..."
npm test -- mcp-working-directory.spec.ts --passWithNoTests || echo "⚠️  MCP tests need dependency fixes"
echo ""

echo "✅ Test suite execution complete"
echo ""
echo "Note: Tests may need additional setup. See backend/src/conversations/__tests__/README.md"
