FROM mcr.microsoft.com/devcontainers/typescript-node:22

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
WORKDIR /workspaces/agentDB9

# Create workspace directory and set permissions
RUN mkdir -p /workspaces/agentDB9 && chown -R node:node /workspaces
