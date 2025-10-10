FROM node:18

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and build shared package first
COPY shared/ /shared/
WORKDIR /shared
RUN npm install && npm run build

# Switch to MCP server directory
WORKDIR /app

# Copy package files
COPY mcp-server/package*.json ./

# Install all dependencies locally (including dev for building, isolated container)
RUN npm install

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