FROM codercom/code-server:latest

USER root

# Install Node.js 18.x, npm, and git
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify installation
RUN node --version && npm --version && git --version

# Switch back to coder user
USER coder

# Set working directory
WORKDIR /home/coder/workspace
