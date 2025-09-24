FROM node:18-alpine

WORKDIR /app

# Install system dependencies for potential native modules
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./
COPY ../shared/package*.json /shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .
COPY ../shared /shared

# Build the application
RUN npm run build

# Create models directory
RUN mkdir -p /models

# Expose port
EXPOSE 9000

# Start the application
CMD ["npm", "run", "dev"]