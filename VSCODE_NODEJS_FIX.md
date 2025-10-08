# VSCode Container Node.js and Git Fix

## Problem
The VSCode container (code-server) did not have Node.js, npm, or git installed, preventing users from running npm commands, creating projects, or using version control directly in the browser-based IDE.

## Solution
Created a custom Dockerfile for the VSCode service that extends the base `codercom/code-server:latest` image and installs Node.js 18.x and git.

## Changes Made

### 1. Created `vscode/Dockerfile`
```dockerfile
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
```

### 2. Updated `docker-compose.yml`
Changed from using the image directly:
```yaml
vscode:
  image: codercom/code-server:latest
```

To building from custom Dockerfile:
```yaml
vscode:
  build:
    context: ./vscode
    dockerfile: Dockerfile
```

## Verification

Tested and confirmed working:

```bash
# Check Node.js version
docker-compose exec vscode node --version
# Output: v18.20.8

# Check npm version
docker-compose exec vscode npm --version
# Output: 10.8.2

# Check git version
docker-compose exec vscode git --version
# Output: git version 2.39.5

# Create Next.js project
docker-compose exec vscode bash -c "cd /tmp && npx create-next-app@latest test --yes"
# Successfully creates project

# Test git commands
docker-compose exec vscode bash -c "cd /tmp && git init test-repo && cd test-repo && git status"
# Successfully initializes git repository
```

## Benefits

1. **Full Development Environment**: Users can now run npm and git commands directly in the browser IDE
2. **Project Creation**: Can create Next.js, React, Vite projects without leaving the browser
3. **Package Management**: Install and manage npm packages in the VSCode terminal
4. **Version Control**: Full git functionality for committing, branching, and pushing code
5. **Consistent Environment**: Same Node.js version (18.x) across all services

## Usage

After rebuilding the container:

```bash
# Rebuild VSCode container
docker-compose build vscode

# Restart the service
docker-compose up -d vscode
```

Users can now open the VSCode terminal (http://localhost:8080) and run:
- `npm init`
- `npx create-next-app@latest my-app --yes`
- `npm install <package>`
- `node script.js`
- `git init`, `git add`, `git commit`, `git push`
- Any other Node.js/npm/git commands

## Date Fixed
2025-10-08
