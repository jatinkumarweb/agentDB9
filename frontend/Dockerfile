# Use native platform for better performance
FROM public.ecr.aws/docker/library/node:22-slim

WORKDIR /app

# Set environment variables to force correct architecture detection
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV FORCE_COLOR=1

# Install system dependencies including curl for healthchecks
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
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

# Let npm install the correct SWC binary for the platform automatically
# Next.js will detect and install the appropriate binary during npm install

# Create symlink to shared package BEFORE copying source
RUN mkdir -p node_modules/@agentdb9 && \
    rm -rf node_modules/@agentdb9/shared && \
    ln -sf /shared node_modules/@agentdb9/shared

# Copy source code (specific files/directories to avoid node_modules)
COPY frontend/src ./src
COPY frontend/next.config.js frontend/tsconfig.json frontend/tailwind.config.js frontend/postcss.config.js frontend/next-env.d.ts ./

# Copy wait script
COPY frontend/wait-for-backend.sh /usr/local/bin/wait-for-backend.sh
RUN chmod +x /usr/local/bin/wait-for-backend.sh

# Expose port
EXPOSE 3000

# Start development server with wait script
CMD ["/usr/local/bin/wait-for-backend.sh", "npm", "run", "dev"]