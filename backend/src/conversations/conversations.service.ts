import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Agent } from '../entities/agent.entity';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { MCPService } from '../mcp/mcp.service';
import { ReActAgentService } from './react-agent.service';
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
    @Inject(forwardRef(() => WebSocketGateway))
    private websocketGateway: WebSocketGateway,
    private mcpService: MCPService,
    private reactAgentService: ReActAgentService,
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
      }
      
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
          agentResponse = await this.callExternalLLMAPI(userMessage, model, conversation);
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
        
        // Execute MCP tools
        const toolResults = await Promise.all(
          toolCalls.map(toolCall => this.mcpService.executeTool(toolCall))
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

  private buildSystemPrompt(agent: Agent): string {
    let systemPrompt = agent.configuration?.systemPrompt || 'You are a helpful AI assistant.';
    
    // Add ReAct pattern instructions for tool usage
    systemPrompt += '\n\nYou have access to workspace tools. Use them to gather information before answering.\n\n';
    systemPrompt += 'TOOL FORMAT - Output ONLY this XML (no extra text):\n';
    systemPrompt += '<tool_call>\n<tool_name>get_workspace_summary</tool_name>\n<arguments>{}</arguments>\n</tool_call>\n\n';
    systemPrompt += 'Available tools:\n';
    systemPrompt += '- get_workspace_summary: Get comprehensive workspace analysis (projects, tech stack, file stats). Args: {}\n';
    systemPrompt += '- list_files: List files/folders. Args: {"path": "."}\n';
    systemPrompt += '- read_file: Read file contents. Args: {"path": "package.json"}\n';
    systemPrompt += '- execute_command: Run commands. Args: {"command": "npm test"}\n';
    systemPrompt += '- write_file: Write files. Args: {"path": "file.js", "content": "..."}\n\n';
    systemPrompt += 'WORKSPACE ANALYSIS:\n';
    systemPrompt += 'For workspace summaries, use get_workspace_summary first - it provides projects, frameworks, and file statistics.\n';
    systemPrompt += 'For specific files/details, use list_files or read_file.\n\n';
    systemPrompt += 'CRITICAL: Output ONLY the XML tool_call, nothing else. After tool results, use another tool or give final answer.';
    
    return systemPrompt;
  }

  private shouldUseReAct(userMessage: string): boolean {
    // Detect queries that likely need tool usage
    const toolKeywords = [
      'workspace', 'file', 'directory', 'folder', 'code', 'project',
      'read', 'write', 'create', 'delete', 'list', 'show me',
      'what files', 'what is in', 'tell me about', 'analyze',
      'git', 'commit', 'branch', 'status'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return toolKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async callOllamaAPIWithReAct(
    userMessage: string,
    model: string,
    conversation: Conversation,
  ): Promise<void> {
    const isVerbose = process.env.VERBOSE_LOGGING === 'true';
    console.log(`🤖 ReAct: Starting for message: "${userMessage.substring(0, 100)}..."`);
    
    try {
      // Get system prompt
      const systemPrompt = this.buildSystemPrompt(conversation.agent);
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
      console.log(`⚙️ ReAct: Calling executeReActLoop with model ${model}`);
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
        }
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
        systemPrompt = `You are a helpful coding assistant with access to workspace tools.

When you need to use a tool, respond with this XML format:
<tool_call>
<tool_name>tool_name_here</tool_name>
<arguments>{"arg": "value"}</arguments>
</tool_call>

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
- execute_command: Run shell commands. Args: {"command": "npm install"}
- write_file: Write file content. Args: {"path": "file.js", "content": "..."}
- create_directory: Create directory. Args: {"path": "dirname"}
- git_commit: Commit changes. Args: {"message": "msg", "files": ["file1"]}
- delete_file: Delete file. Args: {"path": "file.js"}`;
        }

        systemPrompt += `

Rules:
- When user asks about files/workspace, use list_files first
- When user asks to read a file, use read_file
- Wait for tool results before responding
- Don't make up information - use tools to get real data`;

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
                    
                    // Broadcast tool execution start
                    this.websocketGateway.broadcastAgentActivity({
                      conversationId: conversation.id,
                      type: this.getActivityTypeFromTool(toolName),
                      description: `Executing: ${toolName}`,
                      tool: toolName,
                      parameters: toolArgs,
                      status: 'in_progress'
                    });
                    
                    // Execute the tool via MCP service
                    const toolResult = await this.mcpService.executeTool({
                      name: toolName,
                      arguments: toolArgs
                    });
                    
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
    try {
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://llm-service:9000';
      
      // Get userId from conversation (should be available from the conversation's user)
      const userId = conversation.userId;
      
      if (!userId) {
        throw new Error('User ID not found in conversation');
      }
      
      const url = `${llmServiceUrl}/api/chat?userId=${userId}`;
      console.log('[ConversationsService] Calling LLM service:', url, 'model:', model);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
      
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
              content: 'You are a helpful coding assistant. Provide clear, concise, and accurate responses. When writing code, include explanations and best practices.'
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          stream: false,
          temperature: 0.7,
          max_tokens: 500
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `LLM service error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.message || 'I apologize, but I was unable to generate a response at this time.';
    } catch (error) {
      console.error('Error calling external LLM API:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const conversation = await this.findOne(id);
    await this.conversationsRepository.remove(conversation);
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
    
    // Parse XML-style tool calls from the response
    // Try standard format first: <tool_call><tool_name>...</tool_name><arguments>...</arguments></tool_call>
    let toolCallRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/gs;
    let matches = [...content.matchAll(toolCallRegex)];
    
    console.log(`🔎 Standard format matches: ${matches.length}`);
    
    // If no matches, try alternative format: <tool_call><execute_command>...</execute_command><arguments>...</arguments></tool_call>
    if (matches.length === 0) {
      toolCallRegex = /<tool_call>\s*<(\w+)>.*?<\/\1>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/gs;
      matches = [...content.matchAll(toolCallRegex)];
      console.log(`🔎 Alternative format matches: ${matches.length}`);
    }
    
    if (matches.length === 0) {
      console.log(`⚠️ No tool calls found in content`);
      return; // No tool calls found
    }
    
    console.log(`✅ Found ${matches.length} tool call(s) in response`);
    
    // Remove tool call XML from content for cleaner display
    let cleanContent = content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
    
    for (const match of matches) {
      const toolName = match[1].trim();
      const argsJson = match[2].trim();
      
      try {
        const args = parseJSON(argsJson);
        if (!args) {
          console.error(`Failed to parse tool arguments for ${toolName}`);
          continue;
        }
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
        
        // Execute the tool
        const toolResult = await this.mcpService.executeTool({
          name: toolName,
          arguments: args
        });
        
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