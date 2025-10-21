import { Test, TestingModule } from '@nestjs/testing';
import { ReActAgentService } from './react-agent.service';
import { MCPService } from '../mcp/mcp.service';
import { TaskPlan, TaskMilestone } from '../common/interfaces/approval.interface';

describe('ReActAgentService - Task Planning', () => {
  let service: ReActAgentService;
  let mcpService: MCPService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReActAgentService,
        {
          provide: MCPService,
          useValue: {
            executeTool: jest.fn(),
            getAvailableTools: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReActAgentService>(ReActAgentService);
    mcpService = module.get<MCPService>(MCPService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Plan Generation', () => {
    it('should generate task plan for complex tasks', () => {
      expect((service as any).shouldGenerateTaskPlan('create react app')).toBe(true);
      expect((service as any).shouldGenerateTaskPlan('build a new application')).toBe(true);
      expect((service as any).shouldGenerateTaskPlan('setup project with typescript')).toBe(true);
      expect((service as any).shouldGenerateTaskPlan('initialize project for vue')).toBe(true);
      expect((service as any).shouldGenerateTaskPlan('implement authentication feature')).toBe(true);
    });

    it('should not generate task plan for simple queries', () => {
      const simpleTasks = [
        'what is react?',
        'list files',
        'show me the code',
        'read package.json',
      ];

      simpleTasks.forEach((task) => {
        const shouldGenerate = (service as any).shouldGenerateTaskPlan(task);
        expect(shouldGenerate).toBe(false);
      });
    });

    it('should generate valid task plan structure', async () => {
      const userMessage = 'Create a React app with TypeScript';
      const systemPrompt = 'You are a helpful assistant';
      const model = 'qwen2.5-coder:7b';
      const ollamaUrl = 'http://localhost:11434';

      // Mock LLM response
      jest.spyOn(service as any, 'callLLM').mockResolvedValue(JSON.stringify({
        objective: 'Create React app with TypeScript',
        description: 'Set up a new React application with TypeScript configuration',
        milestones: [
          {
            title: 'Initialize project',
            description: 'Create project structure',
            type: 'command_execution',
            requiresApproval: true,
            tools: ['execute_command'],
          },
          {
            title: 'Install dependencies',
            description: 'Install React and TypeScript',
            type: 'command_execution',
            requiresApproval: true,
            tools: ['execute_command'],
          },
          {
            title: 'Configure TypeScript',
            description: 'Set up tsconfig.json',
            type: 'file_operation',
            requiresApproval: false,
            tools: ['write_file'],
          },
        ],
        estimatedSteps: 3,
      }));

      const taskPlan = await (service as any).generateTaskPlan(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl,
      );

      expect(taskPlan).toBeDefined();
      expect(taskPlan.objective).toBe('Create React app with TypeScript');
      expect(taskPlan.milestones).toHaveLength(3);
      expect(taskPlan.estimatedSteps).toBe(3);
      expect(taskPlan.requiresApproval).toBe(true);
      expect(taskPlan.milestones[0].order).toBe(1);
      expect(taskPlan.milestones[1].order).toBe(2);
      expect(taskPlan.milestones[2].order).toBe(3);
    });

    it('should handle invalid LLM response gracefully', async () => {
      const userMessage = 'Create a React app';
      const systemPrompt = 'You are a helpful assistant';
      const model = 'qwen2.5-coder:7b';
      const ollamaUrl = 'http://localhost:11434';

      // Mock invalid LLM response
      jest.spyOn(service as any, 'callLLM').mockResolvedValue('Invalid JSON');

      const taskPlan = await (service as any).generateTaskPlan(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl,
      );

      expect(taskPlan).toBeUndefined();
    });
  });

  describe('Milestone Status Updates', () => {
    it('should update milestone to in_progress', () => {
      const taskPlan: TaskPlan = {
        id: 'plan_123',
        objective: 'Test objective',
        description: 'Test description',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Test milestone',
            description: 'Test description',
            type: 'command_execution',
            status: 'pending',
            requiresApproval: false,
            tools: ['execute_command'],
          },
        ],
        estimatedSteps: 1,
        requiresApproval: false,
        createdAt: new Date(),
      };

      const progressCallback = jest.fn();

      (service as any).updateMilestoneStatus(
        taskPlan,
        0,
        'in_progress',
        progressCallback,
      );

      expect(taskPlan.milestones[0].status).toBe('in_progress');
      expect(taskPlan.milestones[0].startedAt).toBeDefined();
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should update milestone to completed', () => {
      const taskPlan: TaskPlan = {
        id: 'plan_123',
        objective: 'Test objective',
        description: 'Test description',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Test milestone',
            description: 'Test description',
            type: 'command_execution',
            status: 'in_progress',
            requiresApproval: false,
            tools: ['execute_command'],
            startedAt: new Date(),
          },
        ],
        estimatedSteps: 1,
        requiresApproval: false,
        createdAt: new Date(),
      };

      const progressCallback = jest.fn();
      const result = { success: true };

      (service as any).updateMilestoneStatus(
        taskPlan,
        0,
        'completed',
        progressCallback,
        result,
      );

      expect(taskPlan.milestones[0].status).toBe('completed');
      expect(taskPlan.milestones[0].completedAt).toBeDefined();
      expect(taskPlan.milestones[0].result).toEqual(result);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should update milestone to failed with error', () => {
      const taskPlan: TaskPlan = {
        id: 'plan_123',
        objective: 'Test objective',
        description: 'Test description',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Test milestone',
            description: 'Test description',
            type: 'command_execution',
            status: 'in_progress',
            requiresApproval: false,
            tools: ['execute_command'],
            startedAt: new Date(),
          },
        ],
        estimatedSteps: 1,
        requiresApproval: false,
        createdAt: new Date(),
      };

      const progressCallback = jest.fn();
      const error = 'Command failed';

      (service as any).updateMilestoneStatus(
        taskPlan,
        0,
        'failed',
        progressCallback,
        undefined,
        error,
      );

      expect(taskPlan.milestones[0].status).toBe('failed');
      expect(taskPlan.milestones[0].completedAt).toBeDefined();
      expect(taskPlan.milestones[0].error).toBe(error);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should calculate percentage completion correctly', () => {
      const taskPlan: TaskPlan = {
        id: 'plan_123',
        objective: 'Test objective',
        description: 'Test description',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Milestone 1',
            description: 'Test',
            type: 'command_execution',
            status: 'completed',
            requiresApproval: false,
            tools: [],
          },
          {
            id: 'milestone_2',
            order: 2,
            title: 'Milestone 2',
            description: 'Test',
            type: 'command_execution',
            status: 'completed',
            requiresApproval: false,
            tools: [],
          },
          {
            id: 'milestone_3',
            order: 3,
            title: 'Milestone 3',
            description: 'Test',
            type: 'command_execution',
            status: 'in_progress',
            requiresApproval: false,
            tools: [],
          },
          {
            id: 'milestone_4',
            order: 4,
            title: 'Milestone 4',
            description: 'Test',
            type: 'command_execution',
            status: 'pending',
            requiresApproval: false,
            tools: [],
          },
        ],
        estimatedSteps: 4,
        requiresApproval: false,
        createdAt: new Date(),
      };

      const progressCallback = jest.fn();

      (service as any).updateMilestoneStatus(
        taskPlan,
        2,
        'in_progress',
        progressCallback,
      );

      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      const update = JSON.parse(lastCall);
      
      expect(update.percentage).toBe(50); // 2 out of 4 completed = 50%
    });
  });

  describe('ReACT Loop with Task Planning', () => {
    it('should broadcast task plan at start', async () => {
      const userMessage = 'Create a React app';
      const systemPrompt = 'You are a helpful assistant';
      const model = 'qwen2.5-coder:7b';
      const ollamaUrl = 'http://localhost:11434';
      const progressCallback = jest.fn();

      // Mock task plan generation
      jest.spyOn(service as any, 'shouldGenerateTaskPlan').mockReturnValue(true);
      jest.spyOn(service as any, 'generateTaskPlan').mockResolvedValue({
        id: 'plan_123',
        objective: 'Create React app',
        description: 'Set up React application',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Initialize project',
            description: 'Create project structure',
            type: 'command_execution',
            status: 'pending',
            requiresApproval: true,
            tools: ['execute_command'],
          },
        ],
        estimatedSteps: 1,
        requiresApproval: true,
        createdAt: new Date(),
      });

      // Mock LLM to return final answer immediately
      jest.spyOn(service as any, 'callLLM').mockResolvedValue('Project created successfully');
      jest.spyOn(service as any, 'parseToolCall').mockReturnValue(null);

      await service.executeReActLoop(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl,
        [],
        'conv_123',
        progressCallback,
        5,
        undefined,
        '/workspace',
        'agent_456',
        true, // Enable task planning
      );

      // Verify task plan was broadcast
      const planningCalls = progressCallback.mock.calls.filter((call) => {
        try {
          const update = JSON.parse(call[0]);
          return update.type === 'plan';
        } catch {
          return false;
        }
      });

      expect(planningCalls.length).toBeGreaterThan(0);
    });

    it('should track milestone progress during execution', async () => {
      const userMessage = 'Create a React app';
      const systemPrompt = 'You are a helpful assistant';
      const model = 'qwen2.5-coder:7b';
      const ollamaUrl = 'http://localhost:11434';
      const progressCallback = jest.fn();

      // Mock task plan
      const taskPlan: TaskPlan = {
        id: 'plan_123',
        objective: 'Create React app',
        description: 'Set up React application',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Initialize project',
            description: 'Create project structure',
            type: 'command_execution',
            status: 'pending',
            requiresApproval: true,
            tools: ['execute_command'],
          },
        ],
        estimatedSteps: 1,
        requiresApproval: true,
        createdAt: new Date(),
      };

      jest.spyOn(service as any, 'shouldGenerateTaskPlan').mockReturnValue(true);
      jest.spyOn(service as any, 'generateTaskPlan').mockResolvedValue(taskPlan);

      // Mock tool call and execution
      jest.spyOn(service as any, 'callLLM')
        .mockResolvedValueOnce('TOOL_CALL:\n{"tool": "execute_command", "arguments": {"command": "npx create-react-app ."}}')
        .mockResolvedValueOnce('Project created successfully');
      
      jest.spyOn(service as any, 'parseToolCall')
        .mockReturnValueOnce({ name: 'execute_command', arguments: { command: 'npx create-react-app .' } })
        .mockReturnValueOnce(null);

      jest.spyOn(mcpService, 'executeTool').mockResolvedValue({
        success: true,
        result: 'Project created',
      });

      const result = await service.executeReActLoop(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl,
        [],
        'conv_123',
        progressCallback,
        5,
        undefined,
        '/workspace',
        'agent_456',
        true,
      );

      // Verify milestone was tracked
      expect(result.taskPlan).toBeDefined();
      expect(result.milestonesCompleted).toBeGreaterThan(0);
    });

    it('should include milestone ID in steps', async () => {
      const userMessage = 'Create a React app';
      const systemPrompt = 'You are a helpful assistant';
      const model = 'qwen2.5-coder:7b';
      const ollamaUrl = 'http://localhost:11434';

      const taskPlan: TaskPlan = {
        id: 'plan_123',
        objective: 'Create React app',
        description: 'Set up React application',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Initialize project',
            description: 'Create project structure',
            type: 'command_execution',
            status: 'pending',
            requiresApproval: true,
            tools: ['execute_command'],
          },
        ],
        estimatedSteps: 1,
        requiresApproval: true,
        createdAt: new Date(),
      };

      jest.spyOn(service as any, 'shouldGenerateTaskPlan').mockReturnValue(true);
      jest.spyOn(service as any, 'generateTaskPlan').mockResolvedValue(taskPlan);

      jest.spyOn(service as any, 'callLLM')
        .mockResolvedValueOnce('TOOL_CALL:\n{"tool": "execute_command", "arguments": {"command": "echo test"}}')
        .mockResolvedValueOnce('Done');
      
      jest.spyOn(service as any, 'parseToolCall')
        .mockReturnValueOnce({ name: 'execute_command', arguments: { command: 'echo test' } })
        .mockReturnValueOnce(null);

      jest.spyOn(mcpService, 'executeTool').mockResolvedValue({
        success: true,
        result: 'test',
      });

      const result = await service.executeReActLoop(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl,
        [],
        'conv_123',
        undefined,
        5,
        undefined,
        '/workspace',
        'agent_456',
        true,
      );

      // Verify steps include milestone ID
      const stepsWithMilestone = result.steps.filter(step => step.milestoneId);
      expect(stepsWithMilestone.length).toBeGreaterThan(0);
      expect(stepsWithMilestone[0].milestoneId).toBe('milestone_1');
    });
  });

  describe('Progress Updates', () => {
    it('should send tool execution progress updates', async () => {
      const progressCallback = jest.fn();
      const taskPlan: TaskPlan = {
        id: 'plan_123',
        objective: 'Test',
        description: 'Test',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Test milestone',
            description: 'Test',
            type: 'command_execution',
            status: 'in_progress',
            requiresApproval: false,
            tools: ['execute_command'],
          },
        ],
        estimatedSteps: 1,
        requiresApproval: false,
        createdAt: new Date(),
      };

      jest.spyOn(service as any, 'shouldGenerateTaskPlan').mockReturnValue(true);
      jest.spyOn(service as any, 'generateTaskPlan').mockResolvedValue(taskPlan);

      jest.spyOn(service as any, 'callLLM')
        .mockResolvedValueOnce('TOOL_CALL:\n{"tool": "execute_command", "arguments": {"command": "echo test"}}')
        .mockResolvedValueOnce('Done');
      
      jest.spyOn(service as any, 'parseToolCall')
        .mockReturnValueOnce({ name: 'execute_command', arguments: { command: 'echo test' } })
        .mockReturnValueOnce(null);

      jest.spyOn(mcpService, 'executeTool').mockResolvedValue({
        success: true,
        result: 'test',
      });

      await service.executeReActLoop(
        'Test message',
        'System prompt',
        'qwen2.5-coder:7b',
        'http://localhost:11434',
        [],
        'conv_123',
        progressCallback,
        5,
        undefined,
        '/workspace',
        'agent_456',
        true,
      );

      // Verify tool execution progress was sent
      const toolExecutionCalls = progressCallback.mock.calls.filter((call) => {
        try {
          const update = JSON.parse(call[0]);
          return update.type === 'tool_execution';
        } catch {
          return false;
        }
      });

      expect(toolExecutionCalls.length).toBeGreaterThan(0);
    });
  });
});
