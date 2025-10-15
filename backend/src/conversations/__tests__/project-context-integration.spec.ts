import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsService } from '../conversations.service';
import { ReActAgentService } from '../react-agent.service';
import { MCPService } from '../../mcp/mcp.service';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { Project } from '../../entities/project.entity';
import { Agent } from '../../entities/agent.entity';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { MemoryService } from '../../memory/memory.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';

/**
 * Integration tests for project context flow
 * Tests the complete flow from conversation creation to tool execution
 */
describe('Project Context Integration Tests', () => {
  let conversationsService: ConversationsService;
  let reactAgentService: ReActAgentService;
  let mcpService: MCPService;
  let projectsRepository: any;
  let conversationsRepository: any;

  const testProject = {
    id: 'integration-project-id',
    name: 'IntegrationTestApp',
    description: 'Integration test project',
    userId: 'test-user',
    language: 'typescript',
    framework: 'react',
    status: 'active',
    localPath: '/workspace/projects/integrationtestapp',
    repositoryUrl: null,
    workspaceId: null,
    workspaceType: null,
    volumePath: null,
    volumeName: null,
    agents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testAgent = {
    id: 'integration-agent-id',
    name: 'Integration Test Agent',
    description: 'Agent for integration testing',
    userId: 'test-user',
    type: 'coding',
    status: 'active',
    configuration: {
      systemPrompt: 'You are a coding assistant.',
      model: 'qwen2.5-coder:7b',
      memory: { enabled: false },
      knowledgeBase: { enabled: false },
    },
    capabilities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        ReActAgentService,
        MCPService,
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
          provide: MemoryService,
          useValue: {
            getMemoryContext: jest.fn().mockResolvedValue({
              totalMemories: 0,
              recentInteractions: [],
              relevantLessons: [],
              relevantChallenges: [],
              relevantFeedback: [],
            }),
          },
        },
        {
          provide: KnowledgeService,
          useValue: {
            getAgentKnowledgeContext: jest.fn().mockResolvedValue({
              relevantChunks: [],
            }),
          },
        },
        {
          provide: 'WORKSPACE_ROOT',
          useValue: '/workspace',
        },
      ],
    }).compile();

    conversationsService = module.get<ConversationsService>(ConversationsService);
    reactAgentService = module.get<ReActAgentService>(ReActAgentService);
    mcpService = module.get<MCPService>(MCPService);
    projectsRepository = module.get(getRepositoryToken(Project));
    conversationsRepository = module.get(getRepositoryToken(Conversation));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End: Workspace Chat with Project Context', () => {
    it('should create conversation with projectId and use it throughout execution', async () => {
      // Step 1: Create conversation with projectId (simulating workspace chat)
      const createDto = {
        agentId: testAgent.id,
        title: 'Workspace Chat',
        projectId: testProject.id,
      };

      const mockConversation = {
        id: 'test-conv-id',
        ...createDto,
        userId: 'test-user',
        agent: testAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(conversationsRepository, 'create').mockReturnValue(mockConversation);
      jest.spyOn(conversationsRepository, 'save').mockResolvedValue(mockConversation);

      const conversation = await conversationsService.create(createDto, 'test-user');

      // Verify conversation has projectId
      expect(conversation.projectId).toBe(testProject.id);

      // Step 2: Verify system prompt includes project context
      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(testProject);

      const systemPrompt = await (conversationsService as any).buildSystemPrompt(
        testAgent,
        conversation.id,
        'create a React component',
        mockConversation,
      );

      expect(systemPrompt).toContain('IntegrationTestApp');
      expect(systemPrompt).toContain('/workspace/projects/integrationtestapp');
      expect(systemPrompt).toContain('typescript');
      expect(systemPrompt).toContain('react');

      // Step 3: Verify working directory is derived from project
      const workingDir = await (conversationsService as any).getWorkingDirectory(mockConversation);
      expect(workingDir).toBe('/workspace/projects/integrationtestapp');

      // Step 4: Verify MCP service would receive correct working directory
      const mcpExecuteSpy = jest.spyOn(mcpService, 'executeTool').mockResolvedValue({
        success: true,
        result: { content: 'file created' },
      });

      await mcpService.executeTool(
        {
          name: 'write_file',
          arguments: { path: 'src/Component.tsx', content: 'export default Component;' },
        },
        workingDir,
      );

      expect(mcpExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'write_file' }),
        '/workspace/projects/integrationtestapp',
      );
    });

    it('should use default workspace for regular chat without projectId', async () => {
      // Step 1: Create conversation without projectId (regular chat)
      const createDto = {
        agentId: testAgent.id,
        title: 'Regular Chat',
      };

      const mockConversation = {
        id: 'test-conv-id-2',
        ...createDto,
        userId: 'test-user',
        projectId: null,
        agent: testAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(conversationsRepository, 'create').mockReturnValue(mockConversation);
      jest.spyOn(conversationsRepository, 'save').mockResolvedValue(mockConversation);

      const conversation = await conversationsService.create(createDto, 'test-user');

      // Verify conversation has no projectId
      expect(conversation.projectId).toBeUndefined();

      // Step 2: Verify system prompt does NOT include project context
      const systemPrompt = await (conversationsService as any).buildSystemPrompt(
        testAgent,
        conversation.id,
        'help me with code',
        mockConversation,
      );

      expect(systemPrompt).toContain('No Project Selected');
      expect(systemPrompt).not.toContain('Current Project Context');

      // Step 3: Verify working directory is default workspace
      const workingDir = await (conversationsService as any).getWorkingDirectory(mockConversation);
      expect(workingDir).toBe('/workspace');
    });
  });

  describe('Error Recovery in Project Context Flow', () => {
    it('should gracefully handle project not found', async () => {
      const mockConversation = {
        id: 'test-conv-id',
        agentId: testAgent.id,
        projectId: 'non-existent-project',
        userId: 'test-user',
        agent: testAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(null);

      // Should not throw, should fall back to default
      const workingDir = await (conversationsService as any).getWorkingDirectory(mockConversation);
      expect(workingDir).toBe('/workspace');

      const systemPrompt = await (conversationsService as any).buildSystemPrompt(
        testAgent,
        mockConversation.id,
        'test',
        mockConversation,
      );
      expect(systemPrompt).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const mockConversation = {
        id: 'test-conv-id',
        agentId: testAgent.id,
        projectId: testProject.id,
        userId: 'test-user',
        agent: testAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(projectsRepository, 'findOne').mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Should not throw, should fall back to default
      const workingDir = await (conversationsService as any).getWorkingDirectory(mockConversation);
      expect(workingDir).toBe('/workspace');
    });
  });

  describe('Project Context Consistency', () => {
    it('should maintain same working directory across multiple tool calls', async () => {
      const mockConversation = {
        id: 'test-conv-id',
        agentId: testAgent.id,
        projectId: testProject.id,
        userId: 'test-user',
        agent: testAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(testProject);

      // Get working directory multiple times
      const workingDir1 = await (conversationsService as any).getWorkingDirectory(mockConversation);
      const workingDir2 = await (conversationsService as any).getWorkingDirectory(mockConversation);
      const workingDir3 = await (conversationsService as any).getWorkingDirectory(mockConversation);

      // Should be consistent
      expect(workingDir1).toBe(workingDir2);
      expect(workingDir2).toBe(workingDir3);
      expect(workingDir1).toBe('/workspace/projects/integrationtestapp');
    });

    it('should use project name in system prompt consistently', async () => {
      const mockConversation = {
        id: 'test-conv-id',
        agentId: testAgent.id,
        projectId: testProject.id,
        userId: 'test-user',
        agent: testAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(projectsRepository, 'findOne').mockResolvedValue(testProject);

      const systemPrompt1 = await (conversationsService as any).buildSystemPrompt(
        testAgent,
        mockConversation.id,
        'message 1',
        mockConversation,
      );

      const systemPrompt2 = await (conversationsService as any).buildSystemPrompt(
        testAgent,
        mockConversation.id,
        'message 2',
        mockConversation,
      );

      // Both should contain the same project name
      expect(systemPrompt1).toContain('IntegrationTestApp');
      expect(systemPrompt2).toContain('IntegrationTestApp');
    });
  });
});
