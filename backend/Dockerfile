FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ wget

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

# Copy source code
COPY backend/ .

# Create symlink to shared package
RUN mkdir -p node_modules/@agentdb9 && ln -sf /shared node_modules/@agentdb9/shared

# Build the NestJS application
RUN npm run build

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]