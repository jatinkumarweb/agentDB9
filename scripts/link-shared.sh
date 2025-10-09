#!/bin/bash

# Script to ensure @agentdb9/shared is properly linked in all workspaces
# This is needed because npm workspaces sometimes don't create the symlinks properly

set -e

echo "Building shared package..."
cd shared
npm run build
cd ..

echo "Linking shared package to backend..."
mkdir -p backend/node_modules/@agentdb9/shared
cp -r shared/dist backend/node_modules/@agentdb9/shared/
cp shared/package.json backend/node_modules/@agentdb9/shared/

echo "Linking shared package to frontend..."
mkdir -p frontend/node_modules/@agentdb9/shared
cp -r shared/dist frontend/node_modules/@agentdb9/shared/
cp shared/package.json frontend/node_modules/@agentdb9/shared/

echo "Linking shared package to llm-service..."
mkdir -p llm-service/node_modules/@agentdb9/shared
cp -r shared/dist llm-service/node_modules/@agentdb9/shared/
cp shared/package.json llm-service/node_modules/@agentdb9/shared/

echo "Linking shared package to mcp-server..."
mkdir -p mcp-server/node_modules/@agentdb9/shared
cp -r shared/dist mcp-server/node_modules/@agentdb9/shared/
cp shared/package.json mcp-server/node_modules/@agentdb9/shared/

echo "✓ Shared package linked successfully to all workspaces"
