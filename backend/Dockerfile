FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++

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

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "run", "dev"]