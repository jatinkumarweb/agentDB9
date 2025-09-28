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

  async processChatWithAgent(agentId: string, message: string, context: any): Promise<any> {
    try {
      // Get the specific agent
      const agent = await this.findOne(agentId);
      
      // Update agent status to thinking
      agent.status = 'thinking';
      await this.agentsRepository.save(agent);

      // Analyze the message to determine if it requires code actions
      const actions = await this.analyzeMessage(message, context);
      
      // Generate response using the specific agent's configuration
      const response = await this.generateAgentResponse(agent, message, context, actions);
      
      // Update agent status to coding if actions are required
      if (actions.length > 0) {
        agent.status = 'coding';
        await this.agentsRepository.save(agent);
        
        // Execute actions via MCP
        await this.executeMCPActions(actions, { ...context, agentId, agentName: agent.name });
      }

      // Update agent status back to idle
      agent.status = 'idle';
      await this.agentsRepository.save(agent);
      
      return {
        response,
        actions,
        timestamp: new Date(),
        context: { ...context, agentId, agentName: agent.name },
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description
        }
      };
    } catch (error) {
      console.error('Error processing chat with agent:', error);
      
      // Reset agent status on error
      try {
        const agent = await this.findOne(agentId);
        agent.status = 'error';
        await this.agentsRepository.save(agent);
      } catch (e) {
        // Ignore error in error handler
      }
      
      return {
        response: "I'm sorry, I encountered an error while processing your request. Please try again.",
        actions: [],
        timestamp: new Date(),
        context,
        agent: null
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

  private async generateAgentResponse(agent: Agent, message: string, context: any, actions: any[]): Promise<string> {
    try {
      // Call LLM service for intelligent response generation
      const llmResponse = await this.callLLMService(agent, message, context, actions);
      return llmResponse;
    } catch (error) {
      console.error('Failed to get LLM response, falling back to simple response:', error);
      
      // Fallback to simple response generation
      if (actions.length === 0) {
        return `Hi! I'm ${agent.name}. I understand your request. How can I help you with your development work?`;
      }
      
      const actionDescriptions = actions.map(a => a.description).join(', ');
      return `Hi! I'm ${agent.name}. I'll help you with that! I'm going to: ${actionDescriptions}. Let me work on this in your VS Code workspace.`;
    }
  }

  private async callLLMService(agent: Agent, message: string, context: any, actions: any[]): Promise<string> {
    try {
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://llm-service:9000';
      
      // Prepare the prompt for the LLM
      const systemPrompt = this.buildSystemPrompt(agent, actions);
      const userPrompt = this.buildUserPrompt(message, context);
      
      const response = await fetch(`${llmServiceUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.configuration?.model || 'codellama:7b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || data.message || "I'll help you with that request.";
      
    } catch (error) {
      console.error('Error calling LLM service:', error);
      throw error;
    }
  }

  private buildSystemPrompt(agent: Agent, actions: any[]): string {
    const actionsText = actions.length > 0 
      ? `\n\nPlanned Actions: ${actions.map(a => `${a.type} - ${a.description}`).join(', ')}`
      : '';

    return `You are ${agent.name}, an AI coding assistant. ${agent.description || 'You help developers with coding tasks.'}

Your capabilities include:
${agent.capabilities?.map(cap => `- ${cap.type}: ${cap.enabled ? 'enabled' : 'disabled'}`).join('\n') || '- General coding assistance'}

You work in a VS Code environment and can execute development tasks through MCP tools.${actionsText}

Respond in a helpful, professional manner. Be specific about what you'll do and how you'll help. Keep responses concise but informative.`;
  }

  private buildUserPrompt(message: string, context: any): string {
    const contextInfo = context.workspaceId ? `\nWorkspace: ${context.workspaceId}` : '';
    const userInfo = context.userName ? `\nUser: ${context.userName}` : '';
    
    return `${message}${contextInfo}${userInfo}`;
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