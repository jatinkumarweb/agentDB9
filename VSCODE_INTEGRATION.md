# VS Code Container Integration

## Overview

AgentDB9 now includes a full VS Code container integration that provides a complete IDE experience in the browser, similar to Gitpod. This allows users to monitor and interact with AI agent work in real-time using a familiar development environment.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Workspace     │  │  Agent Activity │  │  Collaboration  │  │
│  │     Page        │  │    Overlay      │  │     Panel       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Container (code-server)              │
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

## Features

### 🖥️ **Full VS Code Experience**
- Complete VS Code interface with all native features
- File explorer, editor, terminal, git panel, debug panel
- Extension support for enhanced functionality
- Familiar keyboard shortcuts and workflows

### 🤖 **Real-time Agent Monitoring**
- Live agent activity overlay showing current operations
- Visual indicators for file edits, git operations, terminal commands
- Activity history with timestamps and status
- Error reporting and debugging information

### 👥 **Collaboration Features**
- Multi-user workspace sharing
- Real-time chat with team members and AI agent
- User presence indicators
- Shared workspace URLs for easy access

### 🔧 **Integrated Development Tools**
- Syntax highlighting for 20+ programming languages
- IntelliSense and code completion
- Integrated debugging capabilities
- Git integration with visual diff and merge tools
- Built-in terminal with full shell access

### 📊 **Agent Activity Tracking**
- File operations (create, edit, delete)
- Git operations (commit, push, branch management)
- Terminal command execution
- Test running and coverage analysis
- Project scaffolding and dependency management

## Getting Started

### 1. Access the Workspace

Navigate to the workspace page in your browser:
```
https://your-domain.com/workspace
```

Or use the direct VS Code URL:
```
http://localhost:8080
```

### 2. VS Code Authentication

The VS Code container is protected with password authentication:
- **Default Password**: `codeserver123`
- **Environment Variable**: `VSCODE_PASSWORD`

### 3. Workspace Structure

The workspace is mounted at `/home/coder/workspace` and includes:
- **Frontend**: Next.js application (`/frontend`)
- **Backend**: NestJS API (`/backend`) 
- **LLM Service**: AI processing service (`/llm-service`)
- **MCP Server**: Tool execution server (`/mcp-server`)
- **Shared**: Common types and utilities (`/shared`)

## Configuration

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

## Development Workflow

### 1. Agent Task Execution

When an AI agent receives a coding task:
1. **Analysis**: Agent analyzes the requirements
2. **Planning**: Determines required tools and operations
3. **Execution**: Uses MCP tools to perform operations
4. **Monitoring**: Users see real-time progress in VS Code
5. **Completion**: Results are visible in the workspace

### 2. Human Collaboration

Users can:
- **Monitor**: Watch agent work in real-time
- **Intervene**: Make manual changes when needed
- **Guide**: Provide feedback through chat
- **Review**: Examine agent-generated code
- **Test**: Run tests and verify functionality

### 3. Version Control

Git integration provides:
- **Visual Diff**: See changes made by agent
- **Commit History**: Track agent commits
- **Branch Management**: Agent can create and switch branches
- **Merge Conflicts**: Resolve conflicts collaboratively

## Troubleshooting

### Common Issues

1. **VS Code Won't Load**
   - Check if code-server container is running: `docker-compose ps vscode`
   - Verify port 8080 is accessible
   - Check container logs: `docker-compose logs vscode`

2. **Permission Errors**
   - Ensure proper volume permissions
   - Check user ID mapping in Docker
   - Restart container: `docker-compose restart vscode`

3. **Agent Activity Not Showing**
   - Verify MCP server is running on port 9001
   - Check WebSocket connection to port 9002
   - Ensure frontend can reach MCP server

4. **Extensions Not Loading**
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
- Password-protected VS Code access
- Environment variable configuration
- Network isolation via Docker
- File system sandboxing

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

## Support

For issues and questions:
- **Documentation**: Check this guide and MCP_INTEGRATION.md
- **Logs**: Review container and application logs
- **Community**: Join discussions and share feedback
- **Issues**: Report bugs and feature requests

---

The VS Code container integration transforms AgentDB9 into a complete development environment where humans and AI agents can collaborate seamlessly in a familiar, powerful IDE interface.