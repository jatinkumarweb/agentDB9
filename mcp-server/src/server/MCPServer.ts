import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
import { 
  MCPTool, 
  MCPResource, 
  ToolExecutionRequest, 
  ToolExecutionResult,
  MCPRequest,
  MCPResponse,
  MCPError
} from '@agentdb9/shared';
import { logger } from '../utils/logger';
import { ToolRegistry } from './ToolRegistry';
import { ResourceRegistry } from './ResourceRegistry';

export interface MCPServerConfig {
  name: string;
  version: string;
  port: number;
  llmServiceUrl: string;
  backendUrl: string;
}

export class MCPServer {
  private server: Server;
  private httpServer: express.Application;
  private wsServer: WebSocketServer;
  private toolRegistry: ToolRegistry;
  private resourceRegistry: ResourceRegistry;
  private config: MCPServerConfig;
  private isRunning = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.toolRegistry = new ToolRegistry();
    this.resourceRegistry = new ResourceRegistry();
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
      }
    );

    // Initialize HTTP server
    this.httpServer = express();
    this.setupHttpServer();

    // Initialize WebSocket server
    this.wsServer = new WebSocketServer({ port: config.port + 1 });
    this.setupWebSocketServer();

    this.setupMCPHandlers();
  }

  private setupHttpServer(): void {
    this.httpServer.use(helmet());
    this.httpServer.use(cors());
    this.httpServer.use(morgan('combined'));
    this.httpServer.use(express.json());

    // Health check
    this.httpServer.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'AgentDB9 MCP Server',
        version: this.config.version,
        timestamp: new Date().toISOString(),
        tools: this.toolRegistry.getToolCount(),
        resources: this.resourceRegistry.getResourceCount(),
        isRunning: this.isRunning
      });
    });

    // Tool execution endpoint
    this.httpServer.post('/api/tools/execute', async (req, res) => {
      try {
        const request: ToolExecutionRequest = req.body;
        
        logger.info(`[API] Tool execution request: ${request.tool}`, { 
          parameters: request.parameters,
          hasHandler: this.toolRegistry.hasHandler(request.tool)
        });
        
        // Broadcast tool execution start
        await this.broadcastToolExecution({
          conversationId: (request.context as any)?.conversationId,
          tool: request.tool,
          parameters: request.parameters,
          status: 'started'
        });
        
        const startTime = Date.now();
        const result = await this.executeTool(request);
        const duration = Date.now() - startTime;
        
        logger.info(`[API] Tool execution completed: ${request.tool}`, { 
          success: result.success,
          duration 
        });
        
        // Broadcast tool execution result
        await this.broadcastToolExecution({
          conversationId: (request.context as any)?.conversationId,
          tool: request.tool,
          parameters: request.parameters,
          status: result.success ? 'completed' : 'failed',
          result: result.result,
          error: result.error,
          duration
        });
        
        res.json(result);
      } catch (error) {
        logger.error('[API] Tool execution error:', error);
        
        // Broadcast tool execution failure
        await this.broadcastToolExecution({
          conversationId: undefined,
          tool: 'unknown',
          parameters: {},
          status: 'failed',
          error: error instanceof Error ? error.message : 'Tool execution failed'
        });
        
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Tool execution failed'
        });
      }
    });

    // List tools endpoint
    this.httpServer.get('/api/tools', (req, res) => {
      res.json({
        success: true,
        tools: this.toolRegistry.listTools()
      });
    });

    // List resources endpoint
    this.httpServer.get('/api/resources', (req, res) => {
      res.json({
        success: true,
        resources: this.resourceRegistry.listResources()
      });
    });

    // Agent action execution endpoint
    this.httpServer.post('/api/execute', async (req, res) => {
      try {
        const { action, context } = req.body;
        const result = await this.executeAgentAction(action, context);
        res.json({
          success: true,
          result
        });
      } catch (error) {
        logger.error('Agent action execution error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Action execution failed'
        });
      }
    });
  }

  private setupWebSocketServer(): void {
    this.wsServer.on('connection', (ws) => {
      logger.info('New WebSocket connection established');

      ws.on('message', async (data) => {
        try {
          const request: MCPRequest = JSON.parse(data.toString());
          const response = await this.handleMCPRequest(request);
          ws.send(JSON.stringify(response));
        } catch (error) {
          logger.error('WebSocket message error:', error);
          const errorResponse: MCPResponse = {
            id: 'unknown',
            error: {
              code: -32603,
              message: 'Internal error',
              data: error instanceof Error ? error.message : 'Unknown error'
            }
          };
          ws.send(JSON.stringify(errorResponse));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });
  }

  private setupMCPHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolRegistry.listTools()
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.toolRegistry.executeTool(name, args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error(`Tool execution failed for ${name}:`, error);
        throw error;
      }
    });
  }

  private async handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return {
            id: request.id,
            result: {
              tools: this.toolRegistry.listTools()
            }
          };

        case 'tools/call':
          const { name, arguments: args } = request.params;
          const result = await this.toolRegistry.executeTool(name, args || {});
          return {
            id: request.id,
            result
          };

        case 'resources/list':
          return {
            id: request.id,
            result: {
              resources: this.resourceRegistry.listResources()
            }
          };

        case 'resources/read':
          const { uri } = request.params;
          const resource = await this.resourceRegistry.readResource(uri);
          return {
            id: request.id,
            result: resource
          };

        default:
          throw new Error(`Unknown method: ${request.method}`);
      }
    } catch (error) {
      return {
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      };
    }
  }

  public registerTools(tools: MCPTool[]): void {
    tools.forEach(tool => {
      this.toolRegistry.registerTool(tool);
    });
  }

  public registerHandler(toolName: string, handler: (params: Record<string, any>) => Promise<any>): void {
    this.toolRegistry.registerHandler(toolName, handler);
  }

  public registerResources(resources: MCPResource[]): void {
    resources.forEach(resource => {
      this.resourceRegistry.registerResource(resource);
    });
  }

  private async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.toolRegistry.executeTool(
        request.tool, 
        request.parameters,
        request.context
      );
      
      return {
        success: true,
        result,
        duration: Date.now() - startTime,
        metadata: {
          tool: request.tool,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        metadata: {
          tool: request.tool,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Start HTTP server
        this.httpServer.listen(this.config.port, () => {
          logger.info(`MCP HTTP Server listening on port ${this.config.port}`);
          logger.info(`MCP WebSocket Server listening on port ${this.config.port + 1}`);
          this.isRunning = true;
          resolve();
        });

        // Start MCP server with stdio transport
        const transport = new StdioServerTransport();
        this.server.connect(transport);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private async broadcastToolExecution(data: {
    conversationId?: string;
    tool: string;
    parameters: any;
    status: 'started' | 'completed' | 'failed';
    result?: any;
    error?: string;
    duration?: number;
  }): Promise<void> {
    try {
      // Send to backend for WebSocket broadcasting
      const axios = (await import('axios')).default;
      await axios.post(`${this.config.backendUrl}/api/mcp/tool-execution`, {
        ...data,
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      logger.error('Failed to broadcast tool execution to backend:', error);
      // Don't throw - broadcasting failure shouldn't break tool execution
    }
  }

  private async broadcastFileChange(data: {
    conversationId?: string;
    path: string;
    action: 'created' | 'modified' | 'deleted';
    content?: string;
  }): Promise<void> {
    try {
      const axios = (await import('axios')).default;
      await axios.post(`${this.config.backendUrl}/api/mcp/file-change`, {
        ...data,
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      logger.error('Failed to broadcast file change to backend:', error);
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    
    // Close WebSocket server
    this.wsServer.close();
    
    // Close MCP server
    await this.server.close();
    
    logger.info('MCP Server stopped');
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      tools: this.toolRegistry.getToolCount(),
      resources: this.resourceRegistry.getResourceCount()
    };
  }

  private async executeAgentAction(action: any, context: any): Promise<any> {
    logger.info(`Executing agent action: ${action.type}`, { action, context });
    
    try {
      switch (action.type) {
        case 'create_file':
          return await this.createFile(action, context);
        
        case 'write_code':
          return await this.writeCode(action, context);
        
        case 'create_tests':
          return await this.createTests(action, context);
        
        case 'install_dependencies':
          return await this.installDependencies(action, context);
        
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      logger.error(`Failed to execute action ${action.type}:`, error);
      throw error;
    }
  }

  private async createFile(action: any, context: any): Promise<any> {
    // Use file system tools to create a new file
    const fileName = this.generateFileName(context);
    const content = this.generateFileContent(context);
    
    const result = await this.toolRegistry.executeTool('fs_write_file', {
      path: fileName,
      content: content
    });
    
    // Broadcast file creation event
    this.broadcastEvent('file_created', {
      fileName,
      content,
      context,
      timestamp: new Date()
    });
    
    return {
      action: 'create_file',
      fileName,
      status: 'completed',
      result
    };
  }

  private async writeCode(action: any, context: any): Promise<any> {
    // Generate code based on the context
    const code = this.generateCode(context);
    const fileName = context.fileName || 'main.ts';
    
    const result = await this.toolRegistry.executeTool('fs_write_file', {
      path: fileName,
      content: code
    });
    
    // Broadcast code writing event
    this.broadcastEvent('code_written', {
      fileName,
      code,
      context,
      timestamp: new Date()
    });
    
    return {
      action: 'write_code',
      fileName,
      status: 'completed',
      result
    };
  }

  private async createTests(action: any, context: any): Promise<any> {
    // Generate test file
    const testFileName = this.generateTestFileName(context);
    const testContent = this.generateTestContent(context);
    
    const result = await this.toolRegistry.executeTool('fs_write_file', {
      path: testFileName,
      content: testContent
    });
    
    // Broadcast test creation event
    this.broadcastEvent('tests_created', {
      testFileName,
      testContent,
      context,
      timestamp: new Date()
    });
    
    return {
      action: 'create_tests',
      testFileName,
      status: 'completed',
      result
    };
  }

  private async installDependencies(action: any, context: any): Promise<any> {
    // Use terminal tools to install dependencies
    const dependencies = this.extractDependencies(context);
    
    const result = await this.toolRegistry.executeTool('terminal_execute', {
      command: `npm install ${dependencies.join(' ')}`,
      cwd: '/workspace'
    });
    
    // Broadcast dependency installation event
    this.broadcastEvent('dependencies_installed', {
      dependencies,
      context,
      timestamp: new Date()
    });
    
    return {
      action: 'install_dependencies',
      dependencies,
      status: 'completed',
      result
    };
  }

  private generateFileName(context: any): string {
    // Simple file name generation based on context
    const baseName = context.projectName || 'project';
    const extension = context.language === 'typescript' ? '.ts' : '.js';
    return `${baseName}${extension}`;
  }

  private generateFileContent(context: any): string {
    // Simple content generation
    return `// Generated by AgentDB9
// Project: ${context.projectName || 'Untitled'}
// Created: ${new Date().toISOString()}

export default function main() {
  console.log('Hello from AgentDB9!');
}
`;
  }

  private generateCode(context: any): string {
    // Simple code generation based on context
    const message = context.message || '';
    
    if (message.toLowerCase().includes('react')) {
      return this.generateReactComponent(context);
    } else if (message.toLowerCase().includes('function')) {
      return this.generateFunction(context);
    } else {
      return this.generateBasicCode(context);
    }
  }

  private generateReactComponent(context: any): string {
    const componentName = context.componentName || 'MyComponent';
    return `import React from 'react';

interface ${componentName}Props {
  // Add props here
}

const ${componentName}: React.FC<${componentName}Props> = () => {
  return (
    <div>
      <h1>Hello from ${componentName}!</h1>
      <p>This component was generated by AgentDB9.</p>
    </div>
  );
};

export default ${componentName};
`;
  }

  private generateFunction(context: any): string {
    const functionName = context.functionName || 'myFunction';
    return `/**
 * Generated function by AgentDB9
 * ${context.message || 'No description provided'}
 */
export function ${functionName}() {
  // TODO: Implement function logic
  console.log('Function ${functionName} called');
}
`;
  }

  private generateBasicCode(context: any): string {
    return `// Generated code by AgentDB9
// Based on: ${context.message || 'No specific request'}

console.log('Code generated successfully!');

// TODO: Add your implementation here
`;
  }

  private generateTestFileName(context: any): string {
    const baseName = context.fileName || 'main';
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}.test.ts`;
  }

  private generateTestContent(context: any): string {
    const fileName = context.fileName || 'main';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    return `import { ${nameWithoutExt} } from './${nameWithoutExt}';

describe('${nameWithoutExt}', () => {
  test('should work correctly', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });
});
`;
  }

  private extractDependencies(context: any): string[] {
    const message = context.message || '';
    const dependencies = [];
    
    if (message.toLowerCase().includes('react')) {
      dependencies.push('react', '@types/react');
    }
    if (message.toLowerCase().includes('express')) {
      dependencies.push('express', '@types/express');
    }
    if (message.toLowerCase().includes('axios')) {
      dependencies.push('axios');
    }
    
    return dependencies.length > 0 ? dependencies : ['typescript'];
  }

  private broadcastEvent(eventType: string, data: any): void {
    // Broadcast event to all connected WebSocket clients
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.wsServer.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(event));
      }
    });
    
    logger.info(`Broadcasted event: ${eventType}`, data);
  }
}