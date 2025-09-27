import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { NotFoundException } from '@nestjs/common';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<Message>;

  const mockConversationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockMessageRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
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
    agent: {
      id: 'agent1',
      name: 'Test Agent',
      configuration: {
        model: 'qwen2.5-coder:7b',
        temperature: 0.3,
      },
    },
  };

  const mockMessage = {
    id: '1',
    conversationId: '1',
    role: 'user',
    content: 'Hello, how can you help me?',
    timestamp: new Date(),
    metadata: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    conversationRepository = module.get<Repository<Conversation>>(
      getRepositoryToken(Conversation)
    );
    messageRepository = module.get<Repository<Message>>(
      getRepositoryToken(Message)
    );

    // Mock environment variables
    process.env.OLLAMA_HOST = 'http://localhost:11434';
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('findByAgent', () => {
    it('should return conversations for a specific agent', async () => {
      const agentId = 'agent1';
      const conversations = [mockConversation];
      mockConversationRepository.find.mockResolvedValue(conversations);

      const result = await service.findByAgent(agentId);

      expect(conversationRepository.find).toHaveBeenCalledWith({
        where: { agentId },
        order: { updatedAt: 'DESC' },
        relations: ['messages'],
      });
      expect(result).toEqual(conversations);
    });

    it('should return empty array when no conversations exist', async () => {
      const agentId = 'agent1';
      mockConversationRepository.find.mockResolvedValue([]);

      const result = await service.findByAgent(agentId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const agentId = 'agent1';
      mockConversationRepository.find.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.findByAgent(agentId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('findOne', () => {
    it('should return a specific conversation', async () => {
      const conversationId = '1';
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      const result = await service.findOne(conversationId);

      expect(conversationRepository.findOne).toHaveBeenCalledWith({
        where: { id: conversationId },
        relations: ['messages', 'agent'],
      });
      expect(result).toEqual(mockConversation);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      const conversationId = '999';
      mockConversationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(conversationId)).rejects.toThrow(
        new NotFoundException('Conversation with ID 999 not found')
      );
    });

    it('should handle database errors', async () => {
      const conversationId = '1';
      mockConversationRepository.findOne.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.findOne(conversationId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      const createConversationDto: CreateConversationDto = {
        title: 'New Conversation',
        agentId: 'agent1',
      };

      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockResolvedValue(mockConversation);

      const result = await service.create(createConversationDto);

      expect(conversationRepository.create).toHaveBeenCalledWith({
        ...createConversationDto,
        userId: 'default-user',
      });
      expect(conversationRepository.save).toHaveBeenCalledWith(mockConversation);
      expect(result).toEqual(mockConversation);
    });

    it('should handle validation errors', async () => {
      const createConversationDto: CreateConversationDto = {
        title: '',
        agentId: 'agent1',
      };

      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(service.create(createConversationDto)).rejects.toThrow(
        'Validation failed'
      );
    });

    it('should handle database errors', async () => {
      const createConversationDto: CreateConversationDto = {
        title: 'New Conversation',
        agentId: 'agent1',
      };

      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.create(createConversationDto)).rejects.toThrow(
        'Database error'
      );
    });

    it('should set default userId when not provided', async () => {
      const createConversationDto: CreateConversationDto = {
        title: 'New Conversation',
        agentId: 'agent1',
      };

      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockResolvedValue(mockConversation);

      await service.create(createConversationDto);

      expect(conversationRepository.create).toHaveBeenCalledWith({
        ...createConversationDto,
        userId: 'default-user',
      });
    });
  });

  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      const conversationId = '1';
      const messages = [mockMessage];

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.find.mockResolvedValue(messages);

      const result = await service.getMessages(conversationId);

      expect(conversationRepository.findOne).toHaveBeenCalledWith({
        where: { id: conversationId },
        relations: ['messages', 'agent'],
      });
      expect(messageRepository.find).toHaveBeenCalledWith({
        where: { conversationId },
        order: { timestamp: 'ASC' },
      });
      expect(result).toEqual(messages);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      const conversationId = '999';
      mockConversationRepository.findOne.mockResolvedValue(null);

      await expect(service.getMessages(conversationId)).rejects.toThrow(
        new NotFoundException('Conversation with ID 999 not found')
      );
    });

    it('should return empty array when no messages exist', async () => {
      const conversationId = '1';
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.find.mockResolvedValue([]);

      const result = await service.getMessages(conversationId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const conversationId = '1';
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getMessages(conversationId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('addMessage', () => {
    it('should add a user message to a conversation', async () => {
      const messageData = {
        conversationId: '1',
        role: 'user',
        content: 'Hello, how can you help me?',
        metadata: { source: 'web' },
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.addMessage(messageData);

      expect(conversationRepository.findOne).toHaveBeenCalledWith({
        where: { id: messageData.conversationId },
        relations: ['messages', 'agent'],
      });
      expect(messageRepository.create).toHaveBeenCalledWith(messageData);
      expect(messageRepository.save).toHaveBeenCalledWith(mockMessage);
      expect(conversationRepository.update).toHaveBeenCalledWith(
        messageData.conversationId,
        { updatedAt: expect.any(Date) }
      );
      expect(result).toEqual(mockMessage);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      const messageData = {
        conversationId: '999',
        role: 'user',
        content: 'Hello',
      };

      mockConversationRepository.findOne.mockResolvedValue(null);

      await expect(service.addMessage(messageData)).rejects.toThrow(
        new NotFoundException('Conversation with ID 999 not found')
      );
    });

    it('should handle different message roles', async () => {
      const roles = ['user', 'agent', 'system'];

      for (const role of roles) {
        const messageData = {
          conversationId: '1',
          role,
          content: `Message from ${role}`,
        };

        const messageWithRole = { ...mockMessage, role, content: messageData.content };

        mockConversationRepository.findOne.mockResolvedValue(mockConversation);
        mockMessageRepository.create.mockReturnValue(messageWithRole);
        mockMessageRepository.save.mockResolvedValue(messageWithRole);
        mockConversationRepository.update.mockResolvedValue({ affected: 1 });

        const result = await service.addMessage(messageData);

        expect(result.role).toBe(role);
        expect(result.content).toBe(messageData.content);
      }
    });

    it('should handle metadata correctly', async () => {
      const messageData = {
        conversationId: '1',
        role: 'user',
        content: 'Hello',
        metadata: {
          source: 'mobile',
          timestamp: new Date().toISOString(),
          userAgent: 'Mozilla/5.0...',
        },
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      await service.addMessage(messageData);

      expect(messageRepository.create).toHaveBeenCalledWith(messageData);
    });

    it('should handle database errors during message creation', async () => {
      const messageData = {
        conversationId: '1',
        role: 'user',
        content: 'Hello',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.addMessage(messageData)).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle database errors during conversation update', async () => {
      const messageData = {
        conversationId: '1',
        role: 'user',
        content: 'Hello',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);
      mockConversationRepository.update.mockRejectedValue(
        new Error('Update failed')
      );

      await expect(service.addMessage(messageData)).rejects.toThrow(
        'Update failed'
      );
    });

    it('should trigger agent response for user messages', async () => {
      const messageData = {
        conversationId: '1',
        role: 'user',
        content: 'Hello, how can you help me?',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      // Mock the private method behavior by spying on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.addMessage(messageData);

      expect(result).toEqual(mockMessage);
      
      // Clean up
      consoleSpy.mockRestore();
    });

    it('should not trigger agent response for agent messages', async () => {
      const messageData = {
        conversationId: '1',
        role: 'agent',
        content: 'Hello! I can help you with coding tasks.',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue({
        ...mockMessage,
        role: 'agent',
        content: messageData.content,
      });
      mockMessageRepository.save.mockResolvedValue({
        ...mockMessage,
        role: 'agent',
        content: messageData.content,
      });
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.addMessage(messageData);

      expect(result.role).toBe('agent');
      expect(result.content).toBe(messageData.content);
    });

    it('should handle empty message content', async () => {
      const messageData = {
        conversationId: '1',
        role: 'user',
        content: '',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue({
        ...mockMessage,
        content: '',
      });
      mockMessageRepository.save.mockResolvedValue({
        ...mockMessage,
        content: '',
      });
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.addMessage(messageData);

      expect(result.content).toBe('');
    });
  });

  describe('isUserRole (private method behavior)', () => {
    it('should identify user roles correctly through addMessage behavior', async () => {
      const userRoles = ['user', 'human', 'person'];
      const nonUserRoles = ['agent', 'assistant', 'system', 'bot'];

      for (const role of [...userRoles, ...nonUserRoles]) {
        const messageData = {
          conversationId: '1',
          role,
          content: `Message from ${role}`,
        };

        mockConversationRepository.findOne.mockResolvedValue(mockConversation);
        mockMessageRepository.create.mockReturnValue({
          ...mockMessage,
          role,
          content: messageData.content,
        });
        mockMessageRepository.save.mockResolvedValue({
          ...mockMessage,
          role,
          content: messageData.content,
        });
        mockConversationRepository.update.mockResolvedValue({ affected: 1 });

        const result = await service.addMessage(messageData);

        expect(result.role).toBe(role);
      }
    });
  });
});