# MCP Server Integration for AgentDB9

## Overview

The Model Context Protocol (MCP) server provides a bridge between the LLM service and VS Code, enabling the AI agent to perform coding tasks autonomously. The server exposes 67 tools across 5 categories for comprehensive development workflow automation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLM Service   │◄──►│   MCP Server    │◄──►│    VS Code      │
│   (Port 9000)   │    │   (Port 9001)   │    │  (Port 24247)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Backend Service │
                       │   (Port 8000)   │
                       └─────────────────┘
```

## Tool Categories

### 1. File System Tools (13 tools)
- **fs_read_file**: Read file contents
- **fs_write_file**: Write content to files
- **fs_create_file**: Create new files
- **fs_delete_file**: Delete files
- **fs_rename_file**: Rename/move files
- **fs_copy_file**: Copy files
- **fs_create_directory**: Create directories
- **fs_delete_directory**: Delete directories
- **fs_list_directory**: List directory contents
- **fs_exists**: Check file/directory existence
- **fs_get_stats**: Get file statistics
- **fs_watch_file**: Watch for file changes
- **fs_unwatch_file**: Stop watching files

### 2. Git Tools (15 tools)
- **git_status**: Get repository status
- **git_add**: Stage files
- **git_commit**: Commit changes
- **git_push**: Push to remote
- **git_pull**: Pull from remote
- **git_checkout**: Switch branches/commits
- **git_create_branch**: Create new branches
- **git_list_branches**: List all branches
- **git_current_branch**: Get current branch
- **git_diff**: Show differences
- **git_log**: Show commit history
- **git_reset**: Reset to specific state
- **git_stash**: Stash operations
- **git_init**: Initialize repository
- **git_clone**: Clone repositories

### 3. Terminal Tools (8 tools)
- **terminal_execute**: Execute shell commands
- **terminal_create**: Create new terminals
- **terminal_send_text**: Send text to terminals
- **terminal_list**: List active terminals
- **terminal_get_active**: Get active terminal
- **terminal_set_active**: Set active terminal
- **terminal_dispose**: Close terminals
- **terminal_resize**: Resize terminals
- **terminal_clear**: Clear terminal content

### 4. Editor Tools (18 tools)
- **editor_open_file**: Open files in editor
- **editor_close_file**: Close editor tabs
- **editor_insert_text**: Insert text at position
- **editor_replace_text**: Replace text in range
- **editor_delete_text**: Delete text in range
- **editor_format_document**: Format code
- **editor_organize_imports**: Organize imports
- **editor_get_active_file**: Get active file
- **editor_get_open_files**: List open files
- **editor_get_selection**: Get selected text
- **editor_get_cursor_position**: Get cursor position
- **editor_set_cursor_position**: Set cursor position
- **editor_select_range**: Select text range
- **editor_show_quick_pick**: Show selection dialog
- **editor_show_input_box**: Show input dialog
- **editor_show_message**: Show messages
- **editor_find_and_replace**: Find and replace text
- **editor_go_to_line**: Navigate to line
- **editor_fold_range**: Fold code sections
- **editor_unfold_range**: Unfold code sections

### 5. Testing Tools (10 tools)
- **test_run_all**: Run all tests
- **test_run_file**: Run specific test file
- **test_run_pattern**: Run tests matching pattern
- **test_generate**: Generate test cases
- **test_watch**: Run tests in watch mode
- **test_coverage**: Generate coverage reports
- **test_detect_framework**: Detect test framework
- **test_list_files**: List test files
- **test_debug**: Debug tests
- **test_setup**: Setup testing environment

### 6. Project Tools (10 tools)
- **project_init**: Initialize new projects
- **project_list_templates**: List project templates
- **project_analyze**: Analyze project structure
- **project_add_dependency**: Add dependencies
- **project_remove_dependency**: Remove dependencies
- **project_install_dependencies**: Install dependencies
- **project_build**: Build projects
- **project_clean**: Clean build artifacts
- **project_scaffold_component**: Generate components
- **project_generate_config**: Generate config files

## Supported Frameworks

### Testing Frameworks
- **Jest**: JavaScript/TypeScript testing
- **Vitest**: Fast Vite-native testing
- **Mocha**: JavaScript testing framework
- **Cypress**: End-to-end testing
- **Playwright**: Cross-browser testing
- **Pytest**: Python testing
- **Go Test**: Go testing
- **Cargo Test**: Rust testing

### Project Templates
- **node-typescript**: Node.js TypeScript project
- **react-typescript**: React TypeScript with Vite
- **python-basic**: Basic Python project with pytest

## Usage Examples

### Initialize a Git Repository
```json
{
  "tool": "git_init",
  "parameters": {
    "path": "/workspace/my-project"
  }
}
```

### Create and Write a File
```json
{
  "tool": "fs_create_file",
  "parameters": {
    "path": "src/index.ts",
    "content": "console.log('Hello, World!');"
  }
}
```

### Run Tests
```json
{
  "tool": "test_run_all",
  "parameters": {
    "framework": "jest",
    "coverage": true,
    "verbose": true
  }
}
```

### Execute Terminal Command
```json
{
  "tool": "terminal_execute",
  "parameters": {
    "command": "npm install",
    "cwd": "/workspace/my-project",
    "timeout": 60000
  }
}
```

### Initialize New Project
```json
{
  "tool": "project_init",
  "parameters": {
    "name": "my-app",
    "template": "react-typescript",
    "gitInit": true,
    "installDeps": true
  }
}
```

## Configuration

### Environment Variables
- **MCP_PORT**: MCP server port (default: 9001)
- **VSCODE_PORT**: VS Code bridge port (default: 24247)
- **LLM_SERVICE_URL**: LLM service URL (default: http://localhost:9000)
- **BACKEND_URL**: Backend service URL (default: http://localhost:8000)

### Starting the MCP Server
```bash
cd mcp-server
npm install
npm run build
npm start
```

### Development Mode
```bash
cd mcp-server
npm run dev
```

## Integration with LLM Service

The MCP server integrates with the LLM service to enable autonomous coding tasks:

1. **LLM receives coding request** from user
2. **LLM analyzes task** and determines required tools
3. **LLM calls MCP tools** via HTTP/WebSocket API
4. **MCP server executes tools** and returns results
5. **LLM processes results** and continues workflow
6. **Final result** is returned to user

## Security Considerations

- All file operations are sandboxed to the workspace
- Git operations require proper authentication
- Terminal commands have configurable timeouts
- File watching has automatic cleanup
- Input validation on all tool parameters

## Error Handling

- Comprehensive error messages with context
- Automatic cleanup of resources (watchers, terminals)
- Graceful degradation when tools fail
- Detailed logging for debugging

## Future Enhancements

- **Language Server Protocol** integration
- **Debugging tools** for step-through debugging
- **Package manager** abstraction layer
- **Docker/container** operations
- **Database** migration tools
- **API testing** tools
- **Code analysis** and linting tools
- **Deployment** automation tools

## Troubleshooting

### Common Issues

1. **MCP server won't start**
   - Check if ports 9001/9002 are available
   - Verify shared package is built: `cd shared && npm run build`

2. **Tools not working**
   - Ensure VS Code bridge is connected
   - Check workspace permissions
   - Verify git repository is initialized

3. **Test tools failing**
   - Check if test framework is installed
   - Verify test files exist
   - Ensure package.json has test scripts

### Logs
The MCP server provides detailed logging:
- **INFO**: General operations and tool execution
- **WARN**: Non-critical issues
- **ERROR**: Failed operations with stack traces
- **DEBUG**: Detailed execution flow (development mode)

## API Documentation

The MCP server exposes both HTTP and WebSocket APIs:

- **HTTP API**: `http://localhost:9001/api/tools`
- **WebSocket API**: `ws://localhost:9002`
- **Health Check**: `http://localhost:9001/health`

Each tool follows the MCP protocol specification with standardized request/response formats.