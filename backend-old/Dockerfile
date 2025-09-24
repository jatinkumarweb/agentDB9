FROM mcr.microsoft.com/devcontainers/typescript-node:18

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++

# Copy shared package first
COPY shared/ /shared/

# Build shared package
WORKDIR /shared
RUN npm install && npm run build

# Switch back to app directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Install @types/node explicitly to ensure it's available
RUN npm install --save-dev @types/node@^20.0.0

# Copy source code
COPY backend/ .

# Create symlink to shared package
RUN mkdir -p node_modules/@agentdb9 && ln -sf /shared node_modules/@agentdb9/shared

# Build the application
RUN npm run build

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "run", "dev"]