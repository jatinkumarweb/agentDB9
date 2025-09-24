FROM public.ecr.aws/docker/library/node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy shared package first
COPY shared/ /shared/

# Build shared package
WORKDIR /shared
RUN npm install && npm run build

# Switch back to app directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Explicitly install the correct SWC binary for the platform
RUN npm install @next/swc-linux-x64-gnu --save-optional

# Copy source code
COPY frontend/ .

# Create symlink to shared package
RUN mkdir -p node_modules/@agentdb9 && ln -sf /shared node_modules/@agentdb9/shared

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]