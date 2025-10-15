import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Agent } from '../entities/agent.entity';
import { Project } from '../entities/project.entity';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { MCPService } from '../mcp/mcp.service';
import { ReActAgentService } from './react-agent.service';
import { MemoryService } from '../memory/memory.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { parseJSON } from '../common/utils/json-parser.util';
// CreateMessageDto import removed - using plain object type instead

@Injectable()
export class ConversationsService {
  private ollamaAvailable: boolean | null = null;
  private lastOllamaCheck: number = 0;
  private readonly OLLAMA_CHECK_INTERVAL = 300000; // Check every 5 minutes (optimized)
  
  // Batch update optimization
  private pendingUpdates = new Map<string, {
    content: string;
    metadata: any;
    timestamp: number;
    retryCount: number;
  }>();
  private updateBatchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_UPDATE_INTERVAL = 2000; // Batch updates every 2 seconds
  private readonly MAX_RETRY_COUNT = 3;
  
  // Model cache optimization
  private modelCache: { models: string[], timestamp: number } = { models: [], timestamp: 0 };
  private readonly MODEL_CACHE_TTL = 300000; // 5 minutes

  // Generation control
  private activeGenerations = new Map<string, { abortController: AbortController; messageId: string }>();

  constructor(
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @Inject(forwardRef(() => WebSocketGateway))
    private websocketGateway: WebSocketGateway,
    private mcpService: MCPService,
    private reactAgentService: ReActAgentService,
    private memoryService: MemoryService,
    private knowledgeService: KnowledgeService,
  ) {
    // Initialize batch update timer
    this.startBatchUpdateTimer();
  }

  private startBatchUpdateTimer() {
    if (this.updateBatchTimer) {
      clearInterval(this.updateBatchTimer);
    }
    
    this.updateBatchTimer = setInterval(async () => {
      try {
        await this.processPendingUpdates();
      } catch (error) {
        console.error('Batch update timer error:', error);
      }
    }, this.BATCH_UPDATE_INTERVAL);
  }

  private async processPendingUpdates() {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    try {
      // Process updates using the repository directly (simpler and more reliable)
      const updatePromises = updates.map(([messageId, update]) => 
        this.messagesRepository.update(messageId, {
          content: update.content,
          metadata: update.metadata
        })
      );

      await Promise.all(updatePromises);
      console.log(`Batch updated ${updates.length} messages`);
    } catch (error) {
      console.error('Failed to process batch updates:', error);
      
      // Re-add failed updates with retry count, or use direct update if max retries reached
      for (const [messageId, update] of updates) {
        if (update.retryCount < this.MAX_RETRY_COUNT) {
          this.pendingUpdates.set(messageId, {
            ...update,
            retryCount: update.retryCount + 1
          });
        } else {
          // Fallback to direct update if batch updates keep failing
          console.log(`Falling back to direct update for message ${messageId}`);
          this.messagesRepository.update(messageId, {
            content: update.content,
            metadata: update.metadata
          }).catch(directError => {
            console.error(`Direct update also failed for message ${messageId}:`, directError);
          });
        }
      }
    }
  }

  private queueMessageUpdate(messageId: string, content: string, metadata: any) {
    this.pendingUpdates.set(messageId, {
      content,
      metadata,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  async findByAgent(agentId: string, userId?: string): Promise<Conversation[]> {
    const whereCondition = userId ? { agentId, userId } : { agentId };
    return this.conversationsRepository.find({
      where: whereCondition,
      order: { updatedAt: 'DESC' },
      relations: ['messages'],
    });
  }

  async findOne(id: string, includeMessages: boolean = true): Promise<Conversation> {
    const relations = includeMessages ? ['messages', 'agent'] : ['agent'];
    
    const conversation = await this.conversationsRepository.findOne({
      where: { id },
      relations,
    });
    
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    
    return conversation;
  }

  async create(createConversationDto: CreateConversationDto, userId: string): Promise<Conversation> {
    const conversation = this.conversationsRepository.create({
      ...createConversationDto,
      userId: userId,
    });
    return this.conversationsRepository.save(conversation);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    // Verify conversation exists
    await this.findOne(conversationId);
    
    return this.messagesRepository.find({
      where: { conversationId },
      order: { timestamp: 'ASC' },
    });
  }

  async addMessage(messageData: { conversationId: string; role: string; content: string; metadata?: Record<string, any> }): Promise<Message> {
    // Verify conversation exists and load agent (but not all messages for performance)
    const conversation = await this.findOne(messageData.conversationId, false);
    
    const message = this.messagesRepository.create(messageData);
    const savedMessage = await this.messagesRepository.save(message);

    // Update conversation's updatedAt timestamp
    await this.conversationsRepository.update(
      messageData.conversationId,
      { updatedAt: new Date() }
    );

    // Emit WebSocket event for new message
    // Only log in debug mode
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('About to broadcast new message via WebSocket:', savedMessage.id);
    }
    if (this.websocketGateway) {
      this.websocketGateway.broadcastNewMessage(messageData.conversationId, savedMessage);
    } else {
      console.error('WebSocket gateway not available!');
    }

    // Generate agent response if this is a user message
    if (this.isUserRole(messageData.role)) {
      // Don't await this to avoid blocking the user message response
      this.generateAgentResponse(conversation, messageData.content).catch(error => {
        console.error('Failed to generate agent response:', error);
      });
    }

    return savedMessage;
  }

  async stopGeneration(conversationId: string, messageId: string): Promise<void> {
    console.log(`Stopping generation for message ${messageId} in conversation ${conversationId}`);
    
    // Find and abort the active generation
    const generation = this.activeGenerations.get(messageId);
    if (generation) {
      generation.abortController.abort();
      this.activeGenerations.delete(messageId);
      
      // Update the message to mark it as stopped
      try {
        await this.messagesRepository.update(messageId, {
          metadata: {
            streaming: false,
            completed: false,
            stopped: true,
            stoppedAt: new Date().toISOString()
          } as Record<string, any>
        });

        // Emit WebSocket event
        this.websocketGateway.broadcastMessageUpdate(
          conversationId,
          messageId,
          '', // Keep existing content
          false, // Not streaming anymore
          {
            streaming: false,
            completed: false,
            stopped: true,
            stoppedAt: new Date().toISOString()
          }
        );
      } catch (error) {
        console.error('Failed to update stopped message:', error);
      }
    }
  }

  private isUserRole(role: string): boolean {
    const userRoles = ['user', 'human', 'person'];
    return userRoles.includes(role.toLowerCase());
  }

  private async generateAgentResponse(conversation: any, userMessage: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Debug logging
      // Debug logging (only in development with verbose mode)
      const isVerbose = process.env.LOG_LEVEL === 'debug';
      if (isVerbose) {
        console.log('=== AGENT RESPONSE DEBUG ===');
        console.log('Conversation ID:', conversation.id);
        console.log('Agent loaded:', !!conversation.agent);
        console.log('Agent ID:', conversation.agent?.id);
        console.log('Agent configuration:', conversation.agent?.configuration);
        console.log('Project ID:', conversation.projectId);
      }
      
      // Workspace conversations (with projectId) use the same flow as regular conversations
      // The projectId is just metadata for now - future enhancement can add workspace-specific context
      
      const model = conversation.agent?.configuration?.model || 'qwen2.5-coder:7b';
      if (isVerbose) console.log('Using model:', model);
      
      // Check if this is an Ollama model and if we should attempt to use it
      const isOllamaModel = this.isOllamaModel(model);
      if (isVerbose) console.log('Is Ollama model:', isOllamaModel);
      let agentResponse: string;
      let actualModel = model; // Track the actual model used
      
      if (isOllamaModel) {
        // Check if Ollama is available before making the call
        const isOllamaHealthy = await this.checkOllamaHealth();
        if (isVerbose) console.log(`Ollama health check result: ${isOllamaHealthy} for model: ${model}`);
        
        // Check what models are actually available
        const availableModels = await this.getAvailableOllamaModels();
        if (isVerbose) console.log('Available Ollama models:', availableModels);
        
        // If the configured model isn't available, try to use an available one
        if (!availableModels.includes(model) && availableModels.length > 0) {
          actualModel = availableModels[0];
          if (isVerbose) console.log(`Model ${model} not available, using ${actualModel} instead`);
        }
        
        if (isOllamaHealthy && availableModels.length > 0) {
          try {
            // Use ReAct for tool-based queries, streaming for simple queries
            const useReAct = this.shouldUseReAct(userMessage);
            console.log(`🔍 Query analysis: "${userMessage.substring(0, 50)}..." -> ReAct: ${useReAct}`);
            
            if (useReAct) {
              console.log('🔄 Using ReAct pattern for tool-based query');
              await this.callOllamaAPIWithReAct(userMessage, actualModel, conversation);
              return;
            } else {
              // Use streaming API which handles message creation internally
              await this.callOllamaAPIStreaming(userMessage, actualModel, conversation);
              return; // Exit early since streaming handles message creation
            }
          } catch (error) {
            console.log('Ollama streaming API call failed despite health check passing, using fallback');
            agentResponse = this.getOllamaUnavailableMessage(userMessage);
            // Mark Ollama as unavailable to avoid future calls
            this.ollamaAvailable = false;
            this.lastOllamaCheck = Date.now();
          }
        } else {
          agentResponse = this.getOllamaUnavailableMessage(userMessage);
        }
      } else {
        // For non-Ollama models (OpenAI, Anthropic, etc.), call LLM service
        try {
          console.log(`🌐 Calling external API for model: ${model}`);
          
          // Check if we should use ReACT pattern for external LLMs
          const useReAct = this.shouldUseReAct(userMessage);
          console.log(`🔍 Query analysis for external LLM: "${userMessage.substring(0, 50)}..." -> ReAct: ${useReAct}`);
          
          if (useReAct) {
            console.log('🔄 Using ReAct pattern for external LLM tool-based query');
            await this.callExternalLLMAPIWithReAct(userMessage, model, conversation);
            return; // Exit early since ReAct handles message creation
          } else {
            // Use streaming API which handles message creation internally
            await this.callExternalLLMAPIStreaming(userMessage, model, conversation);
            return; // Exit early since streaming handles message creation
          }
        } catch (error) {
          console.error('Failed to call external LLM API:', error);
          agentResponse = `I apologize, but I encountered an error while trying to process your message with ${model}. Please ensure your API key is configured correctly in the settings.

Error: ${error.message}`;
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      // Check for MCP tool calls in the agent response
      let finalResponse = agentResponse;
      const toolCalls = this.mcpService.parseToolCalls(agentResponse);
      
      if (toolCalls.length > 0) {
        console.log(`Found ${toolCalls.length} tool calls in agent response`);
        
        // Get working directory for project context
        const workingDir = await this.getWorkingDirectory(conversation);
        
        // Execute MCP tools with project working directory
        const toolResults = await Promise.all(
          toolCalls.map(toolCall => this.mcpService.executeTool(toolCall, workingDir))
        );
        
        // Format tool results and append to response
        const toolResultsText = this.mcpService.formatToolResults(toolCalls, toolResults);
        finalResponse = agentResponse + toolResultsText;
        
        console.log('MCP tools executed successfully');
      }
      
      // Create agent response message
      const agentMessageData = {
        conversationId: conversation.id,
        role: 'agent',
        content: finalResponse,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: model,
          actualModel: actualModel,
          responseTime: responseTime,
          provider: isOllamaModel ? 'ollama' : 'external',
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          mcpToolsUsed: toolCalls.length > 0
        }
      };

      // Create agent message directly without triggering another response
      const agentMessage = this.messagesRepository.create(agentMessageData);
      await this.messagesRepository.save(agentMessage);
      
      // Update conversation timestamp
      await this.conversationsRepository.update(
        conversation.id,
        { updatedAt: new Date() }
      );
      
      // Store interaction in memory if enabled
      if (conversation.agent?.configuration?.memory?.enabled) {
        try {
          await this.memoryService.createMemory({
            agentId: conversation.agentId,
            sessionId: conversation.id,
            type: 'short-term',
            category: 'interaction',
            content: `User: ${userMessage}\nAgent: ${finalResponse}`,
            importance: toolCalls.length > 0 ? 0.8 : 0.5, // Higher importance if tools were used
            metadata: {
              tags: [model, isOllamaModel ? 'ollama' : 'external'],
              keywords: toolCalls.length > 0 ? ['tool-usage'] : ['conversation'],
              confidence: 1.0,
              relevance: 1.0,
              source: 'conversation' as any
            }
          });
          console.log('✅ Stored interaction in memory');
        } catch (error) {
          console.error('Failed to store interaction in memory:', error);
          // Continue without storing memory
        }
      }
      
      console.log(`Generated agent response for conversation ${conversation.id}`);
    } catch (error) {
      console.error('Error generating agent response:', error);
    }
  }

  private isOllamaModel(model: string): boolean {
    // Common Ollama model patterns
    const ollamaModels = [
      'codellama', 'llama', 'mistral', 'qwen', 'deepseek', 'codegemma', 
      'starcoder', 'magicoder', 'codestral', 'phi', 'gemma'
    ];
    
    return ollamaModels.some(ollamaModel => 
      model.toLowerCase().includes(ollamaModel.toLowerCase())
    );
  }

  private async getAvailableOllamaModels(): Promise<string[]> {
    const now = Date.now();
    
    // Return cached models if still valid
    if (this.modelCache.models.length > 0 && (now - this.modelCache.timestamp) < this.MODEL_CACHE_TTL) {
      console.log('Using cached Ollama models');
      return this.modelCache.models;
    }
    
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: controller.signal,
        headers: {
          'Connection': 'keep-alive',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Return cached models if available, even if expired
        return this.modelCache.models;
      }
      
      const data = await response.json();
      const models = data.models?.map((model: any) => model.name) || [];
      
      // Update cache
      this.modelCache = {
        models,
        timestamp: now
      };
      
      console.log(`Cached ${models.length} Ollama models`);
      return models;
    } catch (error) {
      console.log('Failed to get available Ollama models:', error.message);
      // Return cached models if available, even if expired
      return this.modelCache.models;
    }
  }

  private async checkOllamaHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Optimized caching strategy:
    // - Cache successful results for 5 minutes
    // - Cache failed results for 2 minutes (shorter to retry sooner)
    const cacheInterval = this.ollamaAvailable ? this.OLLAMA_CHECK_INTERVAL : 120000; // 2 minutes for failures
    
    if (this.ollamaAvailable !== null && (now - this.lastOllamaCheck) < cacheInterval) {
      return this.ollamaAvailable;
    }

    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Slightly longer timeout for reliability
      
      console.log(`Checking Ollama health at: ${ollamaUrl}/api/version`);
      
      const response = await fetch(`${ollamaUrl}/api/version`, {
        signal: controller.signal,
        // Add keep-alive to reuse connections
        headers: {
          'Connection': 'keep-alive',
        },
      });
      
      clearTimeout(timeoutId);
      this.ollamaAvailable = response.ok;
      this.lastOllamaCheck = now;
      
      // Only log status changes to reduce noise
      if (this.ollamaAvailable !== (response.ok)) {
        console.log(`Ollama health status changed: ${response.ok ? 'HEALTHY' : 'UNHEALTHY'} (status: ${response.status})`);
      }
      
      return this.ollamaAvailable;
    } catch (error) {
      // Only log if status changed from healthy to unhealthy
      if (this.ollamaAvailable !== false) {
        console.log(`Ollama health check failed: ${error.message}`);
      }
      this.ollamaAvailable = false;
      this.lastOllamaCheck = now;
      return false;
    }
  }

  /**
   * Get the working directory for a conversation based on its project
   */
  private async getWorkingDirectory(conversation?: Conversation): Promise<string> {
    if (conversation?.projectId) {
      try {
        const project = await this.projectsRepository.findOne({ where: { id: conversation.projectId } });
        if (project?.localPath) {
          return project.localPath;
        }
      } catch (error) {
        console.error('[Conversations] Failed to get project working directory:', error);
      }
    }
    return process.env.VSCODE_WORKSPACE || '/workspace';
  }

  private async buildSystemPrompt(agent: Agent, conversationId: string, userMessage: string, conversation?: Conversation): Promise<string> {
    let systemPrompt = agent.configuration?.systemPrompt || 'You are a helpful AI assistant.';
    
    // Add project context if this is a workspace conversation
    if (conversation?.projectId) {
      try {
        const project = await this.projectsRepository.findOne({ where: { id: conversation.projectId } });
        if (project) {
          systemPrompt += `\n\n## Current Project Context\n`;
          systemPrompt += `You are working in a project workspace with the following details:\n`;
          systemPrompt += `- **Project Name**: ${project.name}\n`;
          systemPrompt += `- **Project Directory**: ${project.localPath || '/workspace/projects/' + project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\n`;
          systemPrompt += `- **Language**: ${project.language || 'Not specified'}\n`;
          systemPrompt += `- **Framework**: ${project.framework || 'Not specified'}\n`;
          systemPrompt += `- **Description**: ${project.description || 'No description'}\n\n`;
          systemPrompt += `**IMPORTANT WORKING DIRECTORY RULES:**\n`;
          systemPrompt += `1. ALL file operations (read, write, create, delete) must use paths relative to the project directory\n`;
          systemPrompt += `2. ALL commands (npm, git, etc.) will execute in the project directory\n`;
          systemPrompt += `3. When creating new applications/projects, use "${project.name}" as the app name\n`;
          systemPrompt += `4. Create all source files, folders, and assets in the project root directory\n`;
          systemPrompt += `5. For example: "src/", "public/", "dist/", "package.json" should be in project root\n`;
          systemPrompt += `6. The project directory is already created and ready for your files\n\n`;
        }
      } catch (error) {
        console.error('[ReAct] Failed to fetch project context:', error);
      }
    }
    
    // Add memory context if enabled
    if (agent.configuration?.memory?.enabled) {
      try {
        console.log('🧠 [ReAct] Fetching memory context for agent:', agent.id);
        const memoryContext = await this.memoryService.getMemoryContext(
          agent.id,
          conversationId,
          userMessage
        );
        
        if (memoryContext.totalMemories > 0) {
          systemPrompt += `\n\n## Memory Context\n${memoryContext.summary}\n`;
          
          if (memoryContext.recentInteractions.length > 0) {
            systemPrompt += `\nRecent interactions:\n`;
            memoryContext.recentInteractions.slice(0, 3).forEach((interaction: any) => {
              systemPrompt += `- ${interaction.summary || interaction.content}\n`;
            });
          }
          
          if (memoryContext.relevantLessons.length > 0) {
            systemPrompt += `\nLearned lessons:\n`;
            memoryContext.relevantLessons.slice(0, 3).forEach((lesson: any) => {
              systemPrompt += `- ${lesson.summary || lesson.content}\n`;
            });
          }
          
          console.log(`✅ [ReAct] Added ${memoryContext.totalMemories} memory items to context`);
        }
      } catch (error) {
        console.error('[ReAct] Failed to fetch memory context:', error);
      }
    }
    
    // Add knowledge base context if enabled
    if (agent.configuration?.knowledgeBase?.enabled) {
      try {
        console.log('📚 [ReAct] Fetching knowledge base context for query:', userMessage.substring(0, 50));
        const kbContext = await this.knowledgeService.getAgentKnowledgeContext(
          agent.id,
          userMessage,
          agent.configuration.knowledgeBase.retrievalTopK || 5
        );
        
        if (kbContext.relevantChunks.length > 0) {
          systemPrompt += `\n\n## Knowledge Base Context\n`;
          systemPrompt += `Retrieved ${kbContext.relevantChunks.length} relevant documents:\n\n`;
          
          kbContext.relevantChunks.forEach((chunk: any, index: number) => {
            systemPrompt += `### Document ${index + 1}\n`;
            systemPrompt += `${chunk.content}\n\n`;
          });
          
          console.log(`✅ [ReAct] Added ${kbContext.relevantChunks.length} knowledge base chunks to context`);
        }
      } catch (error) {
        console.error('[ReAct] Failed to fetch knowledge base context:', error);
      }
    }
    
    // Add ReAct pattern instructions for tool usage
    systemPrompt += '\n\nYou have access to workspace tools. Use them in a chain to complete complex tasks.\n\n';
    systemPrompt += 'CRITICAL: When using a tool, output ONLY the JSON - NO explanations, NO plans, NO other text.\n\n';
    systemPrompt += 'EXACT TOOL FORMAT (COPY EXACTLY):\n';
    systemPrompt += 'TOOL_CALL:\n';
    systemPrompt += '{\n';
    systemPrompt += '  "tool": "tool_name",\n';
    systemPrompt += '  "arguments": {\n';
    systemPrompt += '    "arg": "value"\n';
    systemPrompt += '  }\n';
    systemPrompt += '}\n\n';
    systemPrompt += 'CRITICAL JSON RULES:\n';
    systemPrompt += '- Start with TOOL_CALL: marker on its own line\n';
    systemPrompt += '- Use "tool" key for the tool name (string)\n';
    systemPrompt += '- Use "arguments" key for the parameters (object)\n';
    systemPrompt += '- ALL string values MUST have closing quotes\n';
    systemPrompt += '- ALL objects MUST have closing braces\n';
    systemPrompt += '- Use double quotes for keys and values (NOT single quotes)\n';
    systemPrompt += '- No trailing commas\n\n';
    systemPrompt += 'WRONG JSON EXAMPLES:\n';
    systemPrompt += '❌ {"tool": "write_file", "arguments": {"path": "app.js}  (missing closing quote)\n';
    systemPrompt += '❌ {\'tool\': \'write_file\'}  (single quotes)\n';
    systemPrompt += '❌ {"tool": "list_files",}  (trailing comma)\n';
    systemPrompt += '❌ {"tool": "write_file", "arguments": {"path": "app.js"  (missing closing brace)\n\n';
    systemPrompt += 'CORRECT JSON EXAMPLES:\n';
    systemPrompt += '✅ TOOL_CALL:\n{"tool": "create_directory", "arguments": {"path": "src"}}\n\n';
    systemPrompt += '✅ TOOL_CALL:\n{"tool": "list_files", "arguments": {"path": "."}}\n\n';
    systemPrompt += '✅ TOOL_CALL:\n{"tool": "write_file", "arguments": {"path": "app.js", "content": "console.log(\'hello\');"}}\n\n';
    systemPrompt += 'Available tools:\n';
    systemPrompt += '- get_workspace_summary: Get comprehensive workspace analysis. Args: {}\n';
    systemPrompt += '- list_files: List files/folders. Args: {"path": "."}\n';
    systemPrompt += '- read_file: Read file contents. Args: {"path": "file.js"}\n';
    systemPrompt += '- write_file: Write files. Args: {"path": "file.js", "content": "..."}\n';
    systemPrompt += '- delete_file: Delete a file. Args: {"path": "file.js"}\n';
    systemPrompt += '- create_directory: Create directory. Args: {"path": "src"}\n';
    systemPrompt += '- execute_command: Run commands. Args: {"command": "npm install"}\n\n';
    systemPrompt += 'MULTI-STEP REASONING:\n';
    systemPrompt += '1. ALWAYS check workspace context first (use list_files or get_workspace_summary)\n';
    systemPrompt += '2. Use tools in sequence to gather information and perform actions\n';
    systemPrompt += '3. After each tool result, decide: need more tools OR ready to answer\n';
    systemPrompt += '4. For file operations (delete, update, read), verify the file exists first\n';
    systemPrompt += '5. Only provide final answer when you have all needed information\n\n';
    systemPrompt += 'EFFICIENCY RULES:\n';
    systemPrompt += '- NEVER call the same tool twice with the same arguments\n';
    systemPrompt += '- Review what data you already have before requesting more\n';
    systemPrompt += '- Prefer answering with available information over gathering more data\n';
    systemPrompt += '- Maximum 5 tool calls per question - be efficient\n\n';
    systemPrompt += 'REMEMBER: Tool call = JSON with TOOL_CALL: marker ONLY. Final answer = text ONLY. Never mix them.';
    
    return systemPrompt;
  }

  private shouldUseReAct(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    
    // Use ReACT ONLY for tasks that REQUIRE tool usage
    // ReACT is for multi-step tasks that need:
    // - Reading/analyzing workspace files
    // - Making code modifications
    // - Creating new files
    // - Running commands
    
    // Simple conversational queries should NOT use ReACT
    // Examples that should NOT trigger ReACT:
    // - "what is react?" (general knowledge)
    // - "explain how to..." (explanation)
    // - "tell me about javascript" (general info)
    
    // Keywords that indicate ReACT should be used (workspace/file operations)
    const reactKeywords = [
      // Workspace information gathering (requires file access)
      'what files', 'what is in the', 'show me the code', 'show me the file',
      'list files', 'list the files', 'workspace summary', 'project structure', 'file structure',
      'read the file', 'check the file', 'look at the file',
      // Modification tasks (requires file operations)
      'update the', 'modify the', 'change the', 'edit the', 'add to', 'remove from', 'delete the',
      'fix the', 'improve the', 'refactor the', 'enhance the',
      // Creation tasks (requires file creation)
      'create a file', 'create a component', 'build a', 'make a file', 'generate a file',
      'setup the', 'initialize the', 'implement in', 'write to file',
      // Command execution
      'run the', 'execute the', 'install', 'npm', 'git commit', 'git status'
    ];
    
    const shouldUse = reactKeywords.some(keyword => lowerMessage.includes(keyword));
    console.log(`🔍 ReACT decision for "${userMessage.substring(0, 50)}...": ${shouldUse}`);
    
    return shouldUse;
  }

  private async callOllamaAPIWithReAct(
    userMessage: string,
    model: string,
    conversation: Conversation,
  ): Promise<void> {
    const isVerbose = process.env.VERBOSE_LOGGING === 'true';
    console.log(`🤖 ReAct: Starting for message: "${userMessage.substring(0, 100)}..."`);
    
    try {
      // Get system prompt with project context
      const systemPrompt = await this.buildSystemPrompt(conversation.agent, conversation.id, userMessage, conversation);
      console.log(`📝 ReAct: System prompt length: ${systemPrompt.length} chars`);
      
      // Get conversation history
      const messages = await this.messagesRepository.find({
        where: { conversationId: conversation.id },
        order: { id: 'ASC' },
        take: 20,
      });
      
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Get Ollama URL
      const ollamaUrl = process.env.OLLAMA_HOST || process.env.OLLAMA_API_URL || 'http://localhost:11434';
      console.log(`🌐 ReAct: Using Ollama at ${ollamaUrl}`);
      
      // Create a temporary message to show progress
      const tempMessage = this.messagesRepository.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: '🔄 Analyzing workspace...',
        metadata: { model, streaming: true },
      });
      const savedTempMessage = await this.messagesRepository.save(tempMessage);
      
      // Execute ReAct loop with progress updates
      // Workspace (with projectId) gets more iterations for complex tool chains
      const maxIterations = conversation.projectId ? 10 : 2;
      const workingDir = await this.getWorkingDirectory(conversation);
      console.log(`⚙️ ReAct: Calling executeReActLoop with model ${model} (max ${maxIterations} iterations for ${conversation.projectId ? 'workspace' : 'chat'}, workingDir: ${workingDir})`);
      const result = await this.reactAgentService.executeReActLoop(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl,
        conversationHistory,
        conversation.id,
        (status: string) => {
          // Broadcast progress via WebSocket
          this.websocketGateway.broadcastMessageUpdate(
            conversation.id,
            savedTempMessage.id,
            status,
            true,
            { streaming: true, progress: true }
          );
        },
        maxIterations,
        // Tool execution callback - save memory after each tool
        async (toolName: string, toolResult: any, observation: string) => {
          if (conversation.agent?.configuration?.memory?.enabled) {
            // Save tool execution to short-term memory (async, non-blocking)
            this.saveToolExecutionMemory(
              conversation.agentId,
              conversation.id,
              toolName,
              toolResult,
              observation,
              model
            ).catch(err => console.error('Failed to save tool memory:', err));
          }
        },
        workingDir
      );
      
      // Update the temporary message with final response
      console.log(`💾 ReAct: Saving final answer (${result.finalAnswer.length} chars, ${result.toolsUsed.length} tools used)`);
      await this.messagesRepository.update(savedTempMessage.id, {
        content: result.finalAnswer,
        metadata: { model, toolsUsed: result.toolsUsed, steps: result.steps, streaming: false } as any,
      });
      
      // Broadcast final update
      this.websocketGateway.broadcastMessageUpdate(
        conversation.id,
        savedTempMessage.id,
        result.finalAnswer,
        false,
        { model, toolsUsed: result.toolsUsed, streaming: false }
      );
      
      console.log(`✅ ReAct completed successfully with ${result.toolsUsed.length} tools used`);
      if (isVerbose) {
        console.log(`📊 ReAct details:`, { toolsUsed: result.toolsUsed, stepsCount: result.steps.length });
      }
      
      // Store final conversation summary in memory and consolidate to long-term
      if (conversation.agent?.configuration?.memory?.enabled) {
        try {
          // Save conversation to short-term memory first (will be consolidated to long-term later)
          const summary = `Conversation: ${userMessage.substring(0, 100)}...`;
          const details = `User: ${userMessage}\n\nAgent: ${result.finalAnswer}\n\nTools used: ${result.toolsUsed.join(', ')}`;
          
          await this.memoryService.createMemory({
            agentId: conversation.agentId,
            sessionId: conversation.id,
            type: 'short-term',
            category: 'interaction',
            content: `${summary}\n\n${details}`,
            importance: result.toolsUsed.length > 0 ? 0.8 : 0.5,
            metadata: {
              tags: [model, 'ollama', 'react', 'conversation'],
              keywords: result.toolsUsed.length > 0 ? ['tool-usage', ...result.toolsUsed] : ['conversation'],
              confidence: 1.0,
              relevance: 1.0,
              source: 'conversation' as any
            }
          });
          console.log('✅ Stored ReAct conversation in short-term memory');
        } catch (error) {
          console.error('Failed to store ReAct interaction in memory:', error);
        }
      }
    } catch (error) {
      console.error('❌ ReAct execution failed:', error);
      throw error;
    }
  }

  private getOllamaUnavailableMessage(userMessage: string): string {
    return `🤖 **Local Development Mode**

I'm unable to connect to the Ollama service, which is expected in local environments without GPU support.

**Your message:** "${userMessage}"

**To enable AI responses:**
1. **Use external APIs:** Configure OpenAI or Anthropic API keys in your environment
2. **Install Ollama locally:** Visit https://ollama.ai and install Ollama with CPU support
3. **Use Gitpod:** The full AI functionality works in Gitpod environments

**Available features without AI:**
- ✅ Create and manage conversations
- ✅ Store message history
- ✅ Agent configuration
- ✅ Project management

Would you like help setting up external API access?`;
  }

  private async callOllamaAPIStreaming(userMessage: string, model: string, conversation: any): Promise<string> {
    // Get workspace configuration from agent
    const workspaceConfig = conversation.agent?.configuration?.workspace || {
      enableActions: true,
      enableContext: true
    };
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const apiUrl = `${ollamaUrl}/api/chat`;
      console.log('Calling Ollama API (streaming):', apiUrl, 'with model:', model);
      
      // Create initial agent message that will be updated
      const agentMessageData = {
        conversationId: conversation.id,
        role: 'agent',
        content: '🤖 *Thinking...*',
        metadata: {
          generatedAt: new Date().toISOString(),
          model: model,
          provider: 'ollama',
          streaming: true
        }
      };

      const agentMessage = this.messagesRepository.create(agentMessageData);
      const savedMessage = await this.messagesRepository.save(agentMessage);
      
      // Add timeout for streaming responses
      const controller = new AbortController();
      const STREAMING_TIMEOUT = 120000; // 120 second timeout (increased for large models)
      const timeoutId = setTimeout(() => {
        console.error(`⏱️ Streaming timeout after ${STREAMING_TIMEOUT/1000}s - aborting`);
        controller.abort();
      }, STREAMING_TIMEOUT);
      
      // Register this generation for potential stopping
      this.activeGenerations.set(savedMessage.id, {
        abortController: controller,
        messageId: savedMessage.id
      });
      
      // Get available MCP tools for tool calling
      // Only enable tools for models that support function calling
      const modelSupportsTools = this.modelSupportsToolCalling(model);
      let availableTools = modelSupportsTools ? await this.mcpService.getAvailableTools() : [];
      
      // Filter tools based on workspace configuration
      if (availableTools.length > 0) {
        const actionTools = ['execute_command', 'write_file', 'create_directory', 'git_commit', 'delete_file'];
        const contextTools = ['read_file', 'list_files', 'git_status'];
        
        availableTools = availableTools.filter(tool => {
          if (actionTools.includes(tool)) {
            return workspaceConfig.enableActions;
          }
          if (contextTools.includes(tool)) {
            return workspaceConfig.enableContext;
          }
          return true; // Allow other tools
        });
      }
      const toolsForOllama = availableTools.map(toolName => ({
        type: 'function',
        function: {
          name: toolName,
          description: this.getToolDescription(toolName),
          parameters: this.getToolParameters(toolName)
        }
      }));

      // Log tool configuration for debugging
      console.log(`Model: ${model}, Supports tools: ${modelSupportsTools} (using prompt-based tool calling)`);
      console.log(`Workspace config - Actions: ${workspaceConfig.enableActions}, Context: ${workspaceConfig.enableContext}`);

      // Build system prompt based on workspace configuration
      let systemPrompt = '';
      
      if (modelSupportsTools && (workspaceConfig.enableActions || workspaceConfig.enableContext)) {
        systemPrompt = `You are a helpful coding assistant with REAL workspace access. You can EXECUTE commands and CREATE files.

CRITICAL RULE: When you decide to use a tool, output ONLY the JSON tool call - NO explanations, NO plans, NO other text.

## EXACT Tool Call Format (COPY THIS EXACTLY):
TOOL_CALL:
{
  "tool": "tool_name_here",
  "arguments": {
    "arg": "value"
  }
}

IMPORTANT: 
- Start with TOOL_CALL: marker
- Use "tool" key for tool name
- Use "arguments" key for parameters
- Close ALL quotes and braces properly

## WRONG Examples:
❌ {"tool": "write_file", "arguments": {"path": "app.js}  (missing closing quote)
❌ {"tool": "list_files",}  (trailing comma)
❌ "Let's start by... TOOL_CALL: ..." (text before JSON)

## CORRECT Examples:
✅ TOOL_CALL:
{"tool": "list_files", "arguments": {"path": "."}}

✅ TOOL_CALL:
{"tool": "write_file", "arguments": {"path": "App.jsx", "content": "..."}}

Available tools:`;

        // Add context tools if enabled
        if (workspaceConfig.enableContext) {
          systemPrompt += `
- read_file: Read file contents. Args: {"path": "file.js"}
- list_files: List directory contents. Args: {"path": "."}
- git_status: Check git status. Args: {}`;
        }

        // Add action tools if enabled
        if (workspaceConfig.enableActions) {
          systemPrompt += `
- execute_command: Run shell commands (npm, git, etc). Args: {"command": "npm create vite@latest"}
- write_file: Write/create file with content. Args: {"path": "src/App.jsx", "content": "..."}
- create_directory: Create directory. Args: {"path": "src/components"}
- git_commit: Commit changes. Args: {"message": "Initial commit", "files": ["."]}
- delete_file: Delete file. Args: {"path": "file.js"}`;
        }

        systemPrompt += `

Critical Rules:
1. For GENERAL QUESTIONS (explanations, concepts, how-to): Answer directly without tools
2. For WORKSPACE TASKS (create/read/modify files, run commands): Use tools
3. When user asks to CREATE/BUILD a project → Use execute_command
4. When user asks to CREATE/WRITE files → Use write_file with the actual content
5. When user asks to UPDATE/MODIFY existing code → Use read_file first, then write_file
6. After using a tool, CONTINUE using more tools until the task is complete
7. If a tool fails, try a different approach - DON'T give up
8. For complex tasks, use MULTIPLE tools in sequence (read → modify → write)

Examples:
- "Why is the sky blue?" → Answer directly (no tools needed)
- "Explain React hooks" → Answer directly (no tools needed)
- "Create a React component" → Use write_file tool
- "What files are in the project?" → Use list_files tool`;

        // Add note about disabled permissions
        if (!workspaceConfig.enableContext && !workspaceConfig.enableActions) {
          systemPrompt += `

NOTE: No workspace tools enabled. Provide suggestions only.`;
        } else if (!workspaceConfig.enableContext) {
          systemPrompt += `

NOTE: Context disabled. Cannot read files or list directories.`;
        } else if (!workspaceConfig.enableActions) {
          systemPrompt += `

NOTE: Actions disabled. Can read files but cannot modify or execute commands.`;
        }
      } else {
        systemPrompt = `You are a helpful coding assistant. Provide clear, concise, and accurate responses. When writing code, include explanations and best practices.

NOTE: You have no workspace tools available. You can only provide suggestions and code examples.`;
      }

      // Add memory context if enabled
      if (conversation.agent?.configuration?.memory?.enabled) {
        try {
          console.log('🧠 Fetching memory context for agent:', conversation.agentId);
          const memoryContext = await this.memoryService.getMemoryContext(
            conversation.agentId,
            conversation.id,
            userMessage
          );
          
          if (memoryContext.totalMemories > 0) {
            systemPrompt += `\n\n## Memory Context\n${memoryContext.summary}\n`;
            
            // Add recent interactions
            if (memoryContext.recentInteractions.length > 0) {
              systemPrompt += `\nRecent interactions:\n`;
              memoryContext.recentInteractions.slice(0, 3).forEach((interaction: any) => {
                systemPrompt += `- ${interaction.summary || interaction.content}\n`;
              });
            }
            
            // Add relevant lessons
            if (memoryContext.relevantLessons.length > 0) {
              systemPrompt += `\nLearned lessons:\n`;
              memoryContext.relevantLessons.slice(0, 3).forEach((lesson: any) => {
                systemPrompt += `- ${lesson.summary || lesson.content}\n`;
              });
            }
            
            console.log(`✅ Added ${memoryContext.totalMemories} memory items to context`);
          }
        } catch (error) {
          console.error('Failed to fetch memory context:', error);
          // Continue without memory context
        }
      }
      
      // Add knowledge base context if enabled
      if (conversation.agent?.configuration?.knowledgeBase?.enabled) {
        try {
          console.log('📚 Fetching knowledge base context for query:', userMessage.substring(0, 50));
          const kbContext = await this.knowledgeService.getAgentKnowledgeContext(
            conversation.agentId,
            userMessage,
            conversation.agent.configuration.knowledgeBase.retrievalTopK || 5
          );
          
          if (kbContext.relevantChunks.length > 0) {
            systemPrompt += `\n\n## Knowledge Base Context\n`;
            systemPrompt += `Retrieved ${kbContext.relevantChunks.length} relevant documents:\n\n`;
            
            kbContext.relevantChunks.forEach((chunk: any, index: number) => {
              systemPrompt += `### Document ${index + 1}\n`;
              systemPrompt += `${chunk.content}\n\n`;
            });
            
            console.log(`✅ Added ${kbContext.relevantChunks.length} knowledge base chunks to context`);
          }
        } catch (error) {
          console.error('Failed to fetch knowledge base context:', error);
          // Continue without KB context
        }
      }

      const fetchStartTime = Date.now();
      console.log(`📡 Sending request to Ollama at ${new Date().toISOString()}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          stream: true,
          // Don't send tools parameter - use prompt-based approach instead
          options: {
            temperature: 0.3,
            top_p: 0.8,
            num_predict: 1024
          },
          keep_alive: "5m" // Keep model loaded for 5 minutes
        }),
        signal: controller.signal,
      });

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`📡 Received response headers from Ollama in ${fetchDuration}ms`);
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      let fullContent = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const toolsUsed: string[] = [];

      if (!reader) {
        throw new Error('No response body reader available');
      }

      try {
        let hasReceivedData = false;
        const startTime = Date.now();
        let chunkCount = 0;
        
        console.log(`🚀 Starting streaming response for conversation ${conversation.id}`);
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            const duration = Date.now() - startTime;
            console.log(`✅ Streaming completed in ${duration}ms, total content length: ${fullContent.length}, chunks: ${chunkCount}`);
            break;
          }
          
          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());
          
          if (chunkCount === 1) {
            const timeToFirstChunk = Date.now() - startTime;
            console.log(`⚡ First chunk received after ${timeToFirstChunk}ms`);
          }
          
          if (chunkCount % 10 === 0) {
            const elapsed = Date.now() - startTime;
            console.log(`📊 Streaming progress: ${chunkCount} chunks, ${fullContent.length} chars, ${elapsed}ms elapsed`);
          }
          
          for (const line of lines) {
            try {
              const data = parseJSON(line);
              if (!data) continue;
              hasReceivedData = true;
              
              // Handle tool calls from Ollama
              if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
                console.log(`🔧 Received ${data.message.tool_calls.length} tool call(s) from Ollama:`, JSON.stringify(data.message.tool_calls, null, 2));
                
                for (const toolCall of data.message.tool_calls) {
                  const toolName = toolCall.function?.name;
                  const toolArgs = toolCall.function?.arguments;
                  
                  if (toolName && toolArgs) {
                    console.log(`Executing tool: ${toolName} with args:`, toolArgs);
                    
                    // Track tool usage
                    if (!toolsUsed.includes(toolName)) {
                      toolsUsed.push(toolName);
                    }
                    
                    // Broadcast tool execution start
                    this.websocketGateway.broadcastAgentActivity({
                      conversationId: conversation.id,
                      type: this.getActivityTypeFromTool(toolName),
                      description: `Executing: ${toolName}`,
                      tool: toolName,
                      parameters: toolArgs,
                      status: 'in_progress'
                    });
                    
                    // Get working directory for project context
                    const workingDir = await this.getWorkingDirectory(conversation);
                    
                    // Execute the tool via MCP service with project working directory
                    const toolResult = await this.mcpService.executeTool({
                      name: toolName,
                      arguments: toolArgs
                    }, workingDir);
                    
                    // Broadcast tool execution result
                    this.websocketGateway.broadcastAgentActivity({
                      conversationId: conversation.id,
                      type: this.getActivityTypeFromTool(toolName),
                      description: toolResult.success ? `Completed: ${toolName}` : `Failed: ${toolName}`,
                      tool: toolName,
                      parameters: toolArgs,
                      result: toolResult.result,
                      status: toolResult.success ? 'completed' : 'failed'
                    });
                    
                    // Add tool result to content
                    const resultToShow = toolResult.result !== undefined ? toolResult.result : { error: 'No result returned' };
                    const toolResultText = `\n\n**Tool Executed: ${toolName}**\n\`\`\`json\n${JSON.stringify(resultToShow, null, 2)}\n\`\`\`\n`;
                    fullContent += toolResultText;
                  }
                }
              }
              
              if (data.message?.content) {
                fullContent += data.message.content;
                
                // Always emit WebSocket updates for real-time streaming (no delay)
                this.websocketGateway.broadcastMessageUpdate(
                  conversation.id,
                  savedMessage.id,
                  fullContent,
                  !data.done,
                  {
                    ...agentMessageData.metadata,
                    streaming: !data.done,
                    lastUpdate: new Date().toISOString()
                  }
                );
                
                // Queue database updates for batch processing (much less frequent)
                // Only update every 1000 characters or when done to reduce DB load
                const shouldQueueUpdate = fullContent.length % 1000 === 0 || data.done;
                
                if (shouldQueueUpdate) {
                  // Try direct update first, fallback to queue if needed
                  try {
                    await this.messagesRepository.update(savedMessage.id, {
                      content: fullContent,
                      metadata: {
                        ...agentMessageData.metadata,
                        streaming: !data.done,
                        lastUpdate: new Date().toISOString()
                      } as Record<string, any>
                    });
                  } catch (updateError) {
                    console.log('Direct update failed, queuing for batch:', updateError.message);
                    this.queueMessageUpdate(
                      savedMessage.id,
                      fullContent,
                      {
                        ...agentMessageData.metadata,
                        streaming: !data.done,
                        lastUpdate: new Date().toISOString()
                      }
                    );
                  }
                }
              }
              
              if (data.done) {
                console.log('Received done signal, finalizing response');
                const finalContent = fullContent || 'I apologize, but I was unable to generate a response at this time.';
                const finalMetadata = {
                  ...agentMessageData.metadata,
                  streaming: false,
                  completed: true,
                  responseTime: Date.now() - startTime,
                  finalUpdate: new Date().toISOString()
                };
                
                // Emit final WebSocket update immediately
                this.websocketGateway.broadcastMessageUpdate(
                  conversation.id,
                  savedMessage.id,
                  finalContent,
                  false,
                  finalMetadata
                );
                
                // Direct final database update for immediate completion
                try {
                  await this.messagesRepository.update(savedMessage.id, {
                    content: finalContent,
                    metadata: finalMetadata as Record<string, any>
                  });
                } catch (updateError) {
                  console.log('Final direct update failed, queuing:', updateError.message);
                  this.queueMessageUpdate(savedMessage.id, finalContent, finalMetadata);
                  await this.processPendingUpdates();
                }
                
                // Parse and execute tool calls from the response
                await this.parseAndExecuteToolCalls(finalContent, conversation, savedMessage);
                
                // Store interaction in memory if enabled
                await this.storeInteractionMemory(conversation, userMessage, finalContent, model, toolsUsed);
                
                return finalContent;
              }
            } catch (parseError) {
              console.log('Failed to parse streaming chunk:', line);
            }
          }
          
          // Safety check for hanging streams
          if (Date.now() - startTime > 50000 && !hasReceivedData) {
            console.log('Stream timeout - no data received');
            throw new Error('Stream timeout - no data received');
          }
        }
        
        // If we exit the loop without done=true, finalize anyway
        if (fullContent) {
          const finalMetadata = {
            ...agentMessageData.metadata,
            streaming: false,
            completed: true,
            responseTime: Date.now() - startTime,
            finalUpdate: new Date().toISOString()
          };
          
          // Emit final WebSocket update
          this.websocketGateway.broadcastMessageUpdate(
            conversation.id,
            savedMessage.id,
            fullContent,
            false,
            finalMetadata
          );
          
          // Direct final database update
          try {
            await this.messagesRepository.update(savedMessage.id, {
              content: fullContent,
              metadata: finalMetadata as Record<string, any>
            });
          } catch (updateError) {
            console.log('Final fallback update failed, queuing:', updateError.message);
            this.queueMessageUpdate(savedMessage.id, fullContent, finalMetadata);
            await this.processPendingUpdates();
          }
          
          // Store interaction in memory if enabled
          await this.storeInteractionMemory(conversation, userMessage, fullContent, model, toolsUsed);
        }
      } finally {
        reader.releaseLock();
        // Clean up the active generation
        this.activeGenerations.delete(savedMessage.id);
      }

      return fullContent || 'I apologize, but I was unable to generate a response at this time.';
    } catch (error) {
      console.error('Error calling Ollama streaming API:', error);
      throw error; // Re-throw to be handled by caller
    }
  }

  private async callOllamaAPI(userMessage: string, model: string): Promise<string> {
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const apiUrl = `${ollamaUrl}/api/chat`;
      console.log('Calling Ollama API (non-streaming):', apiUrl, 'with model:', model);
      
      // Add timeout for local environments where Ollama might not be available
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for AI responses
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful coding assistant. Provide clear, concise, and accurate responses. When writing code, include explanations and best practices.'
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.8,
            num_predict: 512
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || 'I apologize, but I was unable to generate a response at this time.';
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      
      // Provide helpful fallback message for local environments
      if (error.name === 'AbortError' || 
          error.message.includes('404') || 
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('fetch failed') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ECONNRESET')) {
        return `🤖 **Local Development Mode**

I'm unable to connect to the Ollama service, which is expected in local environments without GPU support.

**Your message:** "${userMessage}"

**To enable AI responses:**
1. **Use external APIs:** Configure OpenAI or Anthropic API keys in your environment
2. **Install Ollama locally:** Visit https://ollama.ai and install Ollama with CPU support
3. **Use Gitpod:** The full AI functionality works in Gitpod environments

**Available features without AI:**
- ✅ Create and manage conversations
- ✅ Store message history
- ✅ Agent configuration
- ✅ Project management

Would you like help setting up external API access?`;
      }
      
      return `I apologize, but I encountered an error while processing your request. Please try again later. (Error: ${error.message})`;
    }
  }

  private async callExternalLLMAPI(userMessage: string, model: string, conversation: any): Promise<string> {
    // Use streaming version for better UX
    await this.callExternalLLMAPIStreaming(userMessage, model, conversation);
    return ''; // Streaming handles message creation
  }

  private async callExternalLLMAPIStreaming(userMessage: string, model: string, conversation: any): Promise<void> {
    const workspaceConfig = conversation.agent?.configuration?.workspace || {
      enableActions: true,
      enableContext: true
    };
    
    try {
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://llm-service:9000';
      
      // Get userId from conversation
      const userId = conversation.userId;
      
      if (!userId) {
        throw new Error('User ID not found in conversation');
      }
      
      const url = `${llmServiceUrl}/api/chat?userId=${userId}`;
      console.log('[ConversationsService] Calling external LLM service (streaming):', url, 'model:', model);
      
      // Create initial agent message that will be updated
      const agentMessageData = {
        conversationId: conversation.id,
        role: 'agent',
        content: '🤖 *Thinking...*',
        metadata: {
          generatedAt: new Date().toISOString(),
          model: model,
          provider: 'external',
          streaming: true
        }
      };

      const agentMessage = this.messagesRepository.create(agentMessageData);
      const savedMessage = await this.messagesRepository.save(agentMessage);
      
      // Add timeout for streaming responses
      const controller = new AbortController();
      const STREAMING_TIMEOUT = 120000; // 120 second timeout
      const timeoutId = setTimeout(() => {
        console.error(`⏱️ External LLM streaming timeout after ${STREAMING_TIMEOUT/1000}s - aborting`);
        controller.abort();
      }, STREAMING_TIMEOUT);
      
      // Register this generation for potential stopping
      this.activeGenerations.set(savedMessage.id, {
        abortController: controller,
        messageId: savedMessage.id
      });
      
      // Get available MCP tools for tool calling
      const modelSupportsTools = this.modelSupportsToolCalling(model);
      let availableTools = modelSupportsTools ? await this.mcpService.getAvailableTools() : [];
      
      // Filter tools based on workspace configuration
      if (availableTools.length > 0) {
        const actionTools = ['execute_command', 'write_file', 'create_directory', 'git_commit', 'delete_file'];
        const contextTools = ['read_file', 'list_files', 'git_status'];
        
        availableTools = availableTools.filter(tool => {
          if (actionTools.includes(tool)) {
            return workspaceConfig.enableActions;
          }
          if (contextTools.includes(tool)) {
            return workspaceConfig.enableContext;
          }
          return true;
        });
      }

      // Build system prompt based on workspace configuration and agent settings
      let systemPrompt = conversation.agent?.configuration?.systemPrompt || 'You are a helpful coding assistant.';
      
      if (modelSupportsTools && (workspaceConfig.enableActions || workspaceConfig.enableContext)) {
        systemPrompt += `\n\n## CRITICAL: You have REAL workspace access. When you use a tool, output ONLY the JSON - NO explanations.

## EXACT Tool Call Format (COPY EXACTLY):
TOOL_CALL:
{
  "tool": "tool_name_here",
  "arguments": {
    "arg": "value"
  }
}

IMPORTANT:
- Start with TOOL_CALL: marker
- Use "tool" key for tool name
- Use "arguments" key for parameters
- Close ALL quotes and braces

## WRONG:
❌ {"tool": "write_file", "arguments": {"path": "app.js}  (missing quote)
❌ "Let's create... TOOL_CALL: ..." (text before JSON)

## CORRECT:
✅ TOOL_CALL:
{"tool": "list_files", "arguments": {"path": "."}}

## Available Tools:`;
        
        // Add context tools if enabled
        if (workspaceConfig.enableContext) {
          systemPrompt += `\n- read_file: Read file contents. Args: {"path": "file.js"}`;
          systemPrompt += `\n- list_files: List directory contents. Args: {"path": "."}`;
          systemPrompt += `\n- git_status: Check git status. Args: {}`;
        }

        // Add action tools if enabled
        if (workspaceConfig.enableActions) {
          systemPrompt += `\n- execute_command: Run shell commands (npm, git, etc). Args: {"command": "npm create vite@latest"}`;
          systemPrompt += `\n- write_file: Write/create file with content. Args: {"path": "src/App.jsx", "content": "..."}`;
          systemPrompt += `\n- create_directory: Create directory. Args: {"path": "src/components"}`;
          systemPrompt += `\n- git_commit: Commit changes. Args: {"message": "Initial commit", "files": ["."]}`;
          systemPrompt += `\n- delete_file: Delete file. Args: {"path": "file.js"}`;
        }

        systemPrompt += `\n\n## Critical Rules:
1. When user asks to CREATE/BUILD a project → IMMEDIATELY use execute_command (DO NOT check workspace first)
2. When user asks to CREATE/WRITE files → IMMEDIATELY use write_file with the actual content
3. When user asks about existing files → Use list_files or read_file
4. ALWAYS use tools to perform actions - NEVER just give instructions
5. After using a tool, wait for results before responding
6. DO NOT check workspace or list files before creating a project - just create it directly
7. If creating a project, use the appropriate command:
   - Vite React: npm create vite@latest project-name -- --template react
   - Next.js: npx create-next-app@latest project-name --yes
   - React: npx create-react-app project-name

## Example Workflows:
User: "Create a React app with Vite named my-app"
You: TOOL_CALL:
{"tool": "execute_command", "arguments": {"command": "npm create vite@latest my-app -- --template react"}}

User: "What files are in the workspace?"
You: TOOL_CALL:
{"tool": "list_files", "arguments": {"path": "."}}`;
      }
      
      // Get conversation history for context
      const messages = await this.messagesRepository.find({
        where: { conversationId: conversation.id },
        order: { id: 'ASC' },
        take: 20,
      });
      
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'agent' ? 'assistant' : msg.role,
        content: msg.content,
      }));
      
      // Add memory context if enabled
      if (conversation.agent?.configuration?.memory?.enabled) {
        try {
          console.log('🧠 Fetching memory context for agent:', conversation.agentId);
          const memoryContext = await this.memoryService.getMemoryContext(
            conversation.agentId,
            conversation.id,
            userMessage
          );
          
          if (memoryContext.totalMemories > 0) {
            systemPrompt += `\n\n## Memory Context\n${memoryContext.summary}\n`;
            
            // Add recent interactions
            if (memoryContext.recentInteractions.length > 0) {
              systemPrompt += `\nRecent interactions:\n`;
              memoryContext.recentInteractions.slice(0, 3).forEach((interaction: any) => {
                systemPrompt += `- ${interaction.summary || interaction.content}\n`;
              });
            }
            
            // Add relevant lessons
            if (memoryContext.relevantLessons.length > 0) {
              systemPrompt += `\nLearned lessons:\n`;
              memoryContext.relevantLessons.slice(0, 3).forEach((lesson: any) => {
                systemPrompt += `- ${lesson.summary || lesson.content}\n`;
              });
            }
            
            console.log(`✅ Added ${memoryContext.totalMemories} memory items to context`);
          }
        } catch (error) {
          console.error('Failed to fetch memory context:', error);
          // Continue without memory context
        }
      }
      
      // Add knowledge base context if enabled
      if (conversation.agent?.configuration?.knowledgeBase?.enabled) {
        try {
          console.log('📚 Fetching knowledge base context for query:', userMessage.substring(0, 50));
          const kbContext = await this.knowledgeService.getAgentKnowledgeContext(
            conversation.agentId,
            userMessage,
            conversation.agent.configuration.knowledgeBase.retrievalTopK || 5
          );
          
          if (kbContext.relevantChunks.length > 0) {
            systemPrompt += `\n\n## Knowledge Base Context\n`;
            systemPrompt += `Retrieved ${kbContext.relevantChunks.length} relevant documents:\n\n`;
            
            kbContext.relevantChunks.forEach((chunk: any, index: number) => {
              systemPrompt += `### Document ${index + 1}\n`;
              systemPrompt += `${chunk.content}\n\n`;
            });
            
            console.log(`✅ Added ${kbContext.relevantChunks.length} knowledge base chunks to context`);
          }
        } catch (error) {
          console.error('Failed to fetch knowledge base context:', error);
          // Continue without KB context
        }
      }

      const fetchStartTime = Date.now();
      console.log(`📡 Sending streaming request to external LLM at ${new Date().toISOString()}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            ...conversationHistory,
            {
              role: 'user',
              content: userMessage
            }
          ],
          stream: true,
          temperature: conversation.agent?.configuration?.temperature || 0.7,
          max_tokens: conversation.agent?.configuration?.maxTokens || 1000
        }),
        signal: controller.signal,
      });

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`📡 Received response headers from external LLM in ${fetchDuration}ms`);
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `LLM service error: ${response.status}`);
      }

      let fullContent = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const toolsUsed: string[] = [];

      if (!reader) {
        throw new Error('No response body reader available');
      }

      try {
        let hasReceivedData = false;
        const startTime = Date.now();
        let chunkCount = 0;
        
        console.log(`🚀 Starting streaming response for conversation ${conversation.id}`);
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            const duration = Date.now() - startTime;
            console.log(`✅ External LLM streaming completed in ${duration}ms, total content length: ${fullContent.length}, chunks: ${chunkCount}`);
            break;
          }
          
          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());
          
          if (chunkCount === 1) {
            const timeToFirstChunk = Date.now() - startTime;
            console.log(`⚡ First chunk received after ${timeToFirstChunk}ms`);
          }
          
          for (const line of lines) {
            try {
              // Handle SSE format
              if (line.startsWith('data: ')) {
                const data = parseJSON(line.substring(6));
                if (!data) continue;
                hasReceivedData = true;
                
                if (data.content) {
                  fullContent += data.content;
                  
                  // Always emit WebSocket updates for real-time streaming
                  this.websocketGateway.broadcastMessageUpdate(
                    conversation.id,
                    savedMessage.id,
                    fullContent,
                    !data.done,
                    {
                      ...agentMessageData.metadata,
                      streaming: !data.done,
                      lastUpdate: new Date().toISOString()
                    }
                  );
                  
                  // Queue database updates for batch processing
                  const shouldQueueUpdate = fullContent.length % 1000 === 0 || data.done;
                  
                  if (shouldQueueUpdate) {
                    try {
                      await this.messagesRepository.update(savedMessage.id, {
                        content: fullContent,
                        metadata: {
                          ...agentMessageData.metadata,
                          streaming: !data.done,
                          lastUpdate: new Date().toISOString()
                        } as Record<string, any>
                      });
                    } catch (updateError) {
                      console.log('Direct update failed, queuing for batch:', updateError.message);
                      this.queueMessageUpdate(
                        savedMessage.id,
                        fullContent,
                        {
                          ...agentMessageData.metadata,
                          streaming: !data.done,
                          lastUpdate: new Date().toISOString()
                        }
                      );
                    }
                  }
                }
                
                if (data.done) {
                  console.log('Received done signal, finalizing response');
                  const finalContent = fullContent || 'I apologize, but I was unable to generate a response at this time.';
                  const finalMetadata = {
                    ...agentMessageData.metadata,
                    streaming: false,
                    completed: true,
                    responseTime: Date.now() - startTime,
                    finalUpdate: new Date().toISOString()
                  };
                  
                  // Emit final WebSocket update immediately
                  this.websocketGateway.broadcastMessageUpdate(
                    conversation.id,
                    savedMessage.id,
                    finalContent,
                    false,
                    finalMetadata
                  );
                  
                  // Direct final database update
                  try {
                    await this.messagesRepository.update(savedMessage.id, {
                      content: finalContent,
                      metadata: finalMetadata as Record<string, any>
                    });
                  } catch (updateError) {
                    console.log('Final direct update failed, queuing:', updateError.message);
                    this.queueMessageUpdate(savedMessage.id, finalContent, finalMetadata);
                    await this.processPendingUpdates();
                  }
                  
                  // Parse and execute tool calls from the response
                  await this.parseAndExecuteToolCalls(finalContent, conversation, savedMessage);
                  
                  // Store interaction in memory if enabled
                  await this.storeInteractionMemory(conversation, userMessage, finalContent, model, []);
                  
                  return;
                }
              }
            } catch (parseError) {
              console.log('Failed to parse streaming chunk:', line);
            }
          }
        }
        
        // If we exit the loop without done=true, finalize anyway
        if (fullContent) {
          const finalMetadata = {
            ...agentMessageData.metadata,
            streaming: false,
            completed: true,
            responseTime: Date.now() - startTime,
            finalUpdate: new Date().toISOString()
          };
          
          // Emit final WebSocket update
          this.websocketGateway.broadcastMessageUpdate(
            conversation.id,
            savedMessage.id,
            fullContent,
            false,
            finalMetadata
          );
          
          // Direct final database update
          try {
            await this.messagesRepository.update(savedMessage.id, {
              content: fullContent,
              metadata: finalMetadata as Record<string, any>
            });
          } catch (updateError) {
            console.log('Final fallback update failed, queuing:', updateError.message);
            this.queueMessageUpdate(savedMessage.id, fullContent, finalMetadata);
            await this.processPendingUpdates();
          }
          
          // Parse and execute tool calls
          await this.parseAndExecuteToolCalls(fullContent, conversation, savedMessage);
          
          // Store interaction in memory if enabled
          await this.storeInteractionMemory(conversation, userMessage, fullContent, model, []);
        }
      } finally {
        reader.releaseLock();
        // Clean up the active generation
        this.activeGenerations.delete(savedMessage.id);
      }
    } catch (error) {
      console.error('Error calling external LLM streaming API:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const conversation = await this.findOne(id);
    await this.conversationsRepository.remove(conversation);
  }

  /**
   * Call external LLM API with ReAct pattern for tool-based queries
   */
  private async callExternalLLMAPIWithReAct(
    userMessage: string,
    model: string,
    conversation: any,
  ): Promise<void> {
    const isVerbose = process.env.VERBOSE_LOGGING === 'true';
    console.log(`🤖 ReAct (External LLM): Starting for message: "${userMessage.substring(0, 100)}..."`);
    
    try {
      // Get system prompt with project context
      const systemPrompt = await this.buildSystemPrompt(conversation.agent, conversation.id, userMessage, conversation);
      console.log(`📝 ReAct (External LLM): System prompt length: ${systemPrompt.length} chars`);
      
      // Get conversation history
      const messages = await this.messagesRepository.find({
        where: { conversationId: conversation.id },
        order: { id: 'ASC' },
        take: 20,
      });
      
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'agent' ? 'assistant' : msg.role,
        content: msg.content,
      }));
      
      // Get LLM service URL
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://llm-service:9000';
      const userId = conversation.userId;
      
      if (!userId) {
        throw new Error('User ID not found in conversation');
      }
      
      console.log(`🌐 ReAct (External LLM): Using LLM service at ${llmServiceUrl}`);
      
      // Create a temporary message to show progress
      const tempMessage = this.messagesRepository.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: '🤔 Planning approach...\n📋 Preparing to analyze your request (up to 5 steps)',
        metadata: { model, streaming: true, provider: 'external' },
      });
      const savedTempMessage = await this.messagesRepository.save(tempMessage);
      
      // Execute ReAct loop with external LLM
      // Workspace (with projectId) gets more iterations for complex tool chains
      const maxIterations = conversation.projectId ? 10 : 2;
      console.log(`⚙️ ReAct (External LLM): Starting ReAct loop with model ${model} (max ${maxIterations} iterations for ${conversation.projectId ? 'workspace' : 'chat'})`);
      const result = await this.executeExternalReActLoop(
        userMessage,
        systemPrompt,
        model,
        llmServiceUrl,
        userId,
        conversationHistory,
        conversation.id,
        (status: string) => {
          // Broadcast progress via WebSocket
          this.websocketGateway.broadcastMessageUpdate(
            conversation.id,
            savedTempMessage.id,
            status,
            true,
            { streaming: true, progress: true, provider: 'external' }
          );
        },
        maxIterations,
        // Tool execution callback - save memory after each tool
        async (toolName: string, toolResult: any, observation: string) => {
          if (conversation.agent?.configuration?.memory?.enabled) {
            // Save tool execution to short-term memory (async, non-blocking)
            this.saveToolExecutionMemory(
              conversation.agentId,
              conversation.id,
              toolName,
              toolResult,
              observation,
              model
            ).catch(err => console.error('Failed to save tool memory:', err));
          }
        },
        conversation
      );
      
      // Update the temporary message with final response
      console.log(`💾 ReAct (External LLM): Saving final answer (${result.finalAnswer.length} chars, ${result.toolsUsed.length} tools used)`);
      await this.messagesRepository.update(savedTempMessage.id, {
        content: result.finalAnswer,
        metadata: { model, toolsUsed: result.toolsUsed, steps: result.steps, streaming: false, provider: 'external' } as any,
      });
      
      // Broadcast final update
      this.websocketGateway.broadcastMessageUpdate(
        conversation.id,
        savedTempMessage.id,
        result.finalAnswer,
        false,
        { model, toolsUsed: result.toolsUsed, streaming: false, provider: 'external' }
      );
      
      console.log(`✅ ReAct (External LLM) completed successfully with ${result.toolsUsed.length} tools used`);
      if (isVerbose) {
        console.log(`📊 ReAct (External LLM) details:`, { toolsUsed: result.toolsUsed, stepsCount: result.steps.length });
      }
      
      // Store final conversation summary in memory and consolidate to long-term
      if (conversation.agent?.configuration?.memory?.enabled) {
        try {
          // Save conversation to short-term memory first (will be consolidated to long-term later)
          const summary = `Conversation: ${userMessage.substring(0, 100)}...`;
          const details = `User: ${userMessage}\n\nAgent: ${result.finalAnswer}\n\nTools used: ${result.toolsUsed.join(', ')}`;
          
          await this.memoryService.createMemory({
            agentId: conversation.agentId,
            sessionId: conversation.id,
            type: 'short-term',
            category: 'interaction',
            content: `${summary}\n\n${details}`,
            importance: result.toolsUsed.length > 0 ? 0.8 : 0.5,
            metadata: {
              tags: [model, 'external', 'react', 'conversation'],
              keywords: result.toolsUsed.length > 0 ? ['tool-usage', ...result.toolsUsed] : ['conversation'],
              confidence: 1.0,
              relevance: 1.0,
              source: 'conversation' as any
            }
          });
          console.log('✅ Stored ReAct (External LLM) conversation in short-term memory');
        } catch (error) {
          console.error('Failed to store ReAct (External LLM) interaction in memory:', error);
        }
      }
    } catch (error) {
      console.error('❌ ReAct (External LLM) execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute ReAct loop with external LLM
   */
  private async executeExternalReActLoop(
    userMessage: string,
    systemPrompt: string,
    model: string,
    llmServiceUrl: string,
    userId: string,
    conversationHistory: any[] = [],
    conversationId?: string,
    progressCallback?: (status: string) => void,
    maxIterations: number = 5,
    toolExecutionCallback?: (toolName: string, toolResult: any, observation: string) => Promise<void>,
    conversation?: Conversation
  ): Promise<{ finalAnswer: string; steps: any[]; toolsUsed: string[] }> {
    const steps: any[] = [];
    const toolsUsed: string[] = [];
    const toolCallHistory = new Set<string>();
    let iteration = 0;
    const MAX_ITERATIONS = maxIterations;
    let currentMessage = userMessage;

    console.log(`🔄 Starting external ReAct loop for: "${userMessage.substring(0, 50)}..."`);

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`\n🔁 External ReAct Iteration ${iteration}/${MAX_ITERATIONS}`);
      
      // Send progress update with step indicator
      if (progressCallback) {
        const stepInfo = `📋 Step ${iteration}/${MAX_ITERATIONS}`;
        progressCallback(`${stepInfo}\n🔄 Thinking...`);
      }

      // Call external LLM with current context
      console.log(`📤 Sending to LLM - Iteration ${iteration}, Message length: ${currentMessage.length}`);
      const llmResponse = await this.callExternalLLMForReAct(
        systemPrompt,
        currentMessage,
        conversationHistory,
        model,
        llmServiceUrl,
        userId
      );

      console.log(`📥 LLM Response received - Length: ${llmResponse.length}`);
      console.log(`💭 External LLM Response: ${llmResponse.substring(0, 200)}...`);

      // Parse response for tool calls
      console.log(`🔍 Parsing response for tool calls...`);
      const toolCall = this.parseToolCall(llmResponse);

      if (!toolCall) {
        // No tool call found - this is the final answer
        console.log(`✅ Final answer received (no tool call) - Ending loop at iteration ${iteration}`);
        steps.push({ answer: llmResponse });
        
        // Send final progress update
        if (progressCallback) {
          progressCallback(`✅ Analysis complete!\n\n${llmResponse}`);
        }
        
        return {
          finalAnswer: llmResponse,
          steps,
          toolsUsed
        };
      }

      console.log(`🔧 Tool call found: ${toolCall.name} - Continuing loop`);

      // Check for repeated tool calls (infinite loop detection)
      const toolKey = `${toolCall.name}:${JSON.stringify(toolCall.arguments)}`;
      if (toolCallHistory.has(toolKey)) {
        console.log(`⚠️ Detected repeated tool call: ${toolKey} - Forcing final answer`);
        const forceAnswerPrompt = `You've already called ${toolCall.name} with these exact arguments and received the results.

DO NOT call any more tools. Based on ALL the information you've gathered so far, provide your FINAL ANSWER to the original question now.

Original Question: ${userMessage}

Provide a complete answer based on the data you already have.`;
        
        currentMessage = forceAnswerPrompt;
        continue; // Skip to next iteration which should give final answer
      }
      toolCallHistory.add(toolKey);

      // Tool call found - execute it
      console.log(`🔧 Tool call detected: ${toolCall.name}`);
      
      // Send progress update with step indicator
      if (progressCallback) {
        const stepInfo = `📋 Step ${iteration}/${MAX_ITERATIONS}`;
        progressCallback(`${stepInfo}\n🔧 Executing: ${toolCall.name}...`);
      }
      
      steps.push({
        thought: `Using ${toolCall.name}...`,
        action: toolCall.name,
        actionInput: toolCall.arguments
      });
      toolsUsed.push(toolCall.name);

      // Get working directory for project context
      const workingDir = await this.getWorkingDirectory(conversation);

      // Execute tool with project working directory
      const toolResult = await this.mcpService.executeTool({
        name: toolCall.name,
        arguments: toolCall.arguments
      }, workingDir);

      const observation = toolResult.success
        ? JSON.stringify(toolResult.result, null, 2)
        : `Error: ${toolResult.error}`;

      console.log(`👁️ Observation: ${observation.substring(0, 200)}...`);
      steps.push({ observation });
      
      // Call tool execution callback if provided (for memory saving)
      if (toolExecutionCallback) {
        await toolExecutionCallback(toolCall.name, toolResult, observation);
      }

      // Broadcast tool result to UI
      if (progressCallback) {
        const resultPreview = observation.length > 100 ? observation.substring(0, 100) + '...' : observation;
        const stepInfo = `📋 Step ${iteration}/${MAX_ITERATIONS}`;
        progressCallback(`${stepInfo}\n✅ ${toolCall.name} completed\n\n${resultPreview}\n\n🤔 Deciding next action...`);
      }

      // Check if tool failed
      const toolFailed = !toolResult.success || observation.includes('error') || observation.includes('Error');
      
      console.log(`🔄 Preparing next iteration. Tool failed: ${toolFailed}`);
      
      // Build context-aware follow-up prompt
      const toolsSummary = toolsUsed.length > 0 
        ? `\n\nTools you've already used:\n${toolsUsed.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '';
      
      // Prepare next message with tool result - include context to prevent loops
      currentMessage = `Latest Tool Result from ${toolCall.name}:
${observation}
${toolsSummary}

Original Question: ${userMessage}

IMPORTANT: You've already gathered data from ${toolsUsed.length} tool(s). Review what you have before calling more tools.

Decide your next action:
1. Have enough info to answer? → Provide final answer (text only, NO JSON)
2. Need DIFFERENT information? → Output ONLY ONE JSON tool call (no text before/after)

CRITICAL RULES:
- DO NOT repeat tools you've already used
- If using a tool, output ONLY JSON with TOOL_CALL: marker - NO explanations
- Prefer answering with available data over gathering more

Example tool call:
TOOL_CALL:
{"tool": "write_file", "arguments": {"path": "App.jsx", "content": "..."}}`;
      
      // Add to conversation history
      conversationHistory.push({
        role: 'assistant',
        content: `Tool: ${toolCall.name}\nResult: ${observation}`
      });
      
      console.log(`🔄 End of iteration ${iteration}. Continuing to next iteration...`);
      console.log(`📊 Current state: ${toolsUsed.length} tools used, ${steps.length} steps taken`);
    }

    // Max iterations reached
    console.warn(`⚠️ Max iterations (${MAX_ITERATIONS}) reached for external ReAct`);
    return {
      finalAnswer: 'I apologize, but I reached the maximum number of steps while processing your request. Please try rephrasing your question.',
      steps,
      toolsUsed
    };
  }

  /**
   * Call external LLM for ReAct (non-streaming)
   */
  private async callExternalLLMForReAct(
    systemPrompt: string,
    userMessage: string,
    history: any[],
    model: string,
    llmServiceUrl: string,
    userId: string
  ): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const url = `${llmServiceUrl}/api/chat?userId=${userId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `External LLM API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || '';
  }

  /**
   * Parse tool call from LLM response
   */
  private parseToolCall(response: string): { name: string; arguments: any } | null {
    console.log('🔍 Parsing tool call from response:', response.substring(0, 300));
    
    // Try JSON format with TOOL_CALL: marker
    const jsonMarkerRegex = /TOOL_CALL:\s*(\{[\s\S]*?\})\s*(?:\n|$)/;
    let match = response.match(jsonMarkerRegex);
    
    if (match) {
      console.log('✅ Found TOOL_CALL: marker with JSON');
      const jsonStr = match[1].trim();
      console.log('📝 Extracted JSON:', jsonStr.substring(0, 200));
      
      try {
        // Use jsonrepair to fix common JSON errors
        const toolCallData = parseJSON(jsonStr);
        
        if (toolCallData && toolCallData.tool) {
          console.log('✅ Successfully parsed JSON tool call:', toolCallData.tool);
          return {
            name: toolCallData.tool,
            arguments: toolCallData.arguments || {}
          };
        } else {
          console.error('❌ JSON missing "tool" field:', toolCallData);
        }
      } catch (error) {
        console.error('❌ Failed to parse JSON tool call:', error);
        console.error('Raw JSON string:', jsonStr);
      }
    }
    
    // Fallback: Try to find JSON object without marker
    if (!match) {
      console.log('⚠️ No TOOL_CALL: marker found, trying to extract JSON object...');
      const jsonObjectRegex = /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\s*\}/;
      match = response.match(jsonObjectRegex);
      
      if (match) {
        console.log('✅ Found JSON object without marker');
        const jsonStr = match[0];
        
        try {
          const toolCallData = parseJSON(jsonStr);
          if (toolCallData && toolCallData.tool) {
            console.log('✅ Successfully parsed JSON tool call:', toolCallData.tool);
            return {
              name: toolCallData.tool,
              arguments: toolCallData.arguments || {}
            };
          }
        } catch (error) {
          console.error('❌ Failed to parse JSON object:', error);
        }
      }
    }
    
    // Legacy fallback: Try XML format for backward compatibility
    if (!match) {
      console.log('⚠️ Trying legacy XML format...');
      return this.parseToolCallXML(response);
    }
    
    console.log('❌ No tool call pattern matched');
    return null;
  }
  
  /**
   * Legacy XML parser for backward compatibility
   */
  private parseToolCallXML(response: string): { name: string; arguments: any } | null {
    // Try standard XML format
    let toolCallRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/s;
    let match = response.match(toolCallRegex);
    
    // Try lenient patterns for malformed XML
    if (!match) {
      toolCallRegex = /<tool_call>\s*<tool_name>(.*?)<\/_?\w*>\s*<arguments>(.*?)<\/?\w*>\s*<\/tool_call>/s;
      match = response.match(toolCallRegex);
    }
    
    if (match) {
      const toolName = match[1].trim();
      let argsJson = match[2].trim();
      
      // Clean up malformed JSON
      argsJson = argsJson.replace(/<\/?>/g, '');
      argsJson = argsJson.replace(/<\/tool_call>.*$/s, '');
      
      console.log('📝 Extracted from XML - tool name:', toolName);
      console.log('📝 Extracted from XML - arguments:', argsJson);
      
      try {
        const args = parseJSON(argsJson);
        if (args) {
          console.log('✅ Successfully parsed XML tool call:', toolName);
          return { name: toolName, arguments: args };
        }
      } catch (error) {
        console.error('❌ Failed to parse XML tool arguments:', error);
      }
    }
    
    return null;
  }



  private getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      'read_file': 'Read the contents of a file from the workspace',
      'write_file': 'Write or update a file with complete content (not append). Provide full file content.',
      'list_files': 'List files and directories in a path',
      'execute_command': 'Execute a shell command. For Next.js: npx create-next-app@latest name --yes. For React: npx create-react-app name --template typescript. For npm: mkdir dir && cd dir && npm init -y (NEVER use npm init --name).',
      'git_status': 'Get the current git repository status',
      'git_commit': 'Commit changes to git with a message',
      'create_directory': 'Create a new directory (creates parent dirs if needed)',
      'delete_file': 'Delete a file from the workspace'
    };
    return descriptions[toolName] || `Execute ${toolName}`;
  }

  /**
   * Save tool execution to long-term memory (async, non-blocking)
   * Saves directly to database for persistence across restarts
   */
  /**
   * Store interaction in memory (helper method to avoid duplication)
   */
  private async storeInteractionMemory(
    conversation: any,
    userMessage: string,
    agentResponse: string,
    model: string,
    toolsUsed: any[] = []
  ): Promise<void> {
    if (!conversation.agent?.configuration?.memory?.enabled) {
      return;
    }

    try {
      await this.memoryService.createMemory({
        agentId: conversation.agentId,
        sessionId: conversation.id,
        type: 'short-term',
        category: 'interaction',
        content: `User: ${userMessage}\nAgent: ${agentResponse}`,
        importance: toolsUsed.length > 0 ? 0.8 : 0.5,
        metadata: {
          tags: [model, this.isOllamaModel(model) ? 'ollama' : 'external'],
          keywords: toolsUsed.length > 0 ? ['tool-usage'] : ['conversation'],
          confidence: 1.0,
          relevance: 1.0,
          source: 'conversation' as any
        }
      });
      console.log('✅ Stored interaction in memory');
    } catch (error) {
      console.error('Failed to store interaction in memory:', error);
    }
  }

  private async saveToolExecutionMemory(
    agentId: string,
    sessionId: string,
    toolName: string,
    toolResult: any,
    observation: string,
    model: string
  ): Promise<void> {
    try {
      const success = toolResult?.success !== false;
      const summary = `${toolName}: ${success ? 'Success' : 'Error'}`;
      const content = success
        ? `Tool: ${toolName}\nResult: Success\nObservation: ${observation.substring(0, 500)}`
        : `Tool: ${toolName}\nResult: Error\nError: ${toolResult?.error || observation}`;
      
      // Save to short-term memory first (will be consolidated to long-term later)
      await this.memoryService.createMemory({
        agentId,
        sessionId,
        type: 'short-term',
        category: 'interaction' as any,
        content: `${summary}\n\n${content}`,
        importance: success ? 0.7 : 0.9, // Higher importance for errors
        metadata: {
          tags: [model, 'tool-execution', toolName, success ? 'success' : 'error'],
          keywords: [toolName, success ? 'success' : 'error'],
          confidence: 1.0,
          relevance: 1.0,
          source: 'tool-execution' as any
        }
      });
      console.log(`✅ Saved tool execution to short-term memory: ${toolName} (${success ? 'success' : 'error'})`);
    } catch (error) {
      console.error(`Failed to save tool execution memory for ${toolName}:`, error);
    }
  }

  /**
   * Consolidate conversation memories to long-term storage (async, non-blocking)
   */
  private async consolidateConversationMemory(agentId: string, conversationId: string): Promise<void> {
    try {
      console.log(`🔄 Starting memory consolidation for conversation ${conversationId}`);
      
      // Get all short-term memories for this conversation
      const stmResult = await this.memoryService.queryMemories({
        agentId,
        sessionId: conversationId,
        limit: 100
      });
      
      if (!stmResult.memories || stmResult.memories.length === 0) {
        console.log('No memories to consolidate');
        return;
      }
      
      // Group memories by conversation and create a single long-term memory chunk
      const toolExecutions = stmResult.memories.filter(m => 
        m.metadata?.tags?.includes('tool-execution')
      );
      const interactions = stmResult.memories.filter(m => 
        !m.metadata?.tags?.includes('tool-execution')
      );
      
      // Build consolidated summary
      const summary = `Conversation with ${toolExecutions.length} tool executions`;
      const details = [
        '=== Conversation Summary ===',
        ...interactions.map(m => (m as any).content || ''),
        '',
        '=== Tool Executions ===',
        ...toolExecutions.map(m => (m as any).content || '')
      ].join('\n\n');
      
      // Calculate importance (higher if tools were used or errors occurred)
      const hasErrors = toolExecutions.some(m => 
        m.metadata?.tags?.includes('error')
      );
      const importance = hasErrors ? 0.9 : (toolExecutions.length > 0 ? 0.8 : 0.6);
      
      // Create long-term memory
      await this.memoryService.createMemory({
        agentId,
        sessionId: conversationId,
        type: 'long-term',
        category: 'interaction',
        content: details,
        importance,
        metadata: {
          tags: ['conversation', 'consolidated', ...toolExecutions.map(m => m.metadata?.tags || []).flat()],
          keywords: ['conversation', ...toolExecutions.map(m => m.metadata?.keywords || []).flat()],
          confidence: 1.0,
          relevance: 1.0,
          source: 'consolidation' as any
        }
      });
      
      console.log(`✅ Consolidated ${stmResult.memories.length} memories to long-term storage`);
    } catch (error) {
      console.error('Failed to consolidate conversation memory:', error);
    }
  }

  private getToolParameters(toolName: string): any {
    const parameters: Record<string, any> = {
      'read_file': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to read' }
        },
        required: ['path']
      },
      'write_file': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to write' },
          content: { type: 'string', description: 'Content to write to the file' }
        },
        required: ['path', 'content']
      },
      'list_files': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to list', default: '.' }
        }
      },
      'execute_command': {
        type: 'object',
        properties: {
          command: { 
            type: 'string', 
            description: 'Shell command to execute. Next.js: npx create-next-app@latest name --yes. React: npx create-react-app name --template typescript. Vite: npm create vite@latest name -- --template react-ts. npm: mkdir dir && cd dir && npm init -y. For package.json: npm pkg set key=value.' 
          }
        },
        required: ['command']
      },
      'git_status': {
        type: 'object',
        properties: {}
      },
      'git_commit': {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Commit message' },
          files: { type: 'array', items: { type: 'string' }, description: 'Files to commit' }
        },
        required: ['message']
      },
      'create_directory': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to create' }
        },
        required: ['path']
      },
      'delete_file': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to delete' }
        },
        required: ['path']
      }
    };
    return parameters[toolName] || { type: 'object', properties: {} };
  }

  /**
   * Parse and execute tool calls from model response
   */
  private async parseAndExecuteToolCalls(content: string, conversation: any, message: any): Promise<void> {
    console.log(`🔍 Parsing tool calls from content (length: ${content.length})`);
    console.log(`📝 Content preview: ${content.substring(0, 200)}...`);
    
    // Pre-process content to fix common JSON formatting errors from LLMs
    let processedContent = content;
    
    // Fix missing closing quote and comma before "arguments"
    // Pattern: "value "arguments" -> "value", "arguments"
    processedContent = processedContent.replace(/(\w) "arguments"/g, '$1", "arguments"');
    
    // Also fix missing comma when quote is present
    // Pattern: "value" "arguments" -> "value", "arguments"
    processedContent = processedContent.replace(/" "arguments"/g, '", "arguments"');
    
    if (processedContent !== content) {
      console.log(`🔧 Fixed JSON formatting errors in content`);
      console.log(`📝 Fixed preview: ${processedContent.substring(0, 200)}...`);
    }
    
    // Parse JSON-style tool calls from the response
    // Try JSON format with TOOL_CALL: marker
    const jsonMarkerRegex = /TOOL_CALL:\s*(\{[\s\S]*?\})\s*(?:\n|$)/g;
    let matches = [...processedContent.matchAll(jsonMarkerRegex)];
    
    console.log(`🔎 JSON format matches: ${matches.length}`);
    
    // If no JSON matches, try legacy XML format for backward compatibility
    if (matches.length === 0) {
      console.log(`⚠️ No JSON tool calls found, trying legacy XML format...`);
      const xmlRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/gs;
      const xmlMatches = [...processedContent.matchAll(xmlRegex)];
      
      if (xmlMatches.length === 0) {
        console.log(`⚠️ No tool calls found in content`);
        return;
      }
      
      console.log(`✅ Found ${xmlMatches.length} XML tool call(s) in response`);
      
      // Remove XML tool calls from content for cleaner display
      let cleanContent = processedContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
      
      for (const match of xmlMatches) {
        const toolName = match[1].trim();
        const argsJson = match[2].trim();
        
        try {
          const args = parseJSON(argsJson);
          if (!args) {
            console.error(`Failed to parse XML tool arguments for ${toolName}`);
            continue;
          }
          
          // Get working directory for project context
          const workingDir = await this.getWorkingDirectory(conversation);
          
          // Execute tool and update message inline (XML legacy path) with project working directory
          const toolResult = await this.mcpService.executeTool({
            name: toolName,
            arguments: args
          }, workingDir);
          
          const resultToShow = toolResult.result !== undefined ? toolResult.result : { error: 'No result returned' };
          const toolResultText = `\n\n**Tool Executed: ${toolName}**\n\`\`\`json\n${JSON.stringify(resultToShow, null, 2)}\n\`\`\`\n`;
          cleanContent += toolResultText;
          
          await this.messagesRepository.update(message.id, {
            content: cleanContent
          });
        } catch (error) {
          console.error(`Error executing XML tool ${toolName}:`, error);
        }
      }
      return;
    }
    
    console.log(`✅ Found ${matches.length} JSON tool call(s) in response`);
    
    // Remove JSON tool calls from content for cleaner display
    let cleanContent = processedContent.replace(/TOOL_CALL:\s*\{[\s\S]*?\}\s*(?:\n|$)/g, '').trim();
    
    for (const match of matches) {
      const jsonStr = match[1].trim();
      let toolName = 'unknown'; // Declare outside try block for error handling
      
      try {
        const toolCallData = parseJSON(jsonStr);
        if (!toolCallData || !toolCallData.tool) {
          console.error(`Failed to parse JSON tool call:`, jsonStr);
          continue;
        }
        
        toolName = toolCallData.tool;
        const args = toolCallData.arguments || {};
        console.log(`Executing tool: ${toolName} with args:`, args);
        
        // Broadcast tool execution start
        this.websocketGateway.broadcastAgentActivity({
          conversationId: conversation.id,
          type: this.getActivityTypeFromTool(toolName),
          description: `Executing: ${toolName}`,
          tool: toolName,
          parameters: args,
          status: 'in_progress'
        });
        
        // Get working directory for project context
        const workingDir = await this.getWorkingDirectory(conversation);
        
        // Execute the tool with project working directory
        const toolResult = await this.mcpService.executeTool({
          name: toolName,
          arguments: args
        }, workingDir);
        
        // Broadcast tool execution result
        this.websocketGateway.broadcastAgentActivity({
          conversationId: conversation.id,
          type: this.getActivityTypeFromTool(toolName),
          description: toolResult.success ? `Completed: ${toolName}` : `Failed: ${toolName}`,
          tool: toolName,
          parameters: args,
          result: toolResult.result,
          status: toolResult.success ? 'completed' : 'failed'
        });
        
        // Append tool result to clean content
        const resultToShow = toolResult.result !== undefined ? toolResult.result : { error: 'No result returned' };
        const toolResultText = `\n\n**Tool Executed: ${toolName}**\n\`\`\`json\n${JSON.stringify(resultToShow, null, 2)}\n\`\`\`\n`;
        cleanContent += toolResultText;
        
        // Update message with clean content and tool result
        await this.messagesRepository.update(message.id, {
          content: cleanContent
        });
        
        // Broadcast updated content
        this.websocketGateway.broadcastMessageUpdate(
          conversation.id,
          message.id,
          cleanContent,
          false,
          { toolExecuted: true, toolName, toolResult: toolResult.success }
        );
        
      } catch (error) {
        console.error(`Failed to execute tool ${toolName}:`, error);
      }
    }
  }

  /**
   * Map tool name to activity type
   */
  private getActivityTypeFromTool(toolName: string): 'file_edit' | 'file_create' | 'file_delete' | 'git_operation' | 'terminal_command' | 'test_run' {
    if (toolName === 'execute_command') {
      return 'terminal_command';
    }
    if (toolName === 'write_file') {
      return 'file_create';
    }
    if (toolName === 'delete_file') {
      return 'file_delete';
    }
    if (toolName.includes('git')) {
      return 'git_operation';
    }
    if (toolName.includes('test')) {
      return 'test_run';
    }
    return 'file_edit';
  }

  /**
   * Check if a model supports tool/function calling
   * 
   * Note: Ollama's native tool calling with streaming causes timeouts.
   * Instead, we use prompt-based tool calling where the model outputs
   * tool calls as text that we parse and execute.
   */
  private modelSupportsToolCalling(model: string): boolean {
    const modelLower = model.toLowerCase();
    
    // Models that can understand and output tool calls via prompting
    const supportedPatterns = [
      'llama3.1', 'llama3.2', 'llama-3.1', 'llama-3.2',  // Llama 3.1/3.2
      'mistral', 'mixtral',  // Mistral models
      'qwen2.5',  // Qwen 2.5
      'command-r',  // Cohere Command R
      'gpt-', 'gpt3', 'gpt4',  // OpenAI GPT models
      'claude',  // Anthropic Claude
    ];
    
    return supportedPatterns.some(pattern => modelLower.includes(pattern));
  }

}