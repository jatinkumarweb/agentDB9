import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  WebSocketServer as WSServer,
  WebSocketClient,
  ServerOptions,
  RPCMethodHandler,
  ConnectionHandler,
  DisconnectionHandler,
  ErrorHandler,
  ClientFilter,
  RPCRequest,
  RPCResponse,
  RPCError,
  RPCErrorCode,
  AgentRPCMethod,
} from '@agentdb9/shared';

/**
 * WebSocket Bridge Service
 * Implements production-ready WebSocket/RPC bridge for VSCode-backend communication
 */
@Injectable()
export class WebSocketBridgeService implements WSServer {
  private readonly logger = new Logger(WebSocketBridgeService.name);
  private server: Server | null = null;
  private clients = new Map<string, WebSocketClientImpl>();
  private rooms = new Map<string, Set<string>>();
  private rpcHandlers = new Map<string, RPCMethodHandler>();
  private connectionHandlers: ConnectionHandler[] = [];
  private disconnectionHandlers: DisconnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

  /**
   * Initialize the WebSocket server with Socket.IO instance
   */
  initialize(server: Server): void {
    this.server = server;
    this.setupEventHandlers();
    this.logger.log('WebSocket Bridge Service initialized');
  }

  /**
   * Start the WebSocket server
   */
  async start(port: number, options?: ServerOptions): Promise<void> {
    if (!this.server) {
      throw new Error('Server not initialized. Call initialize() first.');
    }
    this.logger.log(`WebSocket Bridge started on port ${port}`);
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.clients.clear();
      this.rooms.clear();
      this.logger.log('WebSocket Bridge stopped');
    }
  }

  /**
   * Get all connected clients
   */
  getClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get a specific client by ID
   */
  getClient(clientId: string): WebSocketClient | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * Broadcast event to all clients (with optional filter)
   */
  broadcast(event: string, data: any, filter?: ClientFilter): void {
    if (!this.server) return;

    const clients = filter 
      ? Array.from(this.clients.values()).filter(filter)
      : Array.from(this.clients.values());

    clients.forEach(client => {
      client.send(event, data);
    });

    this.logger.debug(`Broadcast ${event} to ${clients.length} clients`);
  }

  /**
   * Create a room
   */
  createRoom(roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.logger.debug(`Room created: ${roomId}`);
    }
  }

  /**
   * Delete a room
   */
  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // Remove all clients from the room
      room.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client) {
          client.leave(roomId);
        }
      });
      this.rooms.delete(roomId);
      this.logger.debug(`Room deleted: ${roomId}`);
    }
  }

  /**
   * Add client to room
   */
  addToRoom(clientId: string, roomId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.join(roomId);
      
      if (!this.rooms.has(roomId)) {
        this.createRoom(roomId);
      }
      this.rooms.get(roomId)!.add(clientId);
      
      this.logger.debug(`Client ${clientId} joined room ${roomId}`);
    }
  }

  /**
   * Remove client from room
   */
  removeFromRoom(clientId: string, roomId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.leave(roomId);
      
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(clientId);
        if (room.size === 0) {
          this.deleteRoom(roomId);
        }
      }
      
      this.logger.debug(`Client ${clientId} left room ${roomId}`);
    }
  }

  /**
   * Broadcast to a specific room
   */
  broadcastToRoom(roomId: string, event: string, data: any): void {
    if (!this.server) return;

    this.server.to(roomId).emit(event, data);
    this.logger.debug(`Broadcast ${event} to room ${roomId}`);
  }

  /**
   * Register RPC method handler
   */
  registerMethod(method: string, handler: RPCMethodHandler): void {
    this.rpcHandlers.set(method, handler);
    this.logger.debug(`RPC method registered: ${method}`);
  }

  /**
   * Unregister RPC method handler
   */
  unregisterMethod(method: string): void {
    this.rpcHandlers.delete(method);
    this.logger.debug(`RPC method unregistered: ${method}`);
  }

  /**
   * Register connection handler
   */
  onConnection(handler: ConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * Register disconnection handler
   */
  onDisconnection(handler: DisconnectionHandler): void {
    this.disconnectionHandlers.push(handler);
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.server) return;

    this.server.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    const client = new WebSocketClientImpl(socket, this.server!);
    this.clients.set(socket.id, client);

    this.logger.log(`Client connected: ${socket.id}`);

    // Setup RPC handler
    socket.on('rpc_request', async (request: RPCRequest) => {
      await this.handleRPCRequest(request, client);
    });

    // Setup room management
    socket.on('join_room', (roomId: string) => {
      this.addToRoom(socket.id, roomId);
    });

    socket.on('leave_room', (roomId: string) => {
      this.removeFromRoom(socket.id, roomId);
    });

    // Setup disconnection handler
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(client, reason);
    });

    // Setup error handler
    socket.on('error', (error: Error) => {
      this.handleError(error, client);
    });

    // Notify connection handlers
    this.connectionHandlers.forEach(handler => {
      try {
        handler(client);
      } catch (error) {
        this.logger.error('Error in connection handler:', error);
      }
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(client: WebSocketClient, reason: string): void {
    this.logger.log(`Client disconnected: ${client.id} (${reason})`);

    // Remove from all rooms
    client.rooms.forEach(roomId => {
      this.removeFromRoom(client.id, roomId);
    });

    // Remove from clients map
    this.clients.delete(client.id);

    // Notify disconnection handlers
    this.disconnectionHandlers.forEach(handler => {
      try {
        handler(client, reason);
      } catch (error) {
        this.logger.error('Error in disconnection handler:', error);
      }
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, client?: WebSocketClient): void {
    this.logger.error('WebSocket error:', error);

    // Notify error handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, client);
      } catch (handlerError) {
        this.logger.error('Error in error handler:', handlerError);
      }
    });
  }

  /**
   * Handle RPC request
   */
  private async handleRPCRequest(request: RPCRequest, client: WebSocketClient): Promise<void> {
    const response: RPCResponse = {
      id: request.id,
      timestamp: new Date(),
    };

    try {
      const handler = this.rpcHandlers.get(request.method);
      
      if (!handler) {
        response.error = {
          code: RPCErrorCode.METHOD_NOT_FOUND,
          message: `Method not found: ${request.method}`,
        };
      } else {
        const result = await handler(request.params, client);
        response.result = result;
      }
    } catch (error) {
      this.logger.error(`RPC error for method ${request.method}:`, error);
      response.error = {
        code: RPCErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Internal error',
        data: error,
      };
    }

    // Send response back to client
    client.send('rpc_response', response);
  }

  /**
   * Register standard agent RPC methods
   */
  registerStandardMethods(handlers: {
    agentService?: any;
    conversationService?: any;
    mcpService?: any;
  }): void {
    const { agentService, conversationService, mcpService } = handlers;

    // Agent methods
    if (agentService) {
      this.registerMethod(AgentRPCMethod.CREATE_AGENT, async (params, client) => {
        return await agentService.create(params, client.userId);
      });

      this.registerMethod(AgentRPCMethod.GET_AGENT, async (params) => {
        return await agentService.findOne(params.agentId);
      });

      this.registerMethod(AgentRPCMethod.LIST_AGENTS, async (params, client) => {
        return await agentService.findAll(client.userId);
      });

      this.registerMethod(AgentRPCMethod.UPDATE_AGENT, async (params) => {
        return await agentService.update(params.agentId, params.updates);
      });

      this.registerMethod(AgentRPCMethod.DELETE_AGENT, async (params) => {
        return await agentService.remove(params.agentId);
      });
    }

    // Conversation methods
    if (conversationService) {
      this.registerMethod(AgentRPCMethod.CREATE_CONVERSATION, async (params, client) => {
        return await conversationService.create(params, client.userId);
      });

      this.registerMethod(AgentRPCMethod.GET_CONVERSATION, async (params) => {
        return await conversationService.findOne(params.conversationId);
      });

      this.registerMethod(AgentRPCMethod.SEND_MESSAGE, async (params) => {
        return await conversationService.addMessage(params);
      });

      this.registerMethod(AgentRPCMethod.GET_MESSAGES, async (params) => {
        return await conversationService.getMessages(params.conversationId);
      });

      this.registerMethod(AgentRPCMethod.STOP_GENERATION, async (params) => {
        return await conversationService.stopGeneration(params.conversationId, params.messageId);
      });
    }

    // MCP/Tool methods
    if (mcpService) {
      this.registerMethod(AgentRPCMethod.EXECUTE_TOOL, async (params) => {
        return await mcpService.executeTool(params);
      });

      this.registerMethod(AgentRPCMethod.LIST_TOOLS, async () => {
        return await mcpService.listTools();
      });
    }

    this.logger.log('Standard RPC methods registered');
  }
}

/**
 * WebSocket client implementation
 */
class WebSocketClientImpl implements WebSocketClient {
  public readonly rooms = new Set<string>();
  public metadata: Record<string, any> = {};
  public readonly connectedAt = new Date();
  public lastActivity = new Date();

  constructor(
    private socket: Socket,
    private server: Server,
  ) {}

  get id(): string {
    return this.socket.id;
  }

  get userId(): string | undefined {
    return this.socket.handshake.auth?.userId || this.metadata.userId;
  }

  get sessionId(): string | undefined {
    return this.socket.handshake.auth?.sessionId || this.metadata.sessionId;
  }

  send(event: string, data: any): void {
    this.socket.emit(event, data);
    this.lastActivity = new Date();
  }

  disconnect(reason?: string): void {
    this.socket.disconnect(true);
  }

  join(room: string): void {
    this.socket.join(room);
    this.rooms.add(room);
  }

  leave(room: string): void {
    this.socket.leave(room);
    this.rooms.delete(room);
  }
}
