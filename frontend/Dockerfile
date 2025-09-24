FROM node:18-alpine

WORKDIR /app

# Copy shared package first
COPY shared/ /shared/

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY frontend/ .

# Create symlink to shared package
RUN mkdir -p node_modules/@agentdb9 && ln -sf /shared node_modules/@agentdb9/shared

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]