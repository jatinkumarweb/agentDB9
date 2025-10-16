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
# Add to both .bashrc (non-login shells) and .profile (login shells)
RUN echo '' >> /home/coder/.bashrc && \
    echo '# Ensure standard paths are in PATH for npm/node' >> /home/coder/.bashrc && \
    echo 'export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"' >> /home/coder/.bashrc && \
    echo '' >> /home/coder/.profile && \
    echo '# Ensure standard paths are in PATH for npm/node' >> /home/coder/.profile && \
    echo 'export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"' >> /home/coder/.profile

# Configure VSCode terminal to use correct PATH
RUN mkdir -p /home/coder/.local/share/code-server/User && \
    echo '{\n  "terminal.integrated.env.linux": {\n    "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${env:PATH}"\n  },\n  "terminal.integrated.inheritEnv": true\n}' > /home/coder/.local/share/code-server/User/settings.json

# Copy node/npm to workspace bin for persistent access across volume mounts
USER root
RUN mkdir -p /home/coder/workspace/bin && \
    cp /usr/bin/node /home/coder/workspace/bin/ && \
    cp -r /usr/lib/node_modules /home/coder/workspace/ && \
    echo '#!/bin/bash\nNODE_PATH=/home/coder/workspace/node_modules /home/coder/workspace/bin/node /home/coder/workspace/node_modules/npm/bin/npm-cli.js "$@"' > /home/coder/workspace/bin/npm && \
    echo '#!/bin/bash\nNODE_PATH=/home/coder/workspace/node_modules /home/coder/workspace/bin/node /home/coder/workspace/node_modules/npm/bin/npx-cli.js "$@"' > /home/coder/workspace/bin/npx && \
    chmod +x /home/coder/workspace/bin/npm /home/coder/workspace/bin/npx && \
    chown -R coder:coder /home/coder/workspace/bin /home/coder/workspace/node_modules

USER coder

# Add workspace bin to PATH at the beginning
RUN sed -i '1i export PATH="/home/coder/workspace/bin:$PATH"' /home/coder/.bashrc && \
    sed -i '1i export PATH="/home/coder/workspace/bin:$PATH"' /home/coder/.profile

# Set working directory
WORKDIR /home/coder/workspace

# Use initialization script as entrypoint
ENTRYPOINT ["/usr/local/bin/init-workspace.sh"]
