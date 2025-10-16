#!/bin/bash
set -e

WORKSPACE_DIR="/home/coder/workspace"

# Create workspace directory if it doesn't exist
mkdir -p "$WORKSPACE_DIR"

# Initialize default workspace if empty (no files except node_modules)
if [ ! -f "$WORKSPACE_DIR/README.md" ]; then
  echo "Initializing default workspace..."
  
  cat > "$WORKSPACE_DIR/README.md" << 'EOF'
# Welcome to AgentDB9 Workspace

This is your coding workspace. You can:

- Create new files and folders
- Write code with AI assistance
- Run terminal commands
- Install packages and dependencies

## Getting Started

1. Select or create a project from the workspace menu
2. Start coding with AI-powered assistance
3. Use the integrated terminal for commands

## Features

- **AI Code Generation**: Get code suggestions and completions
- **Project Management**: Organize your code into projects
- **Terminal Access**: Run commands directly in the workspace
- **File Management**: Create, edit, and organize files

Happy coding! 🚀
EOF

  # Create a sample project structure
  mkdir -p "$WORKSPACE_DIR/examples"
  
  cat > "$WORKSPACE_DIR/examples/hello.js" << 'EOF'
// Welcome to AgentDB9!
// This is a sample JavaScript file

function greet(name) {
  return `Hello, ${name}! Welcome to AgentDB9.`;
}

console.log(greet('Developer'));
EOF

  cat > "$WORKSPACE_DIR/examples/hello.py" << 'EOF'
# Welcome to AgentDB9!
# This is a sample Python file

def greet(name):
    return f"Hello, {name}! Welcome to AgentDB9."

if __name__ == "__main__":
    print(greet("Developer"))
EOF

  cat > "$WORKSPACE_DIR/.gitignore" << 'EOF'
node_modules/
.env
.env.local
*.log
.DS_Store
EOF

  echo "Default workspace initialized!"
fi

# Install npm/node to workspace bin (after volume mount)
# This ensures npm is accessible even when workspace is mounted as a volume
if [ ! -f "$WORKSPACE_DIR/bin/npm" ]; then
  echo "Installing npm to workspace bin..."
  mkdir -p "$WORKSPACE_DIR/bin"
  
  # Copy node binary
  cp /usr/bin/node "$WORKSPACE_DIR/bin/"
  
  # Copy node_modules if not already there
  if [ ! -d "$WORKSPACE_DIR/node_modules/npm" ]; then
    cp -r /usr/lib/node_modules "$WORKSPACE_DIR/"
  fi
  
  # Create npm wrapper script
  cat > "$WORKSPACE_DIR/bin/npm" << 'EOFNPM'
#!/bin/bash
NODE_PATH=/home/coder/workspace/node_modules /home/coder/workspace/bin/node /home/coder/workspace/node_modules/npm/bin/npm-cli.js "$@"
EOFNPM
  
  # Create npx wrapper script
  cat > "$WORKSPACE_DIR/bin/npx" << 'EOFNPX'
#!/bin/bash
NODE_PATH=/home/coder/workspace/node_modules /home/coder/workspace/bin/node /home/coder/workspace/node_modules/npm/bin/npx-cli.js "$@"
EOFNPX
  
  # Make scripts executable
  chmod +x "$WORKSPACE_DIR/bin/npm" "$WORKSPACE_DIR/bin/npx"
  
  # Set ownership
  chown -R coder:coder "$WORKSPACE_DIR/bin" "$WORKSPACE_DIR/node_modules"
  
  echo "npm installed to workspace bin!"
fi

# Execute the original entrypoint
# Use /usr/bin/entrypoint.sh from the base image with the command arguments
exec /usr/bin/entrypoint.sh "$@"
