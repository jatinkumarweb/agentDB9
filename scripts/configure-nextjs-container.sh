#!/bin/bash

# Configure Next.js project for Docker container environment
# This script updates package.json and next.config to work properly in containers

set -e

if [ $# -lt 1 ]; then
  echo "Usage: ./configure-nextjs-container.sh <project-directory>"
  echo "Example: ./configure-nextjs-container.sh ./my-nextjs-app"
  exit 1
fi

PROJECT_DIR=$1

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: Directory '$PROJECT_DIR' does not exist"
  exit 1
fi

if [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo "Error: No package.json found in '$PROJECT_DIR'"
  exit 1
fi

echo "Configuring Next.js project for container environment..."

# Update package.json scripts to bind to 0.0.0.0
cd "$PROJECT_DIR"

# Use npm pkg to update scripts
npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
npm pkg set scripts.start="next start -H 0.0.0.0"

echo "✅ Updated package.json scripts to bind to 0.0.0.0"

# Create/update next.config file
if [ -f "next.config.ts" ]; then
  CONFIG_FILE="next.config.ts"
elif [ -f "next.config.js" ]; then
  CONFIG_FILE="next.config.js"
else
  CONFIG_FILE="next.config.ts"
fi

cat > "$CONFIG_FILE" << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for production Docker builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Ensure static files are served correctly
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  
  // Configure for container environment
  experimental: {
    turbopack: {
      resolveAlias: {},
    },
  },
};

export default nextConfig;
EOF

echo "✅ Updated $CONFIG_FILE for container environment"

echo ""
echo "Configuration complete! You can now run:"
echo "  cd $PROJECT_DIR"
echo "  npm run dev"
echo ""
echo "The dev server will be accessible from outside the container."
