FROM node:23.10.0

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

# Install global npm packages
RUN npm install -g @nestjs/cli typescript

# Copy shared package first
COPY shared/ /shared/

# Build shared package
WORKDIR /shared
RUN npm install
RUN npm install --save-dev @types/node || true
RUN npm run build

# Switch back to app directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Explicitly install jsonrepair locally (prevent hoisting issues)
RUN npm install jsonrepair@3.13.1

# Rebuild native modules for the container architecture
RUN npm rebuild sqlite3

# Copy source code
COPY backend/ .

# Create symlink to shared package (use absolute path)
RUN mkdir -p node_modules/@agentdb9 && \
    rm -f node_modules/@agentdb9/shared && \
    ln -sf /shared node_modules/@agentdb9/shared

# Build the NestJS application
RUN npm run build

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]