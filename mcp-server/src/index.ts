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
const VSCODE_PORT = process.env.VSCODE_PORT || 24247;
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:9000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function startMCPServer() {
  try {
    logger.info('Starting MCP Server for AgentDB9...');

    // Initialize VS Code bridge
    const vscode = new VSCodeBridge({
      port: Number(VSCODE_PORT),
      host: 'localhost'
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
    logger.info(`🔗 Connected to VS Code on port ${VSCODE_PORT}`);
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