FROM node:22-slim

# Install build dependencies for native modules (node-pty requires python3, make, g++)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure npm for faster installs
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set loglevel warn

WORKDIR /app

# Copy and build shared package first
COPY shared/package*.json /shared/
WORKDIR /shared
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit 2>/dev/null || npm install --no-audit
COPY shared/ /shared/
RUN npm run build

# Switch to MCP server directory
WORKDIR /app

# Copy package files
COPY mcp-server/package*.json ./

# Install dependencies with cache mount for faster rebuilds
# The cache mount persists npm cache between builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --legacy-peer-deps 2>/dev/null || \
    npm install --legacy-peer-deps --no-audit --verbose

# Create symlink to shared package BEFORE copying source
RUN mkdir -p node_modules/@agentdb9 && \
    rm -rf node_modules/@agentdb9/shared && \
    ln -sf /shared node_modules/@agentdb9/shared

# Copy source code (specific files to avoid node_modules)
COPY mcp-server/src ./src
COPY mcp-server/tsconfig.json ./

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose ports
EXPOSE 9001 9002

# Start the application
CMD ["npm", "start"]