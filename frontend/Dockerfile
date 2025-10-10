# Explicitly specify platform to avoid architecture confusion
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:18-slim

WORKDIR /app

# Set environment variables to force correct architecture detection
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV FORCE_COLOR=1

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

# Force install the correct SWC binary and remove any ARM64 binaries
RUN npm install @next/swc-linux-x64-gnu --save-optional && \
    npm uninstall @next/swc-linux-arm64-gnu @next/swc-linux-arm64-musl 2>/dev/null || true

# Create symlink to shared package BEFORE copying source
RUN mkdir -p node_modules/@agentdb9 && \
    rm -rf node_modules/@agentdb9/shared && \
    ln -sf /shared node_modules/@agentdb9/shared

# Copy source code (specific files/directories to avoid node_modules)
COPY frontend/src ./src
COPY frontend/next.config.js frontend/tsconfig.json frontend/tailwind.config.js frontend/postcss.config.js frontend/next-env.d.ts ./

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]