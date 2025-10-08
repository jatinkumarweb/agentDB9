FROM codercom/code-server:latest

USER root

# Install Node.js 18.x and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify installation
RUN node --version && npm --version

# Switch back to coder user
USER coder

# Set working directory
WORKDIR /home/coder/workspace
