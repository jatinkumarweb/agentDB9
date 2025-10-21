import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { AddMessageDto } from '../dto/add-message.dto';
import { HttpException } from '@nestjs/common';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let conversationsService: ConversationsService;

  const mockConversationsService = {
    findByAgent: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    getMessages: jest.fn(),
    addMessage: jest.fn(),
  };

  const mockConversation = {
    id: '1',
    title: 'Test Conversation',
    agentId: 'agent1',
    userId: 'user1',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  const mockMessage = {
    id: '1',
    conversationId: '1',
    role: 'user',
    content: 'Hello, how can you help me?',
    timestamp: new Date(),
    metadata: {},
  };

  const mockUser = {
    id: 'user1',
    email: 'test@example.com',
    username: 'testuser',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
    conversationsService = module.get<ConversationsService>(ConversationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByAgent', () => {
    it('should return conversations for a specific agent', async () => {
      const agentId = 'agent1';
      const conversations = [mockConversation];
      mockConversationsService.findByAgent.mockResolvedValue(conversations);

      const result = await controller.findByAgent(agentId, mockUser);

      expect(conversationsService.findByAgent).toHaveBeenCalledWith(agentId, mockUser.id);
      expect(result).toEqual({
        success: true,
        data: conversations,
      });
    });

    it('should throw BadRequestException when agentId is missing', async () => {
      await expect(controller.findByAgent('', mockUser)).rejects.toThrow(HttpException);
      await expect(controller.findByAgent(undefined, mockUser)).rejects.toThrow(HttpException);
    });

    it('should handle service errors', async () => {
      const agentId = 'agent1';
      mockConversationsService.findByAgent.mockRejectedValue(
        new Error('Database error')
      );

      await expect(controller.findByAgent(agentId, mockUser)).rejects.toThrow(HttpException);
    });

    it('should return empty array when no conversations exist', async () => {
      const agentId = 'agent1';
      mockConversationsService.findByAgent.mockResolvedValue([]);

      const result = await controller.findByAgent(agentId, mockUser);

      expect(result).toEqual({
        success: true,
        data: [],
      });
    });
  });

  describe('findConversationsByAgent', () => {
    it('should return conversations for a specific agent via path parameter', async () => {
      const agentId = 'agent1';
      const conversations = [mockConversation];
      mockConversationsService.findByAgent.mockResolvedValue(conversations);

      const result = await controller.findConversationsByAgent(agentId, mockUser);

      expect(conversationsService.findByAgent).toHaveBeenCalledWith(agentId, mockUser.id);
      expect(result).toEqual({
        success: true,
        data: conversations,
      });
    });

    it('should handle service errors', async () => {
      const agentId = 'agent1';
      mockConversationsService.findByAgent.mockRejectedValue(
        new Error('Database error')
      );

      await expect(controller.findConversationsByAgent(agentId, mockUser)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('findOne', () => {
    it('should return a specific conversation', async () => {
      const conversationId = '1';
      mockConversationsService.findOne.mockResolvedValue(mockConversation);

      const result = await controller.findOne(conversationId);

      expect(conversationsService.findOne).toHaveBeenCalledWith(conversationId);
      expect(result).toEqual({
        success: true,
        data: mockConversation,
      });
    });

    it('should handle non-existent conversation', async () => {
      const conversationId = '999';
      mockConversationsService.findOne.mockRejectedValue(
        new Error('Conversation not found')
      );

      await expect(controller.findOne(conversationId)).rejects.toThrow(
        HttpException
      );
    });

    it('should handle service errors', async () => {
      const conversationId = '1';
      mockConversationsService.findOne.mockRejectedValue(
        new Error('Database error')
      );

      await expect(controller.findOne(conversationId)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      const createConversationDto: CreateConversationDto = {
        title: 'New Conversation',
        agentId: 'agent1',
      };

      mockConversationsService.create.mockResolvedValue(mockConversation);

      const result = await controller.create(createConversationDto, mockUser);

      expect(conversationsService.create).toHaveBeenCalledWith(
        createConversationDto,
        mockUser.id
      );
      expect(result).toEqual({
        success: true,
        data: mockConversation,
      });
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        title: '', // empty title
        agentId: '', // empty agentId
      } as CreateConversationDto;

      mockConversationsService.create.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.create(invalidDto, mockUser)).rejects.toThrow(HttpException);
    });

    it('should handle missing required fields', async () => {
      const incompleteDto = {
        title: 'Test',
        // missing agentId
      } as CreateConversationDto;

      mockConversationsService.create.mockRejectedValue(
        new Error('Agent ID is required')
      );

      await expect(controller.create(incompleteDto, mockUser)).rejects.toThrow(
        HttpException
      );
    });

    it('should handle service errors', async () => {
      const createConversationDto: CreateConversationDto = {
        title: 'New Conversation',
        agentId: 'agent1',
      };

      mockConversationsService.create.mockRejectedValue(
        new Error('Database error')
      );

      await expect(controller.create(createConversationDto, mockUser)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      const conversationId = '1';
      const messages = [mockMessage];
      mockConversationsService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages(conversationId);

      expect(conversationsService.getMessages).toHaveBeenCalledWith(
        conversationId
      );
      expect(result).toEqual({
        success: true,
        data: messages,
      });
    });

    it('should handle non-existent conversation', async () => {
      const conversationId = '999';
      mockConversationsService.getMessages.mockRejectedValue(
        new Error('Conversation not found')
      );

      await expect(controller.getMessages(conversationId)).rejects.toThrow(
        HttpException
      );
    });

    it('should return empty array when no messages exist', async () => {
      const conversationId = '1';
      mockConversationsService.getMessages.mockResolvedValue([]);

      const result = await controller.getMessages(conversationId);

      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle service errors', async () => {
      const conversationId = '1';
      mockConversationsService.getMessages.mockRejectedValue(
        new Error('Database error')
      );

      await expect(controller.getMessages(conversationId)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('addMessage', () => {
    it('should add a message to a conversation', async () => {
      const conversationId = '1';
      const addMessageDto: AddMessageDto = {
        role: 'user',
        content: 'Hello, how can you help me?',
        metadata: { source: 'web' },
      };

      const expectedMessageData = {
        ...addMessageDto,
        conversationId,
      };

      mockConversationsService.addMessage.mockResolvedValue(mockMessage);

      const result = await controller.addMessage(conversationId, addMessageDto);

      expect(conversationsService.addMessage).toHaveBeenCalledWith(
        expectedMessageData
      );
      expect(result).toEqual({
        success: true,
        data: mockMessage,
      });
    });

    it('should handle validation errors', async () => {
      const conversationId = '1';
      const invalidDto = {
        role: '', // empty role
        content: '', // empty content
      } as AddMessageDto;

      mockConversationsService.addMessage.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.addMessage(conversationId, invalidDto)).rejects.toThrow(
        HttpException
      );
    });

    it('should handle non-existent conversation', async () => {
      const conversationId = '999';
      const addMessageDto: AddMessageDto = {
        role: 'user',
        content: 'Hello',
      };

      mockConversationsService.addMessage.mockRejectedValue(
        new Error('Conversation not found')
      );

      await expect(controller.addMessage(conversationId, addMessageDto)).rejects.toThrow(
        HttpException
      );
    });

    it('should handle missing required fields', async () => {
      const conversationId = '1';
      const incompleteDto = {
        role: 'user',
        // missing content
      } as AddMessageDto;

      mockConversationsService.addMessage.mockRejectedValue(
        new Error('Content is required')
      );

      await expect(controller.addMessage(conversationId, incompleteDto)).rejects.toThrow(
        HttpException
      );
    });

    it('should handle service errors', async () => {
      const conversationId = '1';
      const addMessageDto: AddMessageDto = {
        role: 'user',
        content: 'Hello',
      };

      mockConversationsService.addMessage.mockRejectedValue(
        new Error('Database error')
      );

      await expect(controller.addMessage(conversationId, addMessageDto)).rejects.toThrow(
        HttpException
      );
    });

    it('should include metadata when provided', async () => {
      const conversationId = '1';
      const addMessageDto: AddMessageDto = {
        role: 'user',
        content: 'Hello',
        metadata: {
          source: 'mobile',
          timestamp: new Date().toISOString(),
        },
      };

      const expectedMessageData = {
        ...addMessageDto,
        conversationId,
      };

      mockConversationsService.addMessage.mockResolvedValue(mockMessage);

      await controller.addMessage(conversationId, addMessageDto);

      expect(conversationsService.addMessage).toHaveBeenCalledWith(
        expectedMessageData
      );
    });

    it('should handle different message roles', async () => {
      const conversationId = '1';
      const roles = ['user', 'agent', 'system'];

      for (const role of roles) {
        const addMessageDto: AddMessageDto = {
          role,
          content: `Message from ${role}`,
        };

        const expectedMessageData = {
          ...addMessageDto,
          conversationId,
        };

        mockConversationsService.addMessage.mockResolvedValue({
          ...mockMessage,
          role,
          content: `Message from ${role}`,
        });

        await controller.addMessage(conversationId, addMessageDto);

        expect(conversationsService.addMessage).toHaveBeenCalledWith(
          expectedMessageData
        );
      }
    });
  });
});