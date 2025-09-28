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
        const result = await this.executeTool(request);
        res.json(result);
      } catch (error) {
        logger.error('Tool execution error:', error);
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
}