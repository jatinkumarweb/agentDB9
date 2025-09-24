FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../shared/package*.json /shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .
COPY ../shared /shared

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]