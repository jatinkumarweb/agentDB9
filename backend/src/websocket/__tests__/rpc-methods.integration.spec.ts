/**
 * Integration tests for RPC methods
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketBridgeService } from '../websocket-bridge.service';
import {
  RPCRequest,
  RPCResponse,
  AgentRPCMethod,
  AgentConfiguration,
  DEFAULT_AGENT_CONFIGURATION,
} from '@agentdb9/shared';

describe('RPC Methods Integration Tests', () => {
  let app: INestApplication;
  let bridgeService: WebSocketBridgeService;
  let server: Server;
  let clientSocket: ClientSocket;
  let port: number;

  // Mock services
  const mockAgentService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockConversationService = {
    findOne: jest.fn(),
    create: jest.fn(),
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    stopGeneration: jest.fn(),
  };

  const mockMCPService = {
    executeTool: jest.fn(),
    listTools: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [WebSocketBridgeService],
    }).compile();

    app = moduleFixture.createNestApplication();
    bridgeService = moduleFixture.get<WebSocketBridgeService>(WebSocketBridgeService);

    server = new Server(app.getHttpServer(), {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    bridgeService.initialize(server);

    // Register standard methods with mock services
    bridgeService.registerStandardMethods({
      agentService: mockAgentService,
      conversationService: mockConversationService,
      mcpService: mockMCPService,
    });

    await app.listen(0);
    port = app.getHttpServer().address().port;
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    await app.close();
  });

  beforeEach((done) => {
    clientSocket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { userId: 'test-user-1' },
    });

    clientSocket.on('connect', () => {
      done();
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.close();
    }
  });

  describe('Agent Management RPC Methods', () => {
    describe('LIST_AGENTS', () => {
      it('should list all agents for user', (done) => {
        const mockAgents = [
          { id: 'agent-1', name: 'Agent 1', userId: 'test-user-1' },
          { id: 'agent-2', name: 'Agent 2', userId: 'test-user-1' },
        ];

        mockAgentService.findAll.mockResolvedValue(mockAgents);

        const request: RPCRequest = {
          id: 'list-agents-1',
          method: AgentRPCMethod.LIST_AGENTS,
          params: {},
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(mockAgents);
            expect(mockAgentService.findAll).toHaveBeenCalledWith('test-user-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('GET_AGENT', () => {
      it('should get agent by ID', (done) => {
        const mockAgent = {
          id: 'agent-1',
          name: 'Test Agent',
          configuration: DEFAULT_AGENT_CONFIGURATION,
        };

        mockAgentService.findOne.mockResolvedValue(mockAgent);

        const request: RPCRequest = {
          id: 'get-agent-1',
          method: AgentRPCMethod.GET_AGENT,
          params: { agentId: 'agent-1' },
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(mockAgent);
            expect(mockAgentService.findOne).toHaveBeenCalledWith('agent-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });

      it('should handle agent not found', (done) => {
        mockAgentService.findOne.mockRejectedValue(new Error('Agent not found'));

        const request: RPCRequest = {
          id: 'get-agent-2',
          method: AgentRPCMethod.GET_AGENT,
          params: { agentId: 'nonexistent' },
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.error).toBeDefined();
            expect(response.error?.message).toContain('Agent not found');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('CREATE_AGENT', () => {
      it('should create new agent', (done) => {
        const newAgent = {
          name: 'New Agent',
          configuration: DEFAULT_AGENT_CONFIGURATION,
        };

        const createdAgent = {
          id: 'agent-3',
          ...newAgent,
          userId: 'test-user-1',
        };

        mockAgentService.create.mockResolvedValue(createdAgent);

        const request: RPCRequest = {
          id: 'create-agent-1',
          method: AgentRPCMethod.CREATE_AGENT,
          params: newAgent,
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(createdAgent);
            expect(mockAgentService.create).toHaveBeenCalledWith(newAgent, 'test-user-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('UPDATE_AGENT', () => {
      it('should update agent', (done) => {
        const updates = { name: 'Updated Agent' };
        const updatedAgent = {
          id: 'agent-1',
          name: 'Updated Agent',
          configuration: DEFAULT_AGENT_CONFIGURATION,
        };

        mockAgentService.update.mockResolvedValue(updatedAgent);

        const request: RPCRequest = {
          id: 'update-agent-1',
          method: AgentRPCMethod.UPDATE_AGENT,
          params: { agentId: 'agent-1', updates },
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(updatedAgent);
            expect(mockAgentService.update).toHaveBeenCalledWith('agent-1', updates);
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('DELETE_AGENT', () => {
      it('should delete agent', (done) => {
        mockAgentService.remove.mockResolvedValue(undefined);

        const request: RPCRequest = {
          id: 'delete-agent-1',
          method: AgentRPCMethod.DELETE_AGENT,
          params: { agentId: 'agent-1' },
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toBeUndefined();
            expect(mockAgentService.remove).toHaveBeenCalledWith('agent-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });
  });

  describe('Conversation Management RPC Methods', () => {
    describe('CREATE_CONVERSATION', () => {
      it('should create new conversation', (done) => {
        const newConversation = {
          agentId: 'agent-1',
          title: 'New Conversation',
        };

        const createdConversation = {
          id: 'conv-1',
          ...newConversation,
          userId: 'test-user-1',
          messages: [],
        };

        mockConversationService.create.mockResolvedValue(createdConversation);

        const request: RPCRequest = {
          id: 'create-conv-1',
          method: AgentRPCMethod.CREATE_CONVERSATION,
          params: newConversation,
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(createdConversation);
            expect(mockConversationService.create).toHaveBeenCalledWith(newConversation, 'test-user-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('GET_CONVERSATION', () => {
      it('should get conversation by ID', (done) => {
        const mockConversation = {
          id: 'conv-1',
          agentId: 'agent-1',
          title: 'Test Conversation',
          messages: [],
        };

        mockConversationService.findOne.mockResolvedValue(mockConversation);

        const request: RPCRequest = {
          id: 'get-conv-1',
          method: AgentRPCMethod.GET_CONVERSATION,
          params: { conversationId: 'conv-1' },
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(mockConversation);
            expect(mockConversationService.findOne).toHaveBeenCalledWith('conv-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('SEND_MESSAGE', () => {
      it('should send message to conversation', (done) => {
        const messageData = {
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello, agent!',
        };

        const createdMessage = {
          id: 'msg-1',
          ...messageData,
          timestamp: new Date(),
        };

        mockConversationService.addMessage.mockResolvedValue(createdMessage);

        const request: RPCRequest = {
          id: 'send-msg-1',
          method: AgentRPCMethod.SEND_MESSAGE,
          params: messageData,
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(createdMessage);
            expect(mockConversationService.addMessage).toHaveBeenCalledWith(messageData);
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('GET_MESSAGES', () => {
      it('should get messages from conversation', (done) => {
        const mockMessages = [
          { id: 'msg-1', role: 'user', content: 'Hello' },
          { id: 'msg-2', role: 'agent', content: 'Hi there!' },
        ];

        mockConversationService.getMessages.mockResolvedValue(mockMessages);

        const request: RPCRequest = {
          id: 'get-msgs-1',
          method: AgentRPCMethod.GET_MESSAGES,
          params: { conversationId: 'conv-1' },
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(mockMessages);
            expect(mockConversationService.getMessages).toHaveBeenCalledWith('conv-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('STOP_GENERATION', () => {
      it('should stop message generation', (done) => {
        mockConversationService.stopGeneration.mockResolvedValue(undefined);

        const request: RPCRequest = {
          id: 'stop-gen-1',
          method: AgentRPCMethod.STOP_GENERATION,
          params: { conversationId: 'conv-1', messageId: 'msg-1' },
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toBeUndefined();
            expect(mockConversationService.stopGeneration).toHaveBeenCalledWith('conv-1', 'msg-1');
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });
  });

  describe('Tool Execution RPC Methods', () => {
    describe('EXECUTE_TOOL', () => {
      it('should execute tool', (done) => {
        const toolParams = {
          name: 'readFile',
          parameters: { path: '/test.ts' },
        };

        const toolResult = {
          success: true,
          result: 'file content',
        };

        mockMCPService.executeTool.mockResolvedValue(toolResult);

        const request: RPCRequest = {
          id: 'exec-tool-1',
          method: AgentRPCMethod.EXECUTE_TOOL,
          params: toolParams,
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(toolResult);
            expect(mockMCPService.executeTool).toHaveBeenCalledWith(toolParams);
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });

    describe('LIST_TOOLS', () => {
      it('should list available tools', (done) => {
        const mockTools = [
          { name: 'readFile', description: 'Read file content' },
          { name: 'writeFile', description: 'Write file content' },
        ];

        mockMCPService.listTools.mockResolvedValue(mockTools);

        const request: RPCRequest = {
          id: 'list-tools-1',
          method: AgentRPCMethod.LIST_TOOLS,
          params: {},
          timestamp: new Date(),
        };

        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id === request.id) {
            expect(response.result).toEqual(mockTools);
            expect(mockMCPService.listTools).toHaveBeenCalled();
            done();
          }
        });

        clientSocket.emit('rpc_request', request);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', (done) => {
      mockAgentService.findOne.mockRejectedValue(new Error('Database connection failed'));

      const request: RPCRequest = {
        id: 'error-1',
        method: AgentRPCMethod.GET_AGENT,
        params: { agentId: 'agent-1' },
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        if (response.id === request.id) {
          expect(response.error).toBeDefined();
          expect(response.error?.message).toContain('Database connection failed');
          expect(response.result).toBeUndefined();
          done();
        }
      });

      clientSocket.emit('rpc_request', request);
    });

    it('should handle validation errors', (done) => {
      mockAgentService.create.mockRejectedValue(new Error('Invalid configuration'));

      const request: RPCRequest = {
        id: 'validation-error-1',
        method: AgentRPCMethod.CREATE_AGENT,
        params: { name: '' }, // Invalid: empty name
        timestamp: new Date(),
      };

      clientSocket.on('rpc_response', (response: RPCResponse) => {
        if (response.id === request.id) {
          expect(response.error).toBeDefined();
          done();
        }
      });

      clientSocket.emit('rpc_request', request);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent RPC calls', async () => {
      mockAgentService.findOne.mockImplementation(async (id) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id, name: `Agent ${id}` };
      });

      const requests = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-${i}`,
        method: AgentRPCMethod.GET_AGENT,
        params: { agentId: `agent-${i}` },
        timestamp: new Date(),
      }));

      const responses: RPCResponse[] = [];

      return new Promise<void>((resolve) => {
        clientSocket.on('rpc_response', (response: RPCResponse) => {
          if (response.id.startsWith('concurrent-')) {
            responses.push(response);
            if (responses.length === requests.length) {
              expect(responses).toHaveLength(5);
              responses.forEach((resp, i) => {
                expect(resp.result.id).toBe(`agent-${i}`);
              });
              resolve();
            }
          }
        });

        requests.forEach(req => clientSocket.emit('rpc_request', req));
      });
    });
  });
});
