import { MCPServer } from './server/MCPServer';
import { VSCodeBridge } from './bridges/VSCodeBridge';
import { FileSystemTools } from './tools/FileSystemTools';
import { GitTools } from './tools/GitTools';
import { TerminalTools } from './tools/TerminalTools';
import { EditorTools } from './tools/EditorTools';
import { TestingTools } from './tools/TestingTools';
import { ProjectTools } from './tools/ProjectTools';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.MCP_PORT || 9001;
const VSCODE_HOST = process.env.VSCODE_HOST || 'vscode';
const VSCODE_PORT = process.env.VSCODE_PORT || 8080;
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://llm-service:9000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

async function startMCPServer() {
  try {
    logger.info('Starting MCP Server for AgentDB9...');

    // Initialize VS Code bridge
    const vscode = new VSCodeBridge({
      port: Number(VSCODE_PORT),
      host: VSCODE_HOST
    });

    // Initialize tool providers
    const fileSystemTools = new FileSystemTools();
    const gitTools = new GitTools();
    const terminalTools = new TerminalTools();
    const editorTools = new EditorTools(vscode);
    const testingTools = new TestingTools(terminalTools);
    const projectTools = new ProjectTools(fileSystemTools, gitTools);

    // Create MCP server
    const mcpServer = new MCPServer({
      name: 'AgentDB9 MCP Server',
      version: '1.0.0',
      port: Number(PORT),
      llmServiceUrl: LLM_SERVICE_URL,
      backendUrl: BACKEND_URL
    });

    // Register tools
    mcpServer.registerTools([
      ...fileSystemTools.getTools(),
      ...gitTools.getTools(),
      ...terminalTools.getTools(),
      ...editorTools.getTools(),
      ...testingTools.getTools(),
      ...projectTools.getTools()
    ]);

    // Register tool handlers
    logger.info('Registering tool handlers...');
    
    // File system handlers
    mcpServer.registerHandler('fs_read_file', async (params) => {
      logger.info(`[HANDLER] fs_read_file called with path: ${params.path}`);
      return await fileSystemTools.readFile(params.path);
    });
    
    mcpServer.registerHandler('fs_write_file', async (params) => {
      logger.info(`[HANDLER] fs_write_file called with path: ${params.path}`);
      return await fileSystemTools.writeFile(params.path, params.content);
    });
    
    mcpServer.registerHandler('fs_create_file', async (params) => {
      logger.info(`[HANDLER] fs_create_file called with path: ${params.path}`);
      return await fileSystemTools.createFile(params.path, params.content || '');
    });
    
    mcpServer.registerHandler('fs_delete_file', async (params) => {
      logger.info(`[HANDLER] fs_delete_file called with path: ${params.path}`);
      return await fileSystemTools.deleteFile(params.path);
    });
    
    mcpServer.registerHandler('fs_rename_file', async (params) => {
      logger.info(`[HANDLER] fs_rename_file called: ${params.oldPath} -> ${params.newPath}`);
      return await fileSystemTools.renameFile(params.oldPath, params.newPath);
    });
    
    mcpServer.registerHandler('fs_copy_file', async (params) => {
      logger.info(`[HANDLER] fs_copy_file called: ${params.source} -> ${params.destination}`);
      return await fileSystemTools.copyFile(params.source, params.destination);
    });
    
    mcpServer.registerHandler('fs_create_directory', async (params) => {
      logger.info(`[HANDLER] fs_create_directory called with path: ${params.path}`);
      return await fileSystemTools.createDirectory(params.path);
    });
    
    mcpServer.registerHandler('fs_delete_directory', async (params) => {
      logger.info(`[HANDLER] fs_delete_directory called with path: ${params.path}`);
      return await fileSystemTools.deleteDirectory(params.path, params.recursive || false);
    });
    
    mcpServer.registerHandler('fs_list_directory', async (params) => {
      logger.info(`[HANDLER] fs_list_directory called with path: ${params.path}`);
      return await fileSystemTools.listDirectory(params.path);
    });
    
    mcpServer.registerHandler('fs_exists', async (params) => {
      logger.info(`[HANDLER] fs_exists called with path: ${params.path}`);
      return await fileSystemTools.exists(params.path);
    });
    
    mcpServer.registerHandler('fs_get_stats', async (params) => {
      logger.info(`[HANDLER] fs_get_stats called with path: ${params.path}`);
      return await fileSystemTools.getFileStats(params.path);
    });
    
    // Terminal handlers
    mcpServer.registerHandler('terminal_execute', async (params) => {
      logger.info(`[HANDLER] terminal_execute called with command: ${params.command}`);
      return await terminalTools.executeCommand(params.command, params.cwd);
    });
    
    mcpServer.registerHandler('terminal_create', async (params) => {
      logger.info(`[HANDLER] terminal_create called with name: ${params.name}`);
      return await terminalTools.createTerminal(params.name, params.cwd, params.shell);
    });
    
    mcpServer.registerHandler('terminal_send_text', async (params) => {
      logger.info(`[HANDLER] terminal_send_text called for terminal: ${params.terminalId}`);
      return await terminalTools.sendText(params.terminalId, params.text, params.addNewLine);
    });
    
    mcpServer.registerHandler('terminal_list', async (params) => {
      logger.info(`[HANDLER] terminal_list called`);
      return await terminalTools.listTerminals();
    });
    
    mcpServer.registerHandler('terminal_get_active', async (params) => {
      logger.info(`[HANDLER] terminal_get_active called`);
      return await terminalTools.getActiveTerminal();
    });
    
    mcpServer.registerHandler('terminal_set_active', async (params) => {
      logger.info(`[HANDLER] terminal_set_active called for terminal: ${params.terminalId}`);
      return await terminalTools.setActiveTerminal(params.terminalId);
    });
    
    mcpServer.registerHandler('terminal_dispose', async (params) => {
      logger.info(`[HANDLER] terminal_dispose called for terminal: ${params.terminalId}`);
      return await terminalTools.disposeTerminal(params.terminalId);
    });
    
    mcpServer.registerHandler('terminal_resize', async (params) => {
      logger.info(`[HANDLER] terminal_resize called for terminal: ${params.terminalId}`);
      return await terminalTools.resizeTerminal(params.terminalId, params.cols, params.rows);
    });
    
    mcpServer.registerHandler('terminal_clear', async (params) => {
      logger.info(`[HANDLER] terminal_clear called for terminal: ${params.terminalId}`);
      return await terminalTools.clearTerminal(params.terminalId);
    });
    
    logger.info('Tool handlers registered successfully');

    // Register resources
    mcpServer.registerResources([
      {
        uri: 'workspace://files',
        name: 'Workspace Files',
        description: 'Access to workspace file system',
        mimeType: 'application/json'
      },
      {
        uri: 'git://status',
        name: 'Git Status',
        description: 'Current git repository status',
        mimeType: 'application/json'
      },
      {
        uri: 'editor://active',
        name: 'Active Editor',
        description: 'Currently active editor state',
        mimeType: 'application/json'
      }
    ]);

    // Start the server
    await mcpServer.start();

    logger.info(`🚀 MCP Server started on port ${PORT}`);
    logger.info(`🔗 Connected to VS Code at ${VSCODE_HOST}:${VSCODE_PORT}`);
    logger.info(`🧠 LLM Service: ${LLM_SERVICE_URL}`);
    logger.info(`🔧 Backend Service: ${BACKEND_URL}`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down MCP Server...');
      await mcpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down MCP Server...');
      await mcpServer.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start MCP Server:', error);
    process.exit(1);
  }
}

// Start the server
startMCPServer().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});