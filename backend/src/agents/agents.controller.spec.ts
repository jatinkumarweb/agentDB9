import { Test, TestingModule } from '@nestjs/testing';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { NotFoundException } from '@nestjs/common';

describe('AgentsController', () => {
  let controller: AgentsController;
  let agentsService: AgentsService;

  const mockAgentsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    executeTask: jest.fn(),
  };

  const mockAgent = {
    id: '1',
    name: 'Test Agent',
    description: 'A test coding agent',
    userId: 'user1',
    configuration: {
      llmProvider: 'ollama' as const,
      model: 'codellama:7b',
      temperature: 0.1,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful coding assistant',
      codeStyle: {
        indentSize: 2,
        indentType: 'spaces' as const,
        lineLength: 80,
        semicolons: true,
        quotes: 'single' as const,
        trailingCommas: true,
        bracketSpacing: true,
        arrowParens: 'always' as const,
      },
      autoSave: true,
      autoFormat: true,
      autoTest: false,
    },
    status: 'idle' as const,
    capabilities: [
      { type: 'code-generation' as const, enabled: true, confidence: 0.8 },
      { type: 'debugging' as const, enabled: true, confidence: 0.7 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user1',
    email: 'test@example.com',
    username: 'testuser',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        {
          provide: AgentsService,
          useValue: mockAgentsService,
        },
      ],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
    agentsService = module.get<AgentsService>(AgentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all agents', async () => {
      const agents = [mockAgent];
      mockAgentsService.findAll.mockResolvedValue(agents);

      const result = await controller.findAll();

      expect(agentsService.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: agents,
      });
    });

    it('should handle empty agent list', async () => {
      mockAgentsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle service errors', async () => {
      mockAgentsService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(controller.findAll()).rejects.toThrow('Http Exception');
    });
  });

  describe('findOne', () => {
    it('should return a specific agent', async () => {
      mockAgentsService.findOne.mockResolvedValue(mockAgent);

      const result = await controller.findOne('1');

      expect(agentsService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        data: mockAgent,
      });
    });

    it('should handle non-existent agent', async () => {
      mockAgentsService.findOne.mockRejectedValue(
        new NotFoundException('Agent with ID 999 not found')
      );

      await expect(controller.findOne('999')).rejects.toThrow();
    });

    it('should handle invalid agent ID format', async () => {
      mockAgentsService.findOne.mockRejectedValue(
        new Error('Invalid ID format')
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new agent', async () => {
      const createAgentDto: CreateAgentDto = {
        name: 'New Agent',
        description: 'A new coding agent',
        configuration: mockAgent.configuration,
      };

      mockAgentsService.create.mockResolvedValue(mockAgent);

      const result = await controller.create(createAgentDto, mockUser);

      expect(agentsService.create).toHaveBeenCalledWith({
        ...createAgentDto,
        userId: mockUser.id,
      });
      expect(result).toEqual({
        success: true,
        data: mockAgent,
      });
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        name: '', // empty name
        configuration: {},
      } as CreateAgentDto;

      mockAgentsService.create.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.create(invalidDto, mockUser)).rejects.toThrow();
    });

    it('should handle missing configuration', async () => {
      const incompleteDto = {
        name: 'Test Agent',
        // missing configuration
      } as CreateAgentDto;

      mockAgentsService.create.mockRejectedValue(
        new Error('Configuration is required')
      );

      await expect(controller.create(incompleteDto, mockUser)).rejects.toThrow();
    });

    it('should set default capabilities', async () => {
      const createAgentDto: CreateAgentDto = {
        name: 'New Agent',
        configuration: mockAgent.configuration,
      };

      const agentWithDefaults = {
        ...mockAgent,
        capabilities: [
          { type: 'code-generation' as const, enabled: true, confidence: 0.8 },
          { type: 'code-modification' as const, enabled: true, confidence: 0.8 },
          { type: 'debugging' as const, enabled: true, confidence: 0.6 },
        ],
      };

      mockAgentsService.create.mockResolvedValue(agentWithDefaults);

      const result = await controller.create(createAgentDto, mockUser);

      expect(result.data.capabilities).toBeDefined();
      expect(result.data.capabilities.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update an existing agent', async () => {
      const updateData = {
        name: 'Updated Agent',
        description: 'Updated description',
      };

      const updatedAgent = { ...mockAgent, ...updateData };
      mockAgentsService.update.mockResolvedValue(updatedAgent);

      const result = await controller.update('1', updateData);

      expect(agentsService.update).toHaveBeenCalledWith('1', updateData);
      expect(result).toEqual({
        success: true,
        data: updatedAgent,
      });
    });

    it('should handle non-existent agent', async () => {
      const updateData = { name: 'Updated Agent' };

      mockAgentsService.update.mockRejectedValue(
        new NotFoundException('Agent with ID 999 not found')
      );

      await expect(controller.update('999', updateData)).rejects.toThrow();
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { name: 'New Name Only' };
      const updatedAgent = { ...mockAgent, name: 'New Name Only' };

      mockAgentsService.update.mockResolvedValue(updatedAgent);

      const result = await controller.update('1', partialUpdate);

      expect(result.data.name).toBe('New Name Only');
      expect(result.data.description).toBe(mockAgent.description);
    });

    it('should validate configuration updates', async () => {
      const invalidConfig = {
        configuration: {
          temperature: 5.0, // invalid temperature
        },
      };

      mockAgentsService.update.mockRejectedValue(
        new Error('Invalid configuration')
      );

      await expect(controller.update('1', invalidConfig)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should delete an agent', async () => {
      mockAgentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(agentsService.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        message: 'Agent deleted successfully',
      });
    });

    it('should handle non-existent agent', async () => {
      mockAgentsService.remove.mockRejectedValue(
        new NotFoundException('Agent with ID 999 not found')
      );

      await expect(controller.remove('999')).rejects.toThrow();
    });

    it('should handle cascade deletion', async () => {
      // Should delete agent and related conversations
      mockAgentsService.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(agentsService.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('executeTask', () => {
    it('should execute a task with an agent', async () => {
      const taskData = {
        type: 'code-generation',
        prompt: 'Create a React component',
        language: 'typescript',
      };

      const taskResult = {
        taskId: 'task1',
        agentId: '1',
        status: 'completed',
        result: 'Generated React component code',
        timestamp: new Date(),
      };

      mockAgentsService.executeTask.mockResolvedValue(taskResult);

      const result = await controller.executeTask('1', taskData);

      expect(agentsService.executeTask).toHaveBeenCalledWith('1', taskData);
      expect(result).toEqual({
        success: true,
        data: taskResult,
      });
    });

    it('should handle task execution errors', async () => {
      const taskData = {
        type: 'invalid-task',
        prompt: 'Invalid task',
      };

      mockAgentsService.executeTask.mockRejectedValue(
        new Error('Invalid task type')
      );

      await expect(controller.executeTask('1', taskData)).rejects.toThrow();
    });

    it('should handle agent not found during task execution', async () => {
      const taskData = {
        type: 'code-generation',
        prompt: 'Create a component',
      };

      mockAgentsService.executeTask.mockRejectedValue(
        new NotFoundException('Agent with ID 999 not found')
      );

      await expect(controller.executeTask('999', taskData)).rejects.toThrow();
    });

    it('should update agent status during task execution', async () => {
      const taskData = {
        type: 'code-generation',
        prompt: 'Create a component',
      };

      const taskResult = {
        taskId: 'task1',
        agentId: '1',
        status: 'completed',
        result: 'Task completed',
        timestamp: new Date(),
      };

      mockAgentsService.executeTask.mockResolvedValue(taskResult);

      await controller.executeTask('1', taskData);

      expect(agentsService.executeTask).toHaveBeenCalledWith('1', taskData);
    });

    it('should handle long-running tasks', async () => {
      const taskData = {
        type: 'complex-analysis',
        prompt: 'Analyze large codebase',
      };

      const taskResult = {
        taskId: 'task1',
        agentId: '1',
        status: 'in-progress',
        result: 'Task started',
        timestamp: new Date(),
      };

      mockAgentsService.executeTask.mockResolvedValue(taskResult);

      const result = await controller.executeTask('1', taskData);

      expect(result.data.status).toBe('in-progress');
    });
  });
});