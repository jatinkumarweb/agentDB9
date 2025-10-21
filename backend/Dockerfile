FROM node:22

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    wget \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configure npm for faster installs
RUN npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000

# Install global npm packages
RUN npm install -g @nestjs/cli typescript

# Copy shared package first
COPY shared/ /shared/

# Build shared package
WORKDIR /shared
RUN npm install --include=dev
RUN npm run build

# Switch back to app directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install all dependencies (including dev dependencies for development mode)
# Use --legacy-peer-deps to avoid peer dependency conflicts
# Use --prefer-offline to speed up builds with cache
# Increase timeout for slow networks
RUN npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund --fetch-timeout=300000 || \
    (echo "First install attempt failed, retrying..." && npm install --legacy-peer-deps --no-audit --no-fund)

# Rebuild native modules for the container architecture
RUN npm rebuild sqlite3

# Create symlink to shared package before copying source
RUN mkdir -p node_modules/@agentdb9 && \
    rm -rf node_modules/@agentdb9/shared && \
    ln -sf /shared node_modules/@agentdb9/shared

# Copy source code (excluding node_modules)
COPY backend/src ./src
COPY backend/test ./test
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/eslint.config.mjs ./ 
COPY backend/.prettierrc ./

# Build the NestJS application
RUN npm run build

# Copy entrypoint script
COPY backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8000/health || exit 1

# Use entrypoint to ensure dependencies are installed
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application
CMD ["npm", "run", "start:dev"]