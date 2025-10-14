FROM codercom/code-server:latest

USER root

# Install Node.js 22.x, npm, git, and curl (needed for healthchecks)
RUN apt-get update && \
    apt-get install -y curl git ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify installation (simplified to avoid mount issues)
RUN node --version

# Switch back to coder user
USER coder

# Set working directory
WORKDIR /home/coder/workspace
