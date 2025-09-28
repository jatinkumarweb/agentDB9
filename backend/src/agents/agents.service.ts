import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { generateId } from '@agentdb9/shared';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
  ) {}

  async findAll(userId?: string): Promise<Agent[]> {
    const whereCondition = userId ? { userId } : {};
    return this.agentsRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  async create(createAgentDto: CreateAgentDto, userId: string): Promise<Agent> {
    // Generate default capabilities based on model
    const defaultCapabilities = [
      { type: 'code-generation' as const, enabled: true, confidence: 0.8 },
      { type: 'code-modification' as const, enabled: true, confidence: 0.8 },
      { type: 'code-refactoring' as const, enabled: true, confidence: 0.7 },
      { type: 'debugging' as const, enabled: true, confidence: 0.6 },
      { type: 'testing' as const, enabled: false, confidence: 0.5 },
      { type: 'documentation' as const, enabled: true, confidence: 0.7 },
    ];

    const agent = this.agentsRepository.create({
      ...createAgentDto,
      userId: userId,
      status: 'idle',
      capabilities: defaultCapabilities,
    });

    const savedAgent = await this.agentsRepository.save(agent);
    return Array.isArray(savedAgent) ? savedAgent[0] : savedAgent;
  }

  async update(id: string, updateData: Partial<CreateAgentDto>): Promise<Agent> {
    const agent = await this.findOne(id);
    Object.assign(agent, updateData);
    const savedAgent = await this.agentsRepository.save(agent);
    return Array.isArray(savedAgent) ? savedAgent[0] : savedAgent;
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    await this.agentsRepository.remove(agent);
  }

  async executeTask(id: string, taskData: any): Promise<any> {
    const agent = await this.findOne(id);
    
    // Update agent status to coding
    agent.status = 'coding';
    await this.agentsRepository.save(agent);

    try {
      // Mock task execution - in real implementation, this would call the LLM service
      const result = {
        taskId: generateId(),
        agentId: id,
        status: 'completed',
        result: 'Task completed successfully',
        timestamp: new Date(),
      };

      // Update agent status back to idle
      agent.status = 'idle' as const;
      await this.agentsRepository.save(agent);

      return result;
    } catch (error) {
      // Update agent status to error
      agent.status = 'error' as const;
      await this.agentsRepository.save(agent);
      throw error;
    }
  }

  async processChat(message: string, context: any): Promise<any> {
    try {
      // Analyze the message to determine if it requires code actions
      const actions = await this.analyzeMessage(message, context);
      
      // Generate response based on the message
      const response = await this.generateResponse(message, context, actions);
      
      // If actions are required, execute them via MCP
      if (actions.length > 0) {
        await this.executeMCPActions(actions, context);
      }
      
      return {
        response,
        actions,
        timestamp: new Date(),
        context
      };
    } catch (error) {
      console.error('Error processing chat:', error);
      return {
        response: "I'm sorry, I encountered an error while processing your request. Please try again.",
        actions: [],
        timestamp: new Date(),
        context
      };
    }
  }

  private async analyzeMessage(message: string, context: any): Promise<any[]> {
    // Simple keyword-based analysis for now
    // In a real implementation, this would use LLM to analyze intent
    const actions: any[] = [];
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('create') && (lowerMessage.includes('file') || lowerMessage.includes('component'))) {
      actions.push({
        type: 'create_file',
        description: 'Create a new file',
        priority: 1
      });
    }
    
    if (lowerMessage.includes('write') || lowerMessage.includes('code') || lowerMessage.includes('implement')) {
      actions.push({
        type: 'write_code',
        description: 'Write code implementation',
        priority: 1
      });
    }
    
    if (lowerMessage.includes('test') || lowerMessage.includes('testing')) {
      actions.push({
        type: 'create_tests',
        description: 'Create test files',
        priority: 2
      });
    }
    
    if (lowerMessage.includes('install') || lowerMessage.includes('dependency') || lowerMessage.includes('package')) {
      actions.push({
        type: 'install_dependencies',
        description: 'Install required dependencies',
        priority: 1
      });
    }
    
    return actions;
  }

  private async generateResponse(message: string, context: any, actions: any[]): Promise<string> {
    // Simple response generation based on actions
    // In a real implementation, this would call the LLM service
    
    if (actions.length === 0) {
      return "I understand your request. How can I help you with your development work?";
    }
    
    const actionDescriptions = actions.map(a => a.description).join(', ');
    return `I'll help you with that! I'm going to: ${actionDescriptions}. Let me work on this in your VS Code workspace.`;
  }

  private async executeMCPActions(actions: any[], context: any): Promise<void> {
    try {
      // For now, just log the actions that would be executed
      // In a real implementation, this would call the MCP server
      console.log('Would execute MCP actions:', actions.map(a => a.type).join(', '));
      console.log('Context:', context);
    } catch (error) {
      console.error('Failed to execute MCP actions:', error);
      // Don't throw error, just log it
    }
  }
}