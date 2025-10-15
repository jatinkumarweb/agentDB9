import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationsService } from '../conversations.service';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { Project } from '../../entities/project.entity';
import { Agent } from '../../entities/agent.entity';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { MCPService } from '../../mcp/mcp.service';
import { ReActAgentService } from '../react-agent.service';
import { MemoryService } from '../../memory/memory.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';

describe('ConversationsService - Project Context Flow', () => {
  let service: ConversationsService;
  let conversationsRepository: Repository<Conversation>;
  let messagesRepository: Repository<Message>;
  let projectsRepository: Repository<Project>;
  let agentsRepository: Repository<Agent>;

  const mockProject = {
    id: 'test-project-id',
    name: 'TestProject',
    description: 'Test project for unit tests',
    userId: 'test-user-id',
    language: 'typescript',
    framework: 'react',
    status: 'active',
    localPath: '/workspace/projects/testproject',
    repositoryUrl: null,
    workspaceId: null,
    workspaceType: null,
    volumePath: null,
    volumeName: null,
    agents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgent = {
    id: 'test-agent-id',
    name: 'Test Agent',
    description: 'Test agent',
    userId: 'test-user-id',
    type: 'coding',
    status: 'active',
    configuration: {
      systemPrompt: 'You are a helpful AI assistant.',
      model: 'qwen2.5-coder:7b',
      memory: { enabled: false },
      knowledgeBase: { enabled: false },
    },
    capabilities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversation = {
    id: 'test-conversation-id',
    title: 'Test Conversation',
    userId: 'test-user-id',
    agentId: 'test-agent-id',
    projectId: 'test-project-id',
    agent: mockAgent,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversationWithoutProject = {
    ...mockConversation,
    id: 'test-conversation-no-project',
    projectId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Agent),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: WebsocketGateway,
          useValue: {
            broadcastNewMessage: jest.fn(),
            broadcastMessageUpdate: jest.fn(),
          },
        },
        {
          provide: MCPService,
          useValue: {
            executeTool: jest.fn(),
          },
        },
        {
          provide: ReActAgentService,
          useValue: {
            executeReActLoop: jest.fn(),
          },
        },
        {
          provide: MemoryService,
          useValue: {
            getMemoryContext: jest.fn(),
          },
        },
        {
          provide: KnowledgeService,
          useValue: {
            getAgentKnowledgeContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    conversationsRepository = module.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    messagesRepository = module.get<Repository<Message>>(
      getRepositoryToken(Message),
    );
    projectsRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    agentsRepository = module.get<Repository<Agent>>(
      getRepositoryToken(Agent),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Conversation Creation with ProjectId', () => {
    it('should create conversation with projectId', async () => {
      const createDto = {
        agentId: 'test-agent-id',
        title: 'Test Conversation',
        projectId: 'test-project-id',
      };

      jest.spyOn(conversationsRepository, 'create').mockReturnValue(mockConversation as any);
      jest.spyOn(conversationsRepository, 'save').mockResolvedValue(mockConversation as any);

      const result = await service.create(createDto, 'test-user-id');

      expect(conversationsRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId: 'test-user-id',
      });
      expect(result.projectId).toBe('test-project-id');
    });

    it('should create conversation without projectId for regular chat', async () => {
      const createDto = {
        agentId: 'test-agent-id',
        title: 'Test Conversation',
      };

      jest.spyOn(conversationsRepository, 'create').mockReturnValue(mockConversationWithoutProject as any);
      jest.spyOn(conversationsRepository, 'save').mockResolvedValue(mockConversationWithoutProject as any);

      const result = await service.create(createDto, 'test-user-id');

      expect(result.projectId).toBeNull();
    });
  });

  describe('getWorkingDirectory', () => {
    it('should return project localPath when conversation has projectId', async () => {
      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Access private method via type assertion
      const workingDir = await (service as any).getWorkingDirectory(mockConversation);

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-project-id' },
      });
      expect(workingDir).toBe('/workspace/projects/testproject');
    });

    it('should return default workspace when conversation has no projectId', async () => {
      const workingDir = await (service as any).getWorkingDirectory(mockConversationWithoutProject);

      expect(projectsRepository.findOne).not.toHaveBeenCalled();
      expect(workingDir).toBe(process.env.VSCODE_WORKSPACE || '/workspace');
    });

    it('should return default workspace when project not found', async () => {
      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(null);

      const workingDir = await (service as any).getWorkingDirectory(mockConversation);

      expect(workingDir).toBe(process.env.VSCODE_WORKSPACE || '/workspace');
    });

    it('should handle errors gracefully and return default workspace', async () => {
      jest.spyOn(projectsRepository, 'findOne').mockRejectedValue(new Error('Database error'));

      const workingDir = await (service as any).getWorkingDirectory(mockConversation);

      expect(workingDir).toBe(process.env.VSCODE_WORKSPACE || '/workspace');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include project context when conversation has projectId', async () => {
      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(mockProject as any);

      const systemPrompt = await (service as any).buildSystemPrompt(
        mockAgent,
        'test-conversation-id',
        'test message',
        mockConversation,
      );

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-project-id' },
      });
      expect(systemPrompt).toContain('Current Project Context');
      expect(systemPrompt).toContain('TestProject');
      expect(systemPrompt).toContain('/workspace/projects/testproject');
      expect(systemPrompt).toContain('typescript');
      expect(systemPrompt).toContain('react');
      expect(systemPrompt).toContain('IMPORTANT WORKING DIRECTORY RULES');
      expect(systemPrompt).toContain('DO NOT create subdirectories with the app name');
    });

    it('should not include project context when conversation has no projectId', async () => {
      const systemPrompt = await (service as any).buildSystemPrompt(
        mockAgent,
        'test-conversation-id',
        'test message',
        mockConversationWithoutProject,
      );

      expect(projectsRepository.findOne).not.toHaveBeenCalled();
      expect(systemPrompt).toContain('No Project Selected');
      expect(systemPrompt).toContain('default workspace directory: /workspace');
      expect(systemPrompt).not.toContain('Current Project Context');
    });

    it('should handle project not found gracefully', async () => {
      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(null);

      const systemPrompt = await (service as any).buildSystemPrompt(
        mockAgent,
        'test-conversation-id',
        'test message',
        mockConversation,
      );

      // Should not throw error, just skip project context
      expect(systemPrompt).toBeDefined();
      expect(systemPrompt).toContain('You are a helpful AI assistant');
    });

    it('should use agent system prompt as base', async () => {
      const customAgent = {
        ...mockAgent,
        configuration: {
          ...mockAgent.configuration,
          systemPrompt: 'You are a specialized coding assistant.',
        },
      };

      const systemPrompt = await (service as any).buildSystemPrompt(
        customAgent,
        'test-conversation-id',
        'test message',
        mockConversationWithoutProject,
      );

      expect(systemPrompt).toContain('You are a specialized coding assistant');
    });
  });

  describe('Integration: Project Context Flow', () => {
    it('should flow project context from conversation to tool execution', async () => {
      // This is a conceptual test - actual implementation would need more setup
      // The key is to verify that:
      // 1. Conversation has projectId
      // 2. System prompt includes project context
      // 3. Working directory is derived from project
      // 4. Tools execute in project directory

      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Step 1: Verify conversation has projectId
      expect(mockConversation.projectId).toBe('test-project-id');

      // Step 2: Verify system prompt includes project context
      const systemPrompt = await (service as any).buildSystemPrompt(
        mockAgent,
        'test-conversation-id',
        'create a React app',
        mockConversation,
      );
      expect(systemPrompt).toContain('TestProject');
      expect(systemPrompt).toContain('/workspace/projects/testproject');

      // Step 3: Verify working directory is derived from project
      const workingDir = await (service as any).getWorkingDirectory(mockConversation);
      expect(workingDir).toBe('/workspace/projects/testproject');

      // Step 4: Would verify MCP service receives correct working directory
      // (This would be tested in MCP service tests)
    });
  });

  describe('Edge Cases', () => {
    it('should handle conversation without agent', async () => {
      const conversationWithoutAgent = {
        ...mockConversation,
        agent: null,
      };

      await expect(
        (service as any).buildSystemPrompt(
          null,
          'test-conversation-id',
          'test message',
          conversationWithoutAgent,
        ),
      ).rejects.toThrow();
    });

    it('should handle project with missing localPath', async () => {
      const projectWithoutPath = {
        ...mockProject,
        localPath: null,
      };

      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(projectWithoutPath as any);

      const workingDir = await (service as any).getWorkingDirectory(mockConversation);

      // Should fall back to default
      expect(workingDir).toBe(process.env.VSCODE_WORKSPACE || '/workspace');
    });

    it('should handle undefined conversation in getWorkingDirectory', async () => {
      const workingDir = await (service as any).getWorkingDirectory(undefined);

      expect(workingDir).toBe(process.env.VSCODE_WORKSPACE || '/workspace');
    });
  });
});
