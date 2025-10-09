/**
 * Integration tests for WebSocket Bridge Service
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketBridgeService } from '../websocket-bridge.service';
import {
  RPCRequest,
  RPCResponse,
  RPCErrorCode,
  AgentEventType,
  AgentRPCMethod,
} from '@agentdb9/shared';

describe('WebSocket Bridge Integration Tests', () => {
  let app: INestApplication;
  let bridgeService: WebSocketBridgeService;
  let server: Server;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll(async () => {
    // Create testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [WebSocketBridgeService],
    }).compile();

    app = moduleFixture.createNestApplication();
    bridgeService = moduleFixture.get<WebSocketBridgeService>(WebSocketBridgeService);

    // Create Socket.IO server
    server = new Server(app.getHttpServer(), {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize bridge service
    bridgeService.initialize(server);

    // Start the app
    await app.listen(0); // Use random available port
    port = app.getHttpServer().address().port;
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    await app.close();
  });

  beforeEach((done) => {
    // Create client socket before each test
    clientSocket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      reconnection: false,
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.close();
    }
  });

  describe('Connection Management', () => {
    it('should connect successfully', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should track connected clients', () => {
      const clients = bridgeService.getClients();
      expect(clients.length).toBeGreaterThan(0);
    });

    it('should get client by ID', () => {
      const client = bridgeService.getClient(clientSocket.id);
      expect(client).toBeDefined();
      expect(client?.id).toBe(clientSocket.id);
    });

    it('should handle disconnection', (done) => {
      const clientId = clientSocket.id;
      
      clientSocket.on('disconnect', () => {
        setTimeout(() => {
          const client = bridgeService.getClient(clientId);
          expect(client).toBeNull();
          done();
        }, 100);
      });

      clientSocket.close();
    });
  });

  describe('Event Broadcasting', () => {
    it('should broadcast event to all clients', (done) => {
      const testData = { message: 'test broadcast' };
      
      clientSocket.on('test_event', (data) => {
        expect(data).toEqual(testData);
        done();
      });

      bridgeService.broadcast('test_event', testData);
    });

    it('should broadcast with filter', (done) => {
      const testData = { message: 'filtered broadcast' };
      
      clientSocket.on('filtered_event', (data) => {
        expect(data).toEqual(testData);
        done();
      });

      // Broadcast only to clients with matching ID
      bridgeService.broadcast('filtered_event', testData, (client) => {
        return client.id === clientSocket.id;
      });
    });
  });

  describe('Room Management', () => {
    it('should create and join room', (done) => {
      const roomId = 'test-room';
      
      bridgeService.createRoom(roomId);
      bridgeService.addToRoom(clientSocket.id, roomId);

      clientSocket.on('room_message', (data) => {
        expect(data.message).toBe('hello room');
        done();
      });

      bridgeService.broadcastToRoom(roomId, 'room_message', { message: 'hello room' });
    });

    it('should leave room', (done) => {
      const roomId = 'test-room-2';
      
      bridgeService.createRoom(roomId);
      bridgeService.addToRoom(clientSocket.id, roomId);
      bridgeService.removeFromRoom(clientSocket.id, roomId);

      let messageReceived = false;
      clientSocket.on('room_message_2', () => {
        messageReceived = true;
      });

      bridgeService.broadcastToRoom(roomId, 'room_message_2', { message: 'should not receive' });

      setTimeout(() => {
        expect(messageReceived).toBe(false);
        done();
      }, 100);
    });

    it('should delete room', () => {
      const roomId = 'test-room-3';
      
      bridgeService.createRoom(roomId);
      bridgeService.addToRoom(clientSocket.id, roomId);
      bridgeService.deleteRoom(roomId);

      // Room should be deleted
      const client = bridgeService.getClient(clientSocket.id);
      expect(client?.rooms.has(roomId)).toBe(false);
    });
  });

  describe('RPC Method Registration', () => {
    it('should register and execute RPC method', (done) => {
      // Register a test method
      bridgeService.registerMethod('test.method', async (params) => {
        return { result: params.value * 2 };
      });

      const request: RPCRequest = {
        id: 'test-1',
        method: 'test.method',
        params: { value: 5 },
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        expect(response.id).toBe(request.id);
        expect(response.result).toEqual({ result: 10 });
        expect(response.error).toBeUndefined();
        done();
      });

      clientSocket.emit('rpc_request', request);
    });

    it('should handle method not found', (done) => {
      const request: RPCRequest = {
        id: 'test-2',
        method: 'nonexistent.method',
        params: {},
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        expect(response.id).toBe(request.id);
        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(RPCErrorCode.METHOD_NOT_FOUND);
        done();
      });

      clientSocket.emit('rpc_request', request);
    });

    it('should handle method errors', (done) => {
      // Register a method that throws an error
      bridgeService.registerMethod('test.error', async () => {
        throw new Error('Test error');
      });

      const request: RPCRequest = {
        id: 'test-3',
        method: 'test.error',
        params: {},
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        expect(response.id).toBe(request.id);
        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(RPCErrorCode.INTERNAL_ERROR);
        expect(response.error?.message).toContain('Test error');
        done();
      });

      clientSocket.emit('rpc_request', request);
    });

    it('should unregister method', (done) => {
      bridgeService.registerMethod('test.unregister', async () => {
        return { success: true };
      });

      bridgeService.unregisterMethod('test.unregister');

      const request: RPCRequest = {
        id: 'test-4',
        method: 'test.unregister',
        params: {},
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        expect(response.error?.code).toBe(RPCErrorCode.METHOD_NOT_FOUND);
        done();
      });

      clientSocket.emit('rpc_request', request);
    });
  });

  describe('Standard Agent Methods', () => {
    beforeAll(() => {
      // Mock services
      const mockAgentService = {
        findAll: jest.fn().mockResolvedValue([
          { id: '1', name: 'Agent 1' },
          { id: '2', name: 'Agent 2' },
        ]),
        findOne: jest.fn().mockResolvedValue({ id: '1', name: 'Agent 1' }),
        create: jest.fn().mockResolvedValue({ id: '3', name: 'New Agent' }),
      };

      const mockConversationService = {
        findOne: jest.fn().mockResolvedValue({ id: '1', title: 'Test Conversation' }),
        create: jest.fn().mockResolvedValue({ id: '2', title: 'New Conversation' }),
      };

      // Register standard methods
      bridgeService.registerStandardMethods({
        agentService: mockAgentService,
        conversationService: mockConversationService,
      });
    });

    it('should list agents', (done) => {
      const request: RPCRequest = {
        id: 'agent-list-1',
        method: AgentRPCMethod.LIST_AGENTS,
        params: { userId: 'user-1' },
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        if (response.id === request.id) {
          expect(response.result).toHaveLength(2);
          expect(response.error).toBeUndefined();
          done();
        }
      });

      clientSocket.emit('rpc_request', request);
    });

    it('should get agent by ID', (done) => {
      const request: RPCRequest = {
        id: 'agent-get-1',
        method: AgentRPCMethod.GET_AGENT,
        params: { agentId: '1' },
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        if (response.id === request.id) {
          expect(response.result).toEqual({ id: '1', name: 'Agent 1' });
          done();
        }
      });

      clientSocket.emit('rpc_request', request);
    });

    it('should create agent', (done) => {
      const request: RPCRequest = {
        id: 'agent-create-1',
        method: AgentRPCMethod.CREATE_AGENT,
        params: { name: 'New Agent' },
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        if (response.id === request.id) {
          expect(response.result).toEqual({ id: '3', name: 'New Agent' });
          done();
        }
      });

      clientSocket.emit('rpc_request', request);
    });
  });

  describe('Event Handlers', () => {
    it('should handle connection events', (done) => {
      let connectionHandlerCalled = false;

      bridgeService.onConnection((client) => {
        connectionHandlerCalled = true;
        expect(client.id).toBeDefined();
      });

      // Create new connection
      const newClient = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      newClient.on('connect', () => {
        setTimeout(() => {
          expect(connectionHandlerCalled).toBe(true);
          newClient.close();
          done();
        }, 100);
      });
    });

    it('should handle disconnection events', (done) => {
      let disconnectionHandlerCalled = false;

      bridgeService.onDisconnection((client, reason) => {
        disconnectionHandlerCalled = true;
        expect(client.id).toBeDefined();
        expect(reason).toBeDefined();
      });

      const tempClient = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      tempClient.on('connect', () => {
        tempClient.close();
      });

      setTimeout(() => {
        expect(disconnectionHandlerCalled).toBe(true);
        done();
      }, 200);
    });
  });

  describe('Agent Event Types', () => {
    it('should emit agent status update', (done) => {
      clientSocket.on(AgentEventType.AGENT_STATUS_UPDATE, (event) => {
        expect(event.agentId).toBe('agent-1');
        expect(event.status).toBe('thinking');
        done();
      });

      bridgeService.broadcast(AgentEventType.AGENT_STATUS_UPDATE, {
        agentId: 'agent-1',
        status: 'thinking',
        message: 'Processing request',
      });
    });

    it('should emit message streaming event', (done) => {
      clientSocket.on(AgentEventType.MESSAGE_STREAMING, (event) => {
        expect(event.messageId).toBe('msg-1');
        expect(event.content).toBe('Hello');
        done();
      });

      bridgeService.broadcast(AgentEventType.MESSAGE_STREAMING, {
        messageId: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello',
        isComplete: false,
      });
    });

    it('should emit task progress event', (done) => {
      clientSocket.on(AgentEventType.TASK_PROGRESS, (event) => {
        expect(event.taskId).toBe('task-1');
        expect(event.progress).toBe(50);
        done();
      });

      bridgeService.broadcast(AgentEventType.TASK_PROGRESS, {
        taskId: 'task-1',
        agentId: 'agent-1',
        progress: 50,
        stage: 'processing',
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent requests', async () => {
      bridgeService.registerMethod('test.concurrent', async (params) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { value: params.value };
      });

      const requests = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        method: 'test.concurrent',
        params: { value: i },
        timestamp: new Date(),
      }));

      const responses: RPCResponse[] = [];

      return new Promise<void>((resolve) => {
        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id.startsWith('concurrent-')) {
            responses.push(response);
            if (responses.length === requests.length) {
              expect(responses).toHaveLength(10);
              responses.forEach((resp, i) => {
                expect(resp.result.value).toBe(i);
              });
              resolve();
            }
          }
        });

        requests.forEach(req => clientSocket.emit('rpc_request', req));
      });
    });

    it('should handle rapid event emissions', (done) => {
      let eventCount = 0;
      const expectedCount = 100;

      clientSocket.on('rapid_event', () => {
        eventCount++;
        if (eventCount === expectedCount) {
          done();
        }
      });

      for (let i = 0; i < expectedCount; i++) {
        bridgeService.broadcast('rapid_event', { index: i });
      }
    });
  });
});
