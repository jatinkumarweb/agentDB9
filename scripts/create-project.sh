#!/bin/bash

# Project Creation Helper Script
# Handles interactive prompts for various frameworks

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_usage() {
  echo -e "${BLUE}Project Creation Helper${NC}"
  echo ""
  echo "Usage: ./create-project.sh <framework> <project-name> [options]"
  echo ""
  echo -e "${YELLOW}Frameworks:${NC}"
  echo "  nextjs          - Next.js with TypeScript and Tailwind"
  echo "  nextjs-js       - Next.js with JavaScript"
  echo "  nextjs-minimal  - Next.js minimal setup"
  echo "  react           - React with TypeScript"
  echo "  react-js        - React with JavaScript"
  echo "  vite-react      - Vite + React + TypeScript"
  echo "  vite-vue        - Vite + Vue + TypeScript"
  echo "  vite-svelte     - Vite + Svelte + TypeScript"
  echo "  node            - Node.js project with package.json"
  echo "  express         - Express.js API server"
  echo ""
  echo -e "${YELLOW}Examples:${NC}"
  echo "  ./create-project.sh nextjs my-awesome-app"
  echo "  ./create-project.sh react my-react-app"
  echo "  ./create-project.sh vite-react my-vite-app"
  echo "  ./create-project.sh node my-api"
  echo ""
  echo -e "${YELLOW}Options:${NC}"
  echo "  --skip-install  Skip npm install"
  echo "  --use-pnpm      Use pnpm instead of npm"
  echo "  --use-yarn      Use yarn instead of npm"
  echo ""
}

if [ $# -lt 2 ]; then
  show_usage
  exit 1
fi

FRAMEWORK=$1
PROJECT_NAME=$2
SKIP_INSTALL=false
PACKAGE_MANAGER="npm"

# Parse options
shift 2
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-install)
      SKIP_INSTALL=true
      shift
      ;;
    --use-pnpm)
      PACKAGE_MANAGER="pnpm"
      shift
      ;;
    --use-yarn)
      PACKAGE_MANAGER="yarn"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_usage
      exit 1
      ;;
  esac
done

# Check if project directory already exists
if [ -d "$PROJECT_NAME" ]; then
  echo -e "${RED}❌ Error: Directory '$PROJECT_NAME' already exists${NC}"
  exit 1
fi

case $FRAMEWORK in
  nextjs)
    echo -e "${GREEN}🚀 Creating Next.js project: $PROJECT_NAME${NC}"
    echo "   TypeScript + Tailwind + ESLint + App Router"
    npx create-next-app@latest "$PROJECT_NAME" \
      --typescript \
      --tailwind \
      --eslint \
      --app \
      --no-src-dir \
      --import-alias "@/*" \
      --turbopack \
      --use-$PACKAGE_MANAGER \
      --yes
    
    # Configure for container environment
    echo -e "${BLUE}📦 Configuring for container environment...${NC}"
    cd "$PROJECT_NAME"
    npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
    npm pkg set scripts.start="next start -H 0.0.0.0"
    
    # Fix next.config for static files in containers
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for development in containers
  // This prevents 404s on static images
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Ensure static files are served correctly
  assetPrefix: process.env.ASSET_PREFIX || '',
  
  // Configure for container environment
  experimental: {
    turbopack: {
      resolveAlias: {},
    },
  },
};

export default nextConfig;
EOF
    
    cd ..
    echo -e "${GREEN}✅ Container configuration complete${NC}"
    ;;
  
  nextjs-js)
    echo -e "${GREEN}🚀 Creating Next.js project (JavaScript): $PROJECT_NAME${NC}"
    npx create-next-app@latest "$PROJECT_NAME" \
      --javascript \
      --tailwind \
      --eslint \
      --app \
      --no-src-dir \
      --import-alias "@/*" \
      --turbopack \
      --use-$PACKAGE_MANAGER \
      --yes
    
    # Configure for container environment
    echo -e "${BLUE}📦 Configuring for container environment...${NC}"
    cd "$PROJECT_NAME"
    npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
    npm pkg set scripts.start="next start -H 0.0.0.0"
    
    # Fix next.config for static files in containers
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for development in containers
  // This prevents 404s on static images
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Ensure static files are served correctly
  assetPrefix: process.env.ASSET_PREFIX || '',
  
  // Configure for container environment
  experimental: {
    turbopack: {
      resolveAlias: {},
    },
  },
};

export default nextConfig;
EOF
    
    cd ..
    echo -e "${GREEN}✅ Container configuration complete${NC}"
    ;;
  
  nextjs-minimal)
    echo -e "${GREEN}🚀 Creating Next.js minimal project: $PROJECT_NAME${NC}"
    npx create-next-app@latest "$PROJECT_NAME" \
      --typescript \
      --no-tailwind \
      --eslint \
      --app \
      --no-src-dir \
      --import-alias "@/*" \
      --turbopack \
      --use-$PACKAGE_MANAGER \
      --yes
    
    # Configure for container environment
    echo -e "${BLUE}📦 Configuring for container environment...${NC}"
    cd "$PROJECT_NAME"
    npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
    npm pkg set scripts.start="next start -H 0.0.0.0"
    
    # Fix next.config for static files in containers
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for development in containers
  // This prevents 404s on static images
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Ensure static files are served correctly
  assetPrefix: process.env.ASSET_PREFIX || '',
  
  // Configure for container environment
  experimental: {
    turbopack: {
      resolveAlias: {},
    },
  },
};

export default nextConfig;
EOF
    
    cd ..
    echo -e "${GREEN}✅ Container configuration complete${NC}"
    ;;
  
  react)
    echo -e "${GREEN}⚛️  Creating React project (TypeScript): $PROJECT_NAME${NC}"
    npx create-react-app "$PROJECT_NAME" --template typescript
    ;;
  
  react-js)
    echo -e "${GREEN}⚛️  Creating React project (JavaScript): $PROJECT_NAME${NC}"
    npx create-react-app "$PROJECT_NAME"
    ;;
  
  vite-react)
    echo -e "${GREEN}⚡ Creating Vite + React project: $PROJECT_NAME${NC}"
    npm create vite@latest "$PROJECT_NAME" -- --template react-ts
    if [ "$SKIP_INSTALL" = false ]; then
      cd "$PROJECT_NAME" && $PACKAGE_MANAGER install
    fi
    ;;
  
  vite-vue)
    echo -e "${GREEN}⚡ Creating Vite + Vue project: $PROJECT_NAME${NC}"
    npm create vite@latest "$PROJECT_NAME" -- --template vue-ts
    if [ "$SKIP_INSTALL" = false ]; then
      cd "$PROJECT_NAME" && $PACKAGE_MANAGER install
    fi
    ;;
  
  vite-svelte)
    echo -e "${GREEN}⚡ Creating Vite + Svelte project: $PROJECT_NAME${NC}"
    npm create vite@latest "$PROJECT_NAME" -- --template svelte-ts
    if [ "$SKIP_INSTALL" = false ]; then
      cd "$PROJECT_NAME" && $PACKAGE_MANAGER install
    fi
    ;;
  
  node)
    echo -e "${GREEN}📦 Creating Node.js project: $PROJECT_NAME${NC}"
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    $PACKAGE_MANAGER init -y
    
    # Create basic structure
    mkdir -p src
    cat > src/index.js << 'EOF'
console.log('Hello from Node.js!');
EOF
    
    # Update package.json with start script
    if command -v jq &> /dev/null; then
      jq '.scripts.start = "node src/index.js"' package.json > package.json.tmp && mv package.json.tmp package.json
    fi
    
    echo -e "${GREEN}✅ Created basic Node.js structure${NC}"
    ;;
  
  express)
    echo -e "${GREEN}🚂 Creating Express.js project: $PROJECT_NAME${NC}"
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    $PACKAGE_MANAGER init -y
    
    if [ "$SKIP_INSTALL" = false ]; then
      $PACKAGE_MANAGER install express cors dotenv
      $PACKAGE_MANAGER install -D nodemon
    fi
    
    # Create basic Express structure
    mkdir -p src
    cat > src/index.js << 'EOF'
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF
    
    cat > .env << 'EOF'
PORT=3000
NODE_ENV=development
EOF
    
    # Update package.json with scripts
    if command -v jq &> /dev/null; then
      jq '.scripts.start = "node src/index.js" | .scripts.dev = "nodemon src/index.js"' package.json > package.json.tmp && mv package.json.tmp package.json
    fi
    
    echo -e "${GREEN}✅ Created Express.js API structure${NC}"
    ;;
  
  *)
    echo -e "${RED}❌ Unknown framework: $FRAMEWORK${NC}"
    show_usage
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ Project created successfully!${NC}"
echo -e "${BLUE}📁 Location: ./$PROJECT_NAME${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  cd $PROJECT_NAME"

if [ "$SKIP_INSTALL" = true ] && [ "$FRAMEWORK" != "node" ] && [ "$FRAMEWORK" != "express" ]; then
  echo "  $PACKAGE_MANAGER install"
fi

if [ "$FRAMEWORK" = "nextjs" ] || [ "$FRAMEWORK" = "nextjs-js" ] || [ "$FRAMEWORK" = "nextjs-minimal" ]; then
  echo "  $PACKAGE_MANAGER run dev"
elif [ "$FRAMEWORK" = "react" ] || [ "$FRAMEWORK" = "react-js" ]; then
  echo "  $PACKAGE_MANAGER start"
elif [[ "$FRAMEWORK" == vite-* ]]; then
  echo "  $PACKAGE_MANAGER run dev"
elif [ "$FRAMEWORK" = "express" ]; then
  echo "  $PACKAGE_MANAGER run dev"
elif [ "$FRAMEWORK" = "node" ]; then
  echo "  $PACKAGE_MANAGER start"
fi

echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
