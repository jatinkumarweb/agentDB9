FROM mcr.microsoft.com/devcontainers/typescript-node:18

WORKDIR /app

# Install system dependencies for potential native modules
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Copy shared package first
COPY shared/ /shared/

# Build shared package
WORKDIR /shared
RUN npm install && npm run build

# Switch back to app directory
WORKDIR /app

# Copy package files
COPY llm-service/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY llm-service/ .

# Create symlink to shared package
RUN mkdir -p node_modules/@agentdb9 && ln -sf /shared node_modules/@agentdb9/shared

# Build the application
RUN npm run build

# Create models directory
RUN mkdir -p /models

# Expose port
EXPOSE 9000

# Start the application
CMD ["npm", "run", "dev"]