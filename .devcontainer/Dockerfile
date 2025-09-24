FROM mcr.microsoft.com/devcontainers/typescript-node:18

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        curl \
        git \
        build-essential \
        python3 \
        python3-pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy package.json for dependency installation
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Set proper permissions
RUN chown -R node:node /workspace
