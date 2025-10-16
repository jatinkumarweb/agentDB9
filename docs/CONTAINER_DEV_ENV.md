# Container-Level Development Environment Configuration

## Overview

This document describes the container-level solution for configuring development servers in AgentDB9. This approach eliminates the need for project-specific configuration files, making it scalable across all projects.

## Problem Statement

Development servers (React, Vite, Next.js, etc.) running in Docker containers face several challenges:

1. **Host Binding**: Dev servers default to `localhost`, which isn't accessible from outside the container
2. **File Watching**: Docker volume mounts require polling for file change detection
3. **Browser Auto-Open**: Doesn't work in containerized environments
4. **Proxy Path Issues**: VSCode's code-server proxies requests through `/proxy/<port>/`, requiring assets to be served with that base path

## Solution Architecture

### Container-Level Configuration

Instead of requiring each project to have its own `.env` file or configuration, we configure the environment at the container level. This ensures all projects automatically inherit the correct settings.

### Components

#### 1. Global Environment File (`/home/coder/.dev-env`)

Created by `vscode/setup-dev-env.sh` during image build:

```bash
# Bind to all interfaces (not just localhost)
export HOST=0.0.0.0

# Enable polling for file watching (required for Docker volumes)
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true

# Framework-specific configurations
export REACT_APP_HOST=0.0.0.0
export VITE_HOST=0.0.0.0
export NEXT_PUBLIC_HOST=0.0.0.0

# Disable browser auto-open (doesn't work in containers)
export BROWSER=none

# VSCode code-server proxy configuration
# Automatically set PUBLIC_URL for correct asset paths
export PUBLIC_URL="/proxy/3000"

# Convenience aliases for common frameworks
alias react-start='PUBLIC_URL=/proxy/3000 npm start'
alias vite-dev='PUBLIC_URL=/proxy/5173 npm run dev'
alias next-dev='PUBLIC_URL=/proxy/3000 npm run dev'
```

#### 2. Shell Integration

The environment file is automatically sourced in:
- `.bashrc` - For non-login interactive shells
- `.profile` - For login shells
- `.bash_profile` - Ensures .bashrc is loaded for login shells

This ensures the environment variables are available in:
- VSCode integrated terminal
- SSH sessions
- Direct shell access
- Background processes

#### 3. Port Forwarding

Configured in `docker-compose.yml` and `docker-compose.mac.yml`:

```yaml
ports:
  - "3001:3000"  # React/CRA
  - "5173:5173"  # Vite
  - "8080:8080"  # Webpack/VSCode
  - "4200:4200"  # Angular
  - "8000:8000"  # Django/Python
```

#### 4. VSCode Auto-Forward Configuration

Configured in `vscode/init-workspace.sh` to automatically detect and forward ports:

```json
{
  "remote.autoForwardPorts": true,
  "remote.autoForwardPortsSource": "process",
  "remote.forwardOnOpen": true,
  "remote.portsAttributes": {
    "3000": {"label": "React/CRA", "onAutoForward": "notify"},
    "5173": {"label": "Vite", "onAutoForward": "notify"}
  }
}
```

## How It Works

### Image Build Process

1. `vscode/Dockerfile` copies `setup-dev-env.sh` to the image
2. During build, the script runs as the `coder` user
3. Creates `/home/coder/.dev-env` with default environment variables
4. Adds sourcing logic to `.bashrc`, `.profile`, and `.bash_profile`

### Runtime Process

1. Container starts with the configured environment
2. Any shell session automatically sources `.dev-env`
3. Dev servers inherit these environment variables
4. Servers bind to `0.0.0.0` and are accessible from the host
5. File watching uses polling to detect changes in Docker volumes

## Usage

### For Users

The environment variables are automatically applied. You can start your dev server in two ways:

#### Option 1: Use Convenience Aliases (Recommended)

```bash
# React/CRA - automatically sets PUBLIC_URL=/proxy/3000
react-start

# Vite - automatically sets PUBLIC_URL=/proxy/5173
vite-dev

# Next.js - automatically sets PUBLIC_URL=/proxy/3000
next-dev
```

#### Option 2: Standard Commands

The default `PUBLIC_URL=/proxy/3000` is set automatically, which works for most React apps:

```bash
# React/CRA (uses default PUBLIC_URL=/proxy/3000)
npm start

# For other ports, set PUBLIC_URL explicitly
PUBLIC_URL=/proxy/5173 npm run dev  # Vite
PUBLIC_URL=/proxy/8080 npm start    # Custom port
```

#### Accessing Your App

When using VSCode in the browser, access your app at:
- Direct: `http://localhost:3001` (if port forwarding is configured)
- Through VSCode proxy: `http://your-vscode-url/proxy/3000`

All assets (JS, CSS, images) will load correctly with the `/proxy/<port>` prefix.

### For Developers

#### Adding New Framework Support

To add support for a new framework, edit `vscode/setup-dev-env.sh`:

```bash
# Add framework-specific environment variables
export YOUR_FRAMEWORK_HOST=0.0.0.0
export YOUR_FRAMEWORK_POLLING=true
```

Then rebuild the VSCode image:

```bash
cd vscode
docker build -t agentdb9-vscode:latest .
```

#### Adding New Port Forwarding

Edit `docker-compose.yml` and `docker-compose.mac.yml`:

```yaml
ports:
  - "HOST_PORT:CONTAINER_PORT"
```

## Verification

### Check Environment Variables

```bash
# In VSCode terminal or SSH session
env | grep -E '(HOST|POLLING|BROWSER)'
```

Expected output:
```
HOST=0.0.0.0
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true
REACT_APP_HOST=0.0.0.0
VITE_HOST=0.0.0.0
NEXT_PUBLIC_HOST=0.0.0.0
BROWSER=none
```

### Test Dev Server

1. Create a test React app:
   ```bash
   npx create-react-app test-app
   cd test-app
   npm start
   ```

2. Verify it binds to `0.0.0.0` and uses the proxy path:
   ```
   Attempting to bind to HOST environment variable: 0.0.0.0
   Local:            http://localhost:3000/proxy/3000
   On Your Network:  http://172.18.0.2:3000/proxy/3000
   ```

3. Verify assets load correctly:
   ```bash
   # Check HTML references proxy path
   curl http://localhost:3001 | grep bundle.js
   # Should show: <script defer src="/proxy/3000/static/js/bundle.js"></script>
   
   # Verify bundle loads
   curl http://localhost:3001/proxy/3000/static/js/bundle.js | head -5
   # Should show JavaScript code
   ```

## Benefits

### Scalability
- No need to add `.env` files to each project
- Works automatically for all projects
- Consistent configuration across all workspaces

### Maintainability
- Single source of truth for dev environment configuration
- Easy to update for all projects at once
- No project-specific configuration to maintain

### Developer Experience
- Zero configuration required
- Works out of the box
- Consistent behavior across all projects

## Troubleshooting

### Assets Return 404 Errors

If you see 404 errors for bundle.js or other assets:

1. **Check PUBLIC_URL is set**:
   ```bash
   env | grep PUBLIC_URL
   # Should show: PUBLIC_URL=/proxy/3000
   ```

2. **Use the convenience aliases**:
   ```bash
   react-start  # Instead of npm start
   ```

3. **Or set PUBLIC_URL explicitly**:
   ```bash
   PUBLIC_URL=/proxy/3000 npm start
   ```

4. **Verify the HTML output**:
   ```bash
   curl http://localhost:3001 | grep bundle.js
   # Should show: /proxy/3000/static/js/bundle.js
   # NOT: /static/js/bundle.js
   ```

### Environment Variables Not Set

If environment variables aren't available:

1. Check if `.dev-env` exists:
   ```bash
   cat ~/.dev-env
   ```

2. Verify shell configuration:
   ```bash
   grep -A 3 "dev-env" ~/.bashrc
   ```

3. Start an interactive shell:
   ```bash
   bash -i
   env | grep HOST
   env | grep PUBLIC_URL
   ```

### Dev Server Not Accessible

1. Verify port forwarding in `docker-compose.yml`
2. Check if the server is binding to `0.0.0.0`:
   ```bash
   netstat -tlnp | grep :3000
   ```
3. Ensure the container is using the latest image:
   ```bash
   docker-compose down vscode
   docker-compose up -d vscode
   ```

### File Changes Not Detected

If file changes aren't triggering rebuilds:

1. Verify polling is enabled:
   ```bash
   env | grep POLLING
   ```

2. Check if the dev server supports polling (most modern frameworks do)

## Related Documentation

- [Mac npm Fix](./MAC_NPM_FIX.md) - Mac-specific npm installation
- [Dev Server Guide](./DEV_SERVER_GUIDE.md) - Framework-specific dev server configuration
- [Docker Compose Configuration](../docker-compose.yml) - Port forwarding setup

## Implementation Files

- `vscode/setup-dev-env.sh` - Creates global environment file
- `vscode/Dockerfile` - Builds VSCode image with environment setup
- `vscode/init-workspace.sh` - Runtime initialization and VSCode configuration
- `docker-compose.yml` - Port forwarding configuration
- `docker-compose.mac.yml` - Mac-specific overrides
