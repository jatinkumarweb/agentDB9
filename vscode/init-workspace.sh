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

# Execute the original entrypoint
# Use /usr/bin/entrypoint.sh from the base image with the command arguments
exec /usr/bin/entrypoint.sh "$@"
