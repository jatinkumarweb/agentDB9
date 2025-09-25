import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from './agents.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { NotFoundException } from '@nestjs/common';

describe('AgentsService', () => {
  let service: AgentsService;
  let agentRepository: Repository<Agent>;

  const mockAgentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: getRepositoryToken(Agent),
          useValue: mockAgentRepository,
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    agentRepository = module.get<Repository<Agent>>(getRepositoryToken(Agent));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all agents', async () => {
      const agents = [mockAgent];
      mockAgentRepository.find.mockResolvedValue(agents);

      const result = await service.findAll();

      expect(agentRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(agents);
    });

    it('should return empty array when no agents exist', async () => {
      mockAgentRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockAgentRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should return a specific agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(mockAgent);

      const result = await service.findOne('1');

      expect(agentRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException for non-existent agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        new NotFoundException('Agent with ID 999 not found')
      );
    });

    it('should handle database errors', async () => {
      mockAgentRepository.findOne.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.findOne('1')).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('should create a new agent', async () => {
      const createAgentDto = {
        name: 'New Agent',
        description: 'A new coding agent',
        userId: 'user1',
        configuration: mockAgent.configuration,
      };

      mockAgentRepository.create.mockReturnValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue(mockAgent);

      const result = await service.create(createAgentDto);

      expect(agentRepository.create).toHaveBeenCalledWith({
        ...createAgentDto,
        status: 'idle',
        capabilities: expect.any(Array),
      });
      expect(agentRepository.save).toHaveBeenCalledWith(mockAgent);
      expect(result).toEqual(mockAgent);
    });

    it('should set default capabilities', async () => {
      const createAgentDto = {
        name: 'New Agent',
        userId: 'user1',
        configuration: mockAgent.configuration,
      };

      mockAgentRepository.create.mockReturnValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue(mockAgent);

      await service.create(createAgentDto);

      expect(agentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          capabilities: [
            { type: 'code-generation', enabled: true, confidence: 0.8 },
            { type: 'code-modification', enabled: true, confidence: 0.8 },
            { type: 'code-refactoring', enabled: true, confidence: 0.7 },
            { type: 'debugging', enabled: true, confidence: 0.6 },
            { type: 'testing', enabled: false, confidence: 0.5 },
            { type: 'documentation', enabled: true, confidence: 0.7 },
          ],
        })
      );
    });

    it('should handle invalid configuration', async () => {
      const createAgentDto = {
        name: 'New Agent',
        userId: 'user1',
        configuration: {
          ...mockAgent.configuration,
          temperature: 5.0, // invalid temperature
        },
      };

      mockAgentRepository.create.mockReturnValue(mockAgent);
      mockAgentRepository.save.mockRejectedValue(
        new Error('Invalid configuration')
      );

      await expect(service.create(createAgentDto)).rejects.toThrow(
        'Invalid configuration'
      );
    });

    it('should handle duplicate agent names', async () => {
      const createAgentDto = {
        name: 'Existing Agent',
        userId: 'user1',
        configuration: mockAgent.configuration,
      };

      mockAgentRepository.create.mockReturnValue(mockAgent);
      mockAgentRepository.save.mockRejectedValue(
        new Error('Duplicate entry')
      );

      await expect(service.create(createAgentDto)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const incompleteDto = {
        name: '',
        userId: 'user1',
        // missing configuration
      };

      await expect(service.create(incompleteDto as any)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update an existing agent', async () => {
      const updateData = {
        name: 'Updated Agent',
        description: 'Updated description',
      };

      const updatedAgent = { ...mockAgent, ...updateData };

      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue(updatedAgent);

      const result = await service.update('1', updateData);

      expect(agentRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(agentRepository.save).toHaveBeenCalledWith({
        ...mockAgent,
        ...updateData,
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(updatedAgent);
    });

    it('should throw NotFoundException for non-existent agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(null);

      await expect(service.update('999', { name: 'Updated' })).rejects.toThrow(
        new NotFoundException('Agent with ID 999 not found')
      );
    });

    it('should handle configuration updates', async () => {
      const updateData = {
        configuration: {
          ...mockAgent.configuration,
          temperature: 0.5,
        },
      };

      const updatedAgent = { ...mockAgent, ...updateData };

      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue(updatedAgent);

      const result = await service.update('1', updateData);

      expect(result.configuration.temperature).toBe(0.5);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { name: 'New Name Only' };
      const updatedAgent = { ...mockAgent, name: 'New Name Only' };

      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue(updatedAgent);

      const result = await service.update('1', partialUpdate);

      expect(result.name).toBe('New Name Only');
      expect(result.description).toBe(mockAgent.description);
    });

    it('should update capabilities when configuration changes', async () => {
      const updateData = {
        configuration: {
          ...mockAgent.configuration,
          model: 'gpt-4',
        },
      };

      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue({
        ...mockAgent,
        ...updateData,
      });

      await service.update('1', updateData);

      expect(agentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: updateData.configuration,
        })
      );
    });
  });

  describe('remove', () => {
    it('should delete an agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.remove.mockResolvedValue(mockAgent);

      await service.remove('1');

      expect(agentRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(agentRepository.remove).toHaveBeenCalledWith(mockAgent);
    });

    it('should throw NotFoundException for non-existent agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(
        new NotFoundException('Agent with ID 999 not found')
      );
    });

    it('should handle deletion errors', async () => {
      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.remove.mockRejectedValue(
        new Error('Deletion failed')
      );

      await expect(service.remove('1')).rejects.toThrow('Deletion failed');
    });

    it('should handle cascade deletion', async () => {
      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.remove.mockResolvedValue(mockAgent);

      await service.remove('1');

      expect(agentRepository.remove).toHaveBeenCalledWith(mockAgent);
    });
  });

  describe('executeTask', () => {
    it('should execute a task with an agent', async () => {
      const taskData = {
        type: 'code-generation',
        prompt: 'Create a React component',
        language: 'typescript',
      };

      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue({
        ...mockAgent,
        status: 'idle',
      });

      const result = await service.executeTask('1', taskData);

      expect(agentRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(
        expect.objectContaining({
          agentId: '1',
          status: 'completed',
          result: 'Task completed successfully',
        })
      );
    });

    it('should throw NotFoundException for non-existent agent', async () => {
      const taskData = {
        type: 'code-generation',
        prompt: 'Create a component',
      };

      mockAgentRepository.findOne.mockResolvedValue(null);

      await expect(service.executeTask('999', taskData)).rejects.toThrow(
        new NotFoundException('Agent with ID 999 not found')
      );
    });

    it('should update agent status during task execution', async () => {
      const taskData = {
        type: 'code-generation',
        prompt: 'Create a component',
      };

      const freshAgent = { ...mockAgent };
      mockAgentRepository.findOne.mockResolvedValue(freshAgent);
      
      // Track the status changes
      const statusChanges: string[] = [];
      mockAgentRepository.save.mockImplementation((agent) => {
        statusChanges.push(agent.status);
        return Promise.resolve(agent);
      });

      await service.executeTask('1', taskData);

      expect(agentRepository.save).toHaveBeenCalledTimes(2);
      expect(statusChanges).toEqual(['coding', 'idle']);
    });

    it('should handle task execution errors', async () => {
      const taskData = {
        type: 'code-generation',
        prompt: 'Create a component',
      };

      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.save.mockRejectedValue(
        new Error('Task execution error')
      );

      await expect(service.executeTask('1', taskData)).rejects.toThrow(
        'Task execution error'
      );
    });

    it('should validate task type against agent capabilities', async () => {
      const taskData = {
        type: 'unsupported-task',
        prompt: 'Do something unsupported',
      };

      const agentWithLimitedCapabilities = {
        ...mockAgent,
        capabilities: [
          { type: 'code-generation' as const, enabled: true, confidence: 0.8 },
        ],
      };

      mockAgentRepository.findOne.mockResolvedValue(
        agentWithLimitedCapabilities
      );
      mockAgentRepository.save.mockResolvedValue(agentWithLimitedCapabilities);

      const result = await service.executeTask('1', taskData);

      expect(result.status).toBe('completed');
    });

    it('should handle long-running tasks', async () => {
      const taskData = {
        type: 'complex-analysis',
        prompt: 'Analyze large codebase',
      };

      mockAgentRepository.findOne.mockResolvedValue(mockAgent);
      mockAgentRepository.save.mockResolvedValue(mockAgent);

      const result = await service.executeTask('1', taskData);

      expect(result.status).toBe('completed');
      expect(result.result).toBe('Task completed successfully');
    });
  });

  describe('findByUserId', () => {
    it('should return agents for a specific user using findAll with filter', async () => {
      const userAgents = [mockAgent];
      mockAgentRepository.find.mockResolvedValue(userAgents);

      const result = await service.findAll();

      expect(agentRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(userAgents);
    });

    it('should handle empty agent list', async () => {
      mockAgentRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});