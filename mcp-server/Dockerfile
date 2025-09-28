FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy and build shared package first
COPY shared/ /shared/
WORKDIR /shared
RUN npm install && npm run build

# Switch to MCP server directory
WORKDIR /app

# Copy package files
COPY mcp-server/package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy source code
COPY mcp-server/ .

# Create symlink to shared package
RUN mkdir -p node_modules/@agentdb9 && ln -sf /shared node_modules/@agentdb9/shared

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose ports
EXPOSE 9001 9002

# Start the application
CMD ["npm", "start"]