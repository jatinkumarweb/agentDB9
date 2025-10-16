FROM codercom/code-server:latest

USER root

# Install Node.js 22.x, npm, git, and curl (needed for healthchecks)
# Combined into single RUN to minimize layers and avoid BuildKit v0.24.0 mount bug
RUN apt-get update && \
    apt-get install -y curl git ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    node --version && \
    npm --version && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy workspace initialization script
COPY init-workspace.sh /usr/local/bin/init-workspace.sh
RUN chmod +x /usr/local/bin/init-workspace.sh

# Switch back to coder user
USER coder

# Fix PATH for VSCode terminal - ensure npm/node are accessible
RUN echo '' >> /home/coder/.bashrc && \
    echo '# Ensure standard paths are in PATH for npm/node' >> /home/coder/.bashrc && \
    echo 'export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"' >> /home/coder/.bashrc

# Set working directory
WORKDIR /home/coder/workspace

# Use initialization script as entrypoint
ENTRYPOINT ["/usr/local/bin/init-workspace.sh"]
