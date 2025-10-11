import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { generateId } from '@agentdb9/shared';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ContextService } from '../context/context.service';
import { MemoryService } from '../memory/memory.service';
import { ReActAgentService } from '../conversations/react-agent.service';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    private knowledgeService: KnowledgeService,
    private contextService: ContextService,
    private memoryService: MemoryService,
    @Inject(forwardRef(() => ReActAgentService))
    private reactAgentService: ReActAgentService,
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

    // Default configuration values
    const defaultConfiguration = {
      llmProvider: 'ollama' as const,
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful coding assistant. You provide clear, concise, and accurate code solutions.',
      codeStyle: {
        indentSize: 2,
        indentType: 'spaces' as const,
        lineLength: 100,
        semicolons: true,
        quotes: 'single' as const,
        trailingCommas: true,
        bracketSpacing: true,
        arrowParens: 'always' as const,
      },
      autoSave: true,
      autoFormat: true,
      autoTest: false,
      knowledgeBase: {
        enabled: false,
        embeddingProvider: 'ollama' as const,
        embeddingModel: 'nomic-embed-text',
        vectorStore: 'chroma' as const,
        chunkSize: 1000,
        chunkOverlap: 200,
        retrievalTopK: 5,
        sources: [],
        autoUpdate: false,
      },
      memory: {
        enabled: true,
        shortTerm: {
          enabled: true,
          maxMessages: 50,
          retentionHours: 24,
        },
        longTerm: {
          enabled: true,
          consolidationThreshold: 10,
          importanceThreshold: 0.7,
        },
      },
    };

    // Merge user configuration with defaults
    const mergedConfiguration = {
      ...defaultConfiguration,
      ...createAgentDto.configuration,
      codeStyle: {
        ...defaultConfiguration.codeStyle,
        ...(createAgentDto.configuration?.codeStyle || {}),
      },
      knowledgeBase: createAgentDto.configuration?.knowledgeBase 
        ? {
            ...defaultConfiguration.knowledgeBase,
            ...createAgentDto.configuration.knowledgeBase,
          }
        : defaultConfiguration.knowledgeBase,
      memory: createAgentDto.configuration?.memory
        ? {
            ...defaultConfiguration.memory,
            ...createAgentDto.configuration.memory,
            shortTerm: {
              ...defaultConfiguration.memory.shortTerm,
              ...(createAgentDto.configuration.memory.shortTerm || {}),
            },
            longTerm: {
              ...defaultConfiguration.memory.longTerm,
              ...(createAgentDto.configuration.memory.longTerm || {}),
            },
          }
        : defaultConfiguration.memory,
    };

    const agent = this.agentsRepository.create({
      ...createAgentDto,
      configuration: mergedConfiguration,
      userId: userId,
      status: 'idle',
      capabilities: defaultCapabilities,
    });

    const savedAgent = await this.agentsRepository.save(agent);
    const finalAgent = Array.isArray(savedAgent) ? savedAgent[0] : savedAgent;

    // Process knowledge base configuration if enabled
    if (mergedConfiguration.knowledgeBase?.enabled) {
      this.logger.log(`Processing knowledge base for agent ${finalAgent.id}`);
      await this.processKnowledgeBaseSetup(finalAgent.id, mergedConfiguration.knowledgeBase);
    }

    return finalAgent;
  }

  async update(id: string, updateData: Partial<CreateAgentDto>): Promise<Agent> {
    const agent = await this.findOne(id);
    const previousKnowledgeBase = agent.configuration?.knowledgeBase;
    
    Object.assign(agent, updateData);
    const savedAgent = await this.agentsRepository.save(agent);
    const finalAgent = Array.isArray(savedAgent) ? savedAgent[0] : savedAgent;

    // Handle knowledge base configuration changes
    const newKnowledgeBase = updateData.configuration?.knowledgeBase;
    if (newKnowledgeBase) {
      // If knowledge base was just enabled
      if (newKnowledgeBase.enabled && !previousKnowledgeBase?.enabled) {
        this.logger.log(`Enabling knowledge base for agent ${id}`);
        await this.processKnowledgeBaseSetup(id, newKnowledgeBase);
      }
      // If knowledge base was disabled
      else if (!newKnowledgeBase.enabled && previousKnowledgeBase?.enabled) {
        this.logger.log(`Disabling knowledge base for agent ${id}`);
        // Optionally clean up knowledge sources
      }
      // If knowledge base is enabled and sources changed
      else if (newKnowledgeBase.enabled && previousKnowledgeBase?.enabled) {
        this.logger.log(`Updating knowledge base for agent ${id}`);
        await this.updateKnowledgeBaseSources(id, previousKnowledgeBase, newKnowledgeBase);
      }
    }

    return finalAgent;
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

      // Retrieve relevant knowledge if knowledge base is enabled
      let knowledgeContext: any = null;
      if (agent.configuration?.knowledgeBase?.enabled) {
        try {
          const topK = agent.configuration.knowledgeBase.retrievalTopK || 5;
          knowledgeContext = await this.knowledgeService.getAgentKnowledgeContext(
            agentId,
            message,
            topK
          );
          if (knowledgeContext && knowledgeContext.chunks) {
            this.logger.log(`Retrieved ${knowledgeContext.chunks.length} knowledge chunks for agent ${agentId}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to retrieve knowledge context: ${error.message}`);
          // Continue without knowledge context
        }
      }

      // Get project context for workspace awareness
      let projectContext: any = null;
      if (context.workspaceId) {
        try {
          projectContext = await this.contextService.getProjectSummary(context.workspaceId);
          if (projectContext) {
            this.logger.log(`Retrieved project context for workspace ${context.workspaceId}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to retrieve project context: ${error.message}`);
        }
      }

      // Get memory context for continuous learning
      let memoryContext: any = null;
      if (context.sessionId) {
        try {
          memoryContext = await this.memoryService.getMemoryContext(
            agentId,
            context.sessionId,
            message,
          );
          if (memoryContext) {
            this.logger.log(`Retrieved memory context: ${memoryContext.summary}`);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to retrieve memory context: ${error.message}`);
        }
      }

      // Store interaction in short-term memory
      if (context.sessionId) {
        try {
          await this.memoryService.createMemory({
            agentId,
            sessionId: context.sessionId,
            category: 'interaction',
            content: `User: ${message}`,
            importance: 0.5,
            metadata: {
              workspaceId: context.workspaceId,
              userId: context.userId,
              tags: ['chat', 'interaction'],
              keywords: this.extractKeywords(message),
              confidence: 0.8,
              relevance: 0.7,
              source: 'chat',
            },
          });
        } catch (error: any) {
          this.logger.warn(`Failed to store interaction in memory: ${error.message}`);
        }
      }

      // Use ReAct pattern for tool execution with enhanced context
      const model = agent.configuration?.model || 'qwen2.5-coder:7b';
      
      // Build enhanced system prompt with all context
      const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
        agent,
        knowledgeContext,
        projectContext,
        memoryContext
      );
      
      // Execute with ReAct pattern (5 iterations for workspace)
      const response = await this.reactAgentService.executeWithReAct(
        message,
        model,
        enhancedSystemPrompt,
        context,
        5 // Full iterations for workspace
      );

      // Update agent status back to idle
      agent.status = 'idle';
      await this.agentsRepository.save(agent);
      
      // Note: Message storage is handled by ReAct service via conversationId in context
      
      return {
        response,
        actions: [], // ReAct handles actions internally
        timestamp: new Date(),
        context: { ...context, agentId, agentName: agent.name },
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description
        },
        knowledgeUsed: knowledgeContext ? knowledgeContext.chunks?.length || 0 : 0
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
        agent: null,
        knowledgeUsed: 0
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

  private async generateAgentResponse(agent: Agent, message: string, context: any, actions: any[], knowledgeContext?: any, projectContext?: any, memoryContext?: any): Promise<string> {
    try {
      // Call LLM service for intelligent response generation
      const llmResponse = await this.callLLMService(agent, message, context, actions, knowledgeContext, projectContext, memoryContext);
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

  private async callLLMService(agent: Agent, message: string, context: any, actions: any[], knowledgeContext?: any, projectContext?: any, memoryContext?: any): Promise<string> {
    try {
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://llm-service:9000';
      
      // Prepare the prompt for the LLM
      const systemPrompt = this.buildSystemPrompt(agent, actions, knowledgeContext, projectContext, memoryContext);
      const userPrompt = this.buildUserPrompt(message, context);
      
      // Add userId to the request so LLM service can fetch user's API keys
      const url = context.userId 
        ? `${llmServiceUrl}/api/chat?userId=${context.userId}`
        : `${llmServiceUrl}/api/chat`;
      
      console.log('[AgentsService] Calling LLM service:', url, 'model:', agent.configuration?.model);
      
      const response = await fetch(url, {
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

  private buildSystemPrompt(agent: Agent, actions: any[], knowledgeContext?: any, projectContext?: any, memoryContext?: any): string {
    const actionsText = actions.length > 0 
      ? `\n\nPlanned Actions: ${actions.map(a => `${a.type} - ${a.description}`).join(', ')}`
      : '';

    let knowledgeText = '';
    if (knowledgeContext && knowledgeContext.chunks.length > 0) {
      knowledgeText = `\n\nRelevant Knowledge Base Context:\n${knowledgeContext.chunks.map((chunk: any, idx: number) => 
        `[${idx + 1}] ${chunk.metadata.title || 'Document'} (relevance: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.content.substring(0, 300)}...`
      ).join('\n\n')}`;
    }

    let projectText = '';
    if (projectContext) {
      projectText = `\n\nProject Context:
- Name: ${projectContext.name}
- Type: ${projectContext.type}
- Primary Framework: ${projectContext.primaryFramework?.name || 'None'} ${projectContext.primaryFramework?.version || ''}
- Primary Language: ${projectContext.primaryLanguage?.name || 'Unknown'}
- Structure: ${projectContext.structure.layout} (${projectContext.structure.files} files, ${projectContext.structure.directories} directories)
- Major Dependencies: ${projectContext.majorDependencies.slice(0, 5).map((d: any) => d.name).join(', ')}
- Entry Points: ${projectContext.entryPoints.join(', ')}
- Available Scripts: ${projectContext.availableScripts.join(', ')}`;
    }

    let memoryText = '';
    if (memoryContext && memoryContext.totalMemories > 0) {
      memoryText = `\n\nMemory Context (${memoryContext.summary}):`;
      
      if (memoryContext.relevantLessons.length > 0) {
        memoryText += `\n\nLearned Lessons:`;
        memoryContext.relevantLessons.slice(0, 3).forEach((lesson: any, idx: number) => {
          memoryText += `\n[${idx + 1}] ${lesson.summary}`;
        });
      }
      
      if (memoryContext.relevantChallenges.length > 0) {
        memoryText += `\n\nResolved Challenges:`;
        memoryContext.relevantChallenges.slice(0, 3).forEach((challenge: any, idx: number) => {
          memoryText += `\n[${idx + 1}] ${challenge.summary}`;
        });
      }
      
      if (memoryContext.relevantFeedback.length > 0) {
        memoryText += `\n\nUser Feedback:`;
        memoryContext.relevantFeedback.slice(0, 2).forEach((feedback: any, idx: number) => {
          memoryText += `\n[${idx + 1}] ${feedback.summary}`;
        });
      }
    }

    return `You are ${agent.name}, an AI coding assistant. ${agent.description || 'You help developers with coding tasks.'}

Your capabilities include:
${agent.capabilities?.map(cap => `- ${cap.type}: ${cap.enabled ? 'enabled' : 'disabled'}`).join('\n') || '- General coding assistance'}

You work in a VS Code environment and can execute development tasks through MCP tools.${actionsText}${knowledgeText}${projectText}${memoryText}

Respond in a helpful, professional manner. Be specific about what you'll do and how you'll help. Keep responses concise but informative.${knowledgeContext ? ' Use the knowledge base context provided above to give more accurate and informed responses.' : ''}${projectContext ? ' Use the project context to understand the codebase structure and make informed suggestions.' : ''}${memoryContext ? ' Learn from past interactions and apply lessons learned to provide better assistance.' : ''}`;
  }

  /**
   * Extract keywords from message for memory tagging
   */
  private extractKeywords(message: string): string[] {
    const words = message.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can']);
    
    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10);
  }

  private buildEnhancedSystemPrompt(
    agent: Agent,
    knowledgeContext?: any,
    projectContext?: any,
    memoryContext?: any
  ): string {
    let prompt = agent.configuration?.systemPrompt || `You are ${agent.name}, ${agent.description}`;

    // Add knowledge context
    if (knowledgeContext && knowledgeContext.chunks && knowledgeContext.chunks.length > 0) {
      prompt += '\n\n## Relevant Knowledge:\n';
      knowledgeContext.chunks.forEach((chunk: any, index: number) => {
        prompt += `\n${index + 1}. ${chunk.content}`;
      });
    }

    // Add project context
    if (projectContext) {
      prompt += '\n\n## Project Context:\n';
      if (projectContext.languages) {
        prompt += `\nLanguages: ${projectContext.languages.join(', ')}`;
      }
      if (projectContext.frameworks) {
        prompt += `\nFrameworks: ${projectContext.frameworks.join(', ')}`;
      }
      if (projectContext.structure) {
        prompt += `\nProject Structure: ${JSON.stringify(projectContext.structure, null, 2)}`;
      }
    }

    // Add memory context
    if (memoryContext && memoryContext.summary) {
      prompt += '\n\n## Previous Context:\n';
      prompt += memoryContext.summary;
    }

    return prompt;
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

  async checkAgentsAvailability(agents: Agent[]): Promise<any[]> {
    try {
      // Get available Ollama models
      const availableModels = await this.getAvailableOllamaModels();
      
      return agents.map(agent => {
        const model = agent.configuration?.model || '';
        const isOllamaModel = this.isOllamaModel(model);
        const isAvailable = isOllamaModel ? availableModels.includes(model) : false;
        
        return {
          ...agent,
          modelAvailable: isAvailable,
          modelProvider: isOllamaModel ? 'ollama' : 'external',
          availableModels: isOllamaModel ? availableModels : []
        };
      });
    } catch (error) {
      console.error('Failed to check agent availability:', error);
      // Return agents without availability info on error
      return agents.map(agent => ({
        ...agent,
        modelAvailable: null,
        modelProvider: 'unknown',
        availableModels: []
      }));
    }
  }

  private async getAvailableOllamaModels(): Promise<string[]> {
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`);
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to get Ollama models:', error);
      return [];
    }
  }

  private isOllamaModel(model: string): boolean {
    // Common Ollama model patterns
    const ollamaPatterns = [
      'llama', 'codellama', 'mistral', 'mixtral', 'phi', 'gemma',
      'qwen', 'deepseek', 'starcoder', 'wizardcoder', 'solar',
      'openchat', 'starling', 'neural-chat', 'orca', 'vicuna'
    ];
    
    const lowerModel = model.toLowerCase();
    return ollamaPatterns.some(pattern => lowerModel.includes(pattern));
  }

  /**
   * Process knowledge base setup for a new agent
   */
  private async processKnowledgeBaseSetup(agentId: string, knowledgeBaseConfig: any): Promise<void> {
    try {
      // Add all initial knowledge sources
      if (knowledgeBaseConfig.sources && knowledgeBaseConfig.sources.length > 0) {
        this.logger.log(`Adding ${knowledgeBaseConfig.sources.length} knowledge sources for agent ${agentId}`);
        
        for (const source of knowledgeBaseConfig.sources) {
          try {
            await this.knowledgeService.addSource(agentId, source);
            
            // Trigger ingestion for each source
            await this.knowledgeService.ingestSource({
              agentId,
              source,
              options: {
                chunkSize: knowledgeBaseConfig.chunkSize,
                chunkOverlap: knowledgeBaseConfig.chunkOverlap,
                extractMetadata: true,
                generateEmbeddings: true,
              },
            });
            
            this.logger.log(`Successfully ingested source: ${source.type} - ${source.url || 'inline content'}`);
          } catch (error) {
            this.logger.error(`Failed to ingest source ${source.url}: ${error.message}`);
            // Continue with other sources even if one fails
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to setup knowledge base for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update knowledge base sources when agent configuration changes
   */
  private async updateKnowledgeBaseSources(
    agentId: string,
    previousConfig: any,
    newConfig: any
  ): Promise<void> {
    try {
      const previousSources = previousConfig.sources || [];
      const newSources = newConfig.sources || [];

      // Find sources to add (in new but not in previous)
      const sourcesToAdd = newSources.filter((newSource: any) =>
        !previousSources.some((prevSource: any) => 
          prevSource.url === newSource.url && prevSource.type === newSource.type
        )
      );

      // Find sources to remove (in previous but not in new)
      const sourcesToRemove = previousSources.filter((prevSource: any) =>
        !newSources.some((newSource: any) => 
          newSource.url === prevSource.url && newSource.type === prevSource.type
        )
      );

      // Add new sources
      for (const source of sourcesToAdd) {
        try {
          await this.knowledgeService.addSource(agentId, source);
          await this.knowledgeService.ingestSource({
            agentId,
            source,
            options: {
              chunkSize: newConfig.chunkSize,
              chunkOverlap: newConfig.chunkOverlap,
              extractMetadata: true,
              generateEmbeddings: true,
            },
          });
          this.logger.log(`Added new source: ${source.type} - ${source.url || 'inline content'}`);
        } catch (error) {
          this.logger.error(`Failed to add source ${source.url}: ${error.message}`);
        }
      }

      // Remove old sources
      for (const source of sourcesToRemove) {
        try {
          if (source.id) {
            await this.knowledgeService.deleteSource(source.id);
            this.logger.log(`Removed source: ${source.type} - ${source.url || 'inline content'}`);
          }
        } catch (error) {
          this.logger.error(`Failed to remove source ${source.url}: ${error.message}`);
        }
      }

      // Check if embedding configuration changed - if so, reindex all sources
      if (
        previousConfig.embeddingProvider !== newConfig.embeddingProvider ||
        previousConfig.embeddingModel !== newConfig.embeddingModel ||
        previousConfig.chunkSize !== newConfig.chunkSize ||
        previousConfig.chunkOverlap !== newConfig.chunkOverlap
      ) {
        this.logger.log(`Embedding configuration changed, reindexing all sources for agent ${agentId}`);
        await this.knowledgeService.reindexAgent(agentId);
      }
    } catch (error) {
      this.logger.error(`Failed to update knowledge base sources for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }
}