# VS Code Agent-Driven Development

## Overview

AgentDB9 provides an agent-driven development environment where AI agents create and modify code in a blank VS Code workspace based on natural language chat instructions. Users chat with AI agents who then execute development tasks directly in VS Code through MCP (Model Context Protocol) tools.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Workspace     │  │  Agent Activity │  │  Collaboration  │  │
│  │     Page        │  │    Overlay      │  │     Panel       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │ JWT Token
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Proxy (Port 8081)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ JWT Validation  │  │  Request Proxy  │  │ WebSocket Proxy │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │ Authenticated Requests
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                VS Code Container (code-server, Port 8080)       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   File Explorer │  │     Editor      │  │    Terminal     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Extensions    │  │   Git Panel     │  │   Debug Panel   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   File Tools    │  │   Git Tools     │  │  Terminal Tools │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Editor Tools   │  │  Testing Tools  │  │  Project Tools  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

1. **User Login**: User authenticates with the backend and receives a JWT token
2. **Token Storage**: Frontend stores the JWT token in cookies/localStorage
3. **VS Code Access**: When accessing the workspace, the frontend embeds VS Code via the proxy
4. **Token Validation**: The VS Code proxy validates the JWT token on every request
5. **Proxy Pass-through**: Valid requests are proxied to the VS Code container
6. **WebSocket Handling**: WebSocket connections for real-time features are also authenticated

## Features

### 🤖 **AI Agent-Driven Development**
- **Natural Language Instructions**: Chat with agents using plain English
- **Intelligent Task Analysis**: Agents understand complex development requests
- **Automatic Code Generation**: Agents create files, components, and entire projects
- **Smart Dependency Management**: Agents install required packages automatically
- **Context-Aware Development**: Agents understand project structure and requirements

### 🖥️ **Blank Canvas Workspace**
- **Clean Start**: Every workspace begins completely empty
- **Agent-Created Content**: All code and files are generated by agents
- **Full VS Code Interface**: Complete IDE experience with all native features
- **Real-time Updates**: Watch agents work in real-time as they create your project

### 💬 **Integrated Chat Interface**
- **Collaboration Panel**: Built-in chat with AI agents
- **Multi-Agent Support**: Different agents for different tasks
- **Request History**: Track all your development requests
- **Status Updates**: Real-time feedback on agent actions

### 🔧 **MCP Tool Integration**
- **File Operations**: Agents create, edit, and manage files
- **Terminal Commands**: Agents execute shell commands and scripts
- **Package Management**: Agents install dependencies and configure projects
- **Git Operations**: Agents handle version control and commits

### 📊 **Development Workflow**
- **Request → Analysis → Action**: Streamlined development process
- **Multi-Step Projects**: Agents handle complex, multi-file projects
- **Error Handling**: Agents detect and fix issues automatically
- **Progress Tracking**: Visual indicators of agent work progress

## Getting Started

### 1. Access the Workspace

Navigate to the workspace page in your browser:
```
https://your-domain.com/workspace
```

The workspace starts with a **blank VS Code environment** - no pre-loaded code or projects. This is intentional as agents will create everything from scratch based on your instructions.

The VS Code interface is embedded in the workspace page and also accessible via the authenticated proxy:
```
http://localhost:8081
```

**Note**: Direct access to VS Code (port 8080) is disabled for security. All access must go through the authenticated proxy on port 8081.

### 2. VS Code Authentication

The VS Code container is integrated with AgentDB9's authentication system:
- **JWT Token Authentication**: Uses the same authentication as the main application
- **Automatic Login**: Users authenticated in the frontend automatically access VS Code
- **Session Management**: Authentication state is synchronized across all services
- **No Password Required**: Password authentication has been replaced with seamless JWT integration

### 3. Agent-Driven Development

Instead of pre-loaded code, you interact with AI agents through chat:

1. **Chat with Agents**: Use the collaboration panel to send natural language instructions
2. **Agent Analysis**: Agents analyze your requests and determine required actions
3. **Automatic Execution**: Agents execute development tasks in VS Code via MCP tools
4. **Real-time Updates**: Watch as agents create files, write code, and set up projects

**Example Workflow**:
- You: "Create a React todo app with TypeScript"
- Agent: Analyzes request → Creates files → Writes components → Installs dependencies
- Result: Complete project appears in your blank VS Code workspace

## Configuration

### Authentication Setup

The VS Code integration requires proper JWT configuration:

```yaml
# docker-compose.yml
services:
  vscode-proxy:
    environment:
      - JWT_SECRET=${JWT_SECRET:-your_jwt_secret_key_here_make_it_long_and_secure_for_production_use_at_least_32_chars}
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - VSCODE_URL=http://vscode:8080
      - VSCODE_PROXY_PORT=8081

  vscode:
    command: ["--auth", "none", "--bind-addr", "0.0.0.0:8080", "/home/coder/workspace"]
```

**Important**: The `JWT_SECRET` must match between the backend, vscode-proxy, and any other services that validate tokens.

### VS Code Extensions

Pre-installed extensions include:
- **TypeScript**: Enhanced TypeScript support
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **Docker**: Container management
- **GitLens**: Enhanced git capabilities
- **Tailwind CSS**: CSS framework support
- **Python**: Python development
- **Go**: Go language support

### Settings

VS Code is pre-configured with:
- **Theme**: Dark+ (default dark theme)
- **Font**: Fira Code with ligatures
- **Auto-save**: Enabled with 1-second delay
- **Format on save**: Enabled
- **Git auto-fetch**: Enabled
- **Integrated terminal**: Bash shell

### Keyboard Shortcuts

All standard VS Code shortcuts are available:
- `Ctrl+Shift+P`: Command palette
- `Ctrl+P`: Quick file open
- `Ctrl+`` `: Toggle terminal
- `Ctrl+Shift+E`: File explorer
- `Ctrl+Shift+G`: Git panel
- `F5`: Start debugging

## Agent Integration

### Real-time Monitoring

The agent activity overlay shows:
- **Current Operations**: What the agent is currently doing
- **File Changes**: Real-time file modifications
- **Command Execution**: Terminal commands and their output
- **Git Operations**: Commits, pushes, branch changes
- **Test Results**: Test execution and coverage reports

### Activity Types

The system tracks these agent activities:
- `file_edit`: File modifications and edits
- `file_create`: New file creation
- `file_delete`: File deletion
- `git_operation`: Git commands (commit, push, etc.)
- `terminal_command`: Shell command execution
- `test_run`: Test execution and analysis

### Status Indicators

Each activity has a status:
- 🔵 **In Progress**: Operation currently running
- ✅ **Completed**: Operation finished successfully  
- ❌ **Failed**: Operation encountered an error

## Collaboration

### Multi-user Support

Multiple users can access the same workspace:
- **Shared Editing**: Multiple cursors and selections
- **Real-time Chat**: Communication with team and AI
- **Presence Indicators**: See who's online and what they're working on
- **Activity Sharing**: See each other's file changes and operations

### Chat Features

The integrated chat supports:
- **User Messages**: Team communication
- **Agent Messages**: AI agent status and responses
- **System Messages**: Workspace events and notifications
- **Message History**: Persistent chat history

### Sharing

Share workspace access via:
- **Workspace URL**: Full frontend interface
- **VS Code URL**: Direct code-server access
- **Copy Links**: One-click URL copying

## API Integration

### Workspace Synchronization

The frontend communicates with VS Code via:
- **File Operations**: Read, write, create, delete files
- **WebSocket Events**: Real-time activity updates
- **MCP Tools**: Execute development operations

### Available APIs

- `POST /api/workspace/files`: List workspace files
- `POST /api/workspace/read-file`: Read file content
- `POST /api/workspace/save-file`: Save file changes
- **WebSocket**: Real-time agent activity events

## Agent-Driven Workflow

### 1. Chat-Based Development

**Step 1: Send Request**
```
User: "Create a React todo app with TypeScript and Tailwind CSS"
```

**Step 2: Agent Analysis**
- Agent analyzes the request
- Determines required actions: create files, write code, install dependencies
- Plans the project structure

**Step 3: Automatic Execution**
- Agent creates `package.json` with required dependencies
- Agent generates React components with TypeScript
- Agent sets up Tailwind CSS configuration
- Agent creates example todo functionality

**Step 4: Real-time Updates**
- Watch files appear in VS Code file explorer
- See code being written in real-time
- Monitor terminal output for dependency installation

### 2. Supported Agent Actions

**File Operations**:
- `create_file`: Create new files with generated content
- `write_code`: Write code based on requirements
- `create_tests`: Generate test files and test cases

**Project Setup**:
- `install_dependencies`: Install npm packages automatically
- `setup_project`: Initialize project structure
- `configure_tools`: Set up development tools and configs

**Code Generation**:
- React components with TypeScript
- Express.js API servers
- Database schemas and models
- Test suites and configurations

### 3. Example Interactions

**Creating a Component**:
```
User: "Create a login form component with email and password fields"
Agent: "I'll create a LoginForm component with validation and TypeScript types"
Result: LoginForm.tsx file created with complete implementation
```

**Setting up a Project**:
```
User: "Set up a full-stack app with React frontend and Express backend"
Agent: "I'll create the project structure with both frontend and backend"
Result: Complete project with package.json, components, API routes, and configuration
```

**Adding Features**:
```
User: "Add user authentication to the existing app"
Agent: "I'll add JWT authentication with login/register functionality"
Result: Auth components, API endpoints, and middleware added to existing project
```

## Troubleshooting

### Common Issues

1. **Authentication Errors (401/403)**
   - Verify user is logged in to the frontend
   - Check JWT token validity: tokens expire after 24 hours by default
   - Ensure JWT_SECRET matches between backend and vscode-proxy
   - Check vscode-proxy logs: `docker-compose logs vscode-proxy`

2. **VS Code Won't Load**
   - Check if vscode-proxy container is running: `docker-compose ps vscode-proxy`
   - Verify port 8081 is accessible (not 8080)
   - Check container logs: `docker-compose logs vscode vscode-proxy`
   - Ensure VS Code container is running with `--auth none`

3. **Token Validation Failures**
   - Check JWT_SECRET environment variables match
   - Restart vscode-proxy after JWT_SECRET changes: `docker-compose restart vscode-proxy`
   - Verify token format in browser developer tools
   - Check for token expiration

4. **Permission Errors**
   - Ensure proper volume permissions
   - Check user ID mapping in Docker
   - Restart container: `docker-compose restart vscode`

5. **Agent Activity Not Showing**
   - Verify MCP server is running on port 9001
   - Check WebSocket connection to port 9002
   - Ensure frontend can reach MCP server

6. **Extensions Not Loading**
   - Check extension installation in container logs
   - Verify volume mounts for extension storage
   - Manually install extensions via VS Code interface

### Performance Optimization

- **Resource Limits**: Configure Docker memory/CPU limits
- **Extension Management**: Disable unused extensions
- **File Watching**: Limit file watchers for large projects
- **Terminal Sessions**: Close unused terminal sessions

## Security Considerations

### Access Control
- **JWT Token Authentication**: Integrated with AgentDB9's user authentication system
- **Session-based Access**: Users must be logged in to access VS Code
- **Automatic Token Validation**: All requests are validated against the authentication service
- **Network Isolation**: VS Code container is not directly accessible from outside
- **Proxy-based Security**: All access goes through the authenticated vscode-proxy service
- **File System Sandboxing**: Container-based isolation for workspace files

### Data Protection
- Local file storage only
- No external data transmission
- Secure WebSocket connections
- Container-based isolation

## Future Enhancements

### Planned Features
- **Live Share**: Real-time collaborative editing
- **Voice Chat**: Audio communication
- **Screen Sharing**: Share VS Code sessions
- **Advanced Debugging**: Multi-language debugging support
- **Cloud Sync**: Workspace synchronization across devices
- **Mobile Support**: Responsive VS Code interface

### Extension Ecosystem
- **Custom Extensions**: AgentDB9-specific extensions
- **AI Assistants**: Integrated AI coding assistants
- **Workflow Automation**: Custom development workflows
- **Team Tools**: Enhanced collaboration features

## Testing Agent-Driven Development

### 1. Authentication Test

```bash
# Get authentication token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}' \
  | jq -r '.accessToken')

# Test VS Code access
curl -i http://localhost:8081/ \
  -H "Authorization: Bearer $TOKEN"
# Should return 302 redirect to blank VS Code workspace
```

### 2. Agent Chat Test

```bash
# Test agent chat endpoint
curl -X POST http://localhost:8000/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Create a React component for a todo list",
    "context": {"workspaceId": "test-workspace"}
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "response": "I'll help you with that! I'm going to: Create a new file...",
#     "actions": [{"type": "create_file", "description": "Create a new file", "priority": 1}],
#     "timestamp": "2025-09-28T09:19:57.905Z"
#   }
# }
```

### 3. Workflow Test

1. **Access Workspace**: Navigate to `/workspace` in browser
2. **Open Chat Panel**: Click collaboration panel button
3. **Send Message**: Type "Create a simple React app"
4. **Watch Agent Work**: See agent response and planned actions
5. **Check VS Code**: Verify blank workspace is ready for agent actions

### 4. Health Checks

```bash
# VS Code Proxy health
curl http://localhost:8081/health

# Backend API health
curl http://localhost:8000/api/health

# Agent chat availability
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/agents
```

## Support

For issues and questions:
- **Documentation**: Check this guide and MCP_INTEGRATION.md
- **Logs**: Review container and application logs
- **Community**: Join discussions and share feedback
- **Issues**: Report bugs and feature requests

---

The VS Code container integration transforms AgentDB9 into a complete development environment where humans and AI agents can collaborate seamlessly in a familiar, powerful IDE interface.