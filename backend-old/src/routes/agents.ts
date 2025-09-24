// Agent management routes
import { Router } from 'express';
import { 
  CodingAgent, 
  CreateAgentRequest, 
  UpdateAgentRequest, 
  APIResponse,
  AgentStatus,
  CodeTask,
  CodeTaskResult
} from '@agentdb9/shared';

const router = Router();

// In-memory storage for now (replace with database later)
const agents = new Map<string, CodingAgent>();
const tasks = new Map<string, CodeTask>();

// Create a new agent
router.post('/', async (req, res) => {
  try {
    const request: CreateAgentRequest = req.body;
    
    // Validate request
    if (!request.name || !request.configuration) {
      return res.status(400).json({
        success: false,
        error: 'Name and configuration are required'
      } as APIResponse);
    }

    const agent: CodingAgent = {
      id: generateId(),
      name: request.name,
      description: request.description,
      userId: 'default-user', // TODO: Get from auth
      projectId: request.projectId,
      configuration: {
        llmProvider: 'ollama',
        model: 'codellama:7b',
        temperature: 0.7,
        maxTokens: 2048,
        autoSave: true,
        autoFormat: true,
        autoTest: false,
        codeStyle: {
          indentSize: 2,
          indentType: 'spaces',
          lineLength: 100,
          semicolons: true,
          quotes: 'single',
          trailingCommas: true,
          bracketSpacing: true,
          arrowParens: 'avoid'
        },
        ...request.configuration
      },
      status: 'idle',
      capabilities: [
        { type: 'code-generation', enabled: true, confidence: 0.8 },
        { type: 'code-modification', enabled: true, confidence: 0.8 },
        { type: 'code-refactoring', enabled: true, confidence: 0.7 },
        { type: 'debugging', enabled: true, confidence: 0.6 },
        { type: 'testing', enabled: false, confidence: 0.5 },
        { type: 'documentation', enabled: true, confidence: 0.7 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    agents.set(agent.id, agent);

    res.status(201).json({
      success: true,
      data: agent
    } as APIResponse<CodingAgent>);
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get all agents for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default-user';
    const userAgents = Array.from(agents.values()).filter(agent => agent.userId === userId);
    
    res.json({
      success: true,
      data: userAgents
    } as APIResponse<CodingAgent[]>);
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get a specific agent
router.get('/:id', async (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      } as APIResponse);
    }

    res.json({
      success: true,
      data: agent
    } as APIResponse<CodingAgent>);
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Update an agent
router.put('/:id', async (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      } as APIResponse);
    }

    const request: UpdateAgentRequest = req.body;
    
    const updatedAgent: CodingAgent = {
      ...agent,
      name: request.name || agent.name,
      description: request.description !== undefined ? request.description : agent.description,
      configuration: request.configuration ? { ...agent.configuration, ...request.configuration } : agent.configuration,
      capabilities: request.capabilities || agent.capabilities,
      updatedAt: new Date()
    };

    agents.set(agent.id, updatedAgent);

    res.json({
      success: true,
      data: updatedAgent
    } as APIResponse<CodingAgent>);
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Delete an agent
router.delete('/:id', async (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      } as APIResponse);
    }

    agents.delete(req.params.id);

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    } as APIResponse);
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get agent status
router.get('/:id/status', async (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      } as APIResponse);
    }

    res.json({
      success: true,
      data: agent.status
    } as APIResponse<AgentStatus>);
  } catch (error) {
    console.error('Get agent status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Execute a task with an agent
router.post('/:id/tasks', async (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      } as APIResponse);
    }

    const taskRequest = req.body;
    
    const task: CodeTask = {
      id: generateId(),
      agentId: agent.id,
      type: taskRequest.type,
      language: taskRequest.language,
      description: taskRequest.description,
      context: taskRequest.context || {
        existingFiles: [],
        dependencies: [],
        constraints: []
      },
      status: 'pending',
      createdAt: new Date()
    };

    tasks.set(task.id, task);

    // Update agent status
    agent.status = 'thinking';
    agent.lastActiveAt = new Date();
    agents.set(agent.id, agent);

    // Simulate task execution (replace with actual LLM service call)
    setTimeout(async () => {
      try {
        const result = await executeTask(task, agent);
        task.result = result;
        task.status = 'completed';
        task.completedAt = new Date();
        tasks.set(task.id, task);

        // Update agent status back to idle
        agent.status = 'idle';
        agents.set(agent.id, agent);
      } catch (error) {
        task.status = 'failed';
        task.result = {
          success: false,
          error: error instanceof Error ? error.message : 'Task execution failed'
        };
        tasks.set(task.id, task);
        
        agent.status = 'error';
        agents.set(agent.id, agent);
      }
    }, 1000);

    res.status(202).json({
      success: true,
      data: task
    } as APIResponse<CodeTask>);
  } catch (error) {
    console.error('Execute task error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get task result
router.get('/:id/tasks/:taskId', async (req, res) => {
  try {
    const task = tasks.get(req.params.taskId);
    
    if (!task || task.agentId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      } as APIResponse);
    }

    res.json({
      success: true,
      data: task
    } as APIResponse<CodeTask>);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Stop an agent
router.post('/:id/stop', async (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      } as APIResponse);
    }

    agent.status = 'idle';
    agents.set(agent.id, agent);

    res.json({
      success: true,
      message: 'Agent stopped successfully'
    } as APIResponse);
  } catch (error) {
    console.error('Stop agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function executeTask(task: CodeTask, agent: CodingAgent): Promise<CodeTaskResult> {
  // This is a mock implementation - replace with actual LLM service integration
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
  
  return {
    success: true,
    generatedCode: `// Generated code for: ${task.description}\n// Language: ${task.language}\n// Agent: ${agent.name}\n\nfunction example() {\n  console.log('Hello from ${agent.name}!');\n}`,
    explanation: `This code was generated based on your request: "${task.description}". The agent ${agent.name} analyzed the context and created a basic implementation.`,
    suggestions: [
      'Consider adding error handling',
      'Add unit tests for this function',
      'Document the function parameters'
    ]
  };
}

export default router;