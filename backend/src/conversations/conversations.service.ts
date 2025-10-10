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

  private buildSystemPrompt(agent: Agent): string {
    let systemPrompt = agent.configuration?.systemPrompt || 'You are a helpful AI assistant.';
    
    // Add ReAct pattern instructions for tool usage
    systemPrompt += '\n\nYou have access to workspace tools. Use them in a chain to complete complex tasks.\n\n';
    systemPrompt += 'CRITICAL: When using a tool, output ONLY the XML - NO explanations, NO plans, NO other text.\n\n';
    systemPrompt += 'EXACT TOOL FORMAT (COPY EXACTLY):\n';
    systemPrompt += '<tool_call>\n<tool_name>tool_name</tool_name>\n<arguments>{"arg": "value"}</arguments>\n</tool_call>\n\n';
    systemPrompt += 'IMPORTANT XML RULES:\n';
    systemPrompt += '- Use </arguments> NOT </>\n';
    systemPrompt += '- Use </tool_name> NOT </>\n';
    systemPrompt += '- Close ALL tags with full names\n\n';
    systemPrompt += 'CRITICAL JSON RULES:\n';
    systemPrompt += '- ALL string values MUST have closing quotes\n';
    systemPrompt += '- ALL objects MUST have closing braces\n';
    systemPrompt += '- Use double quotes for keys and values\n';
    systemPrompt += '- No trailing commas\n\n';
    systemPrompt += 'WRONG EXAMPLES:\n';
    systemPrompt += '❌ <arguments>{"path": "."}</>\n';
    systemPrompt += '❌ <arguments>{"path": "game-demo}\n';
    systemPrompt += '❌ <arguments>{"path": \'value\'}\n\n';
    systemPrompt += 'CORRECT EXAMPLES:\n';
    systemPrompt += '✅ <arguments>{"path": "."}</arguments>\n';
    systemPrompt += '✅ <arguments>{"path": "game-demo"}</arguments>\n';
    systemPrompt += '✅ <arguments>{"command": "npm install"}</arguments>\n\n';
    systemPrompt += 'Available tools:\n';
    systemPrompt += '- get_workspace_summary: Get comprehensive workspace analysis. Args: {}\n';
    systemPrompt += '- list_files: List files/folders. Args: {"path": "."}\n';
    systemPrompt += '- read_file: Read file contents. Args: {"path": "file.js"}\n';
    systemPrompt += '- execute_command: Run commands. Args: {"command": "npm install"}\n';
    systemPrompt += '- write_file: Write files. Args: {"path": "file.js", "content": "..."}\n';
    systemPrompt += '- create_directory: Create directory. Args: {"path": "src"}\n\n';
    systemPrompt += 'MULTI-STEP REASONING:\n';
    systemPrompt += '1. Use tools in sequence to gather information and perform actions\n';
    systemPrompt += '2. After each tool result, decide: need more tools OR ready to answer\n';
    systemPrompt += '3. For complex tasks, use multiple tools (e.g., check workspace → create directory → write files)\n';
    systemPrompt += '4. Only provide final answer when you have all needed information\n\n';
    systemPrompt += 'REMEMBER: Tool call = XML ONLY. Final answer = text ONLY. Never mix them.';
    
    return systemPrompt;
  }

  private shouldUseReAct(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    
    // Use ReACT for most tasks that require tool usage
    // ReACT is better for multi-step tasks that need:
    // - Reading existing code
    // - Making modifications
    // - Creating new files
    // - Running commands
    
    // Keywords that indicate ReACT should be used
    const reactKeywords = [
      // Information gathering
      'what files', 'what is in', 'tell me about', 'analyze',
      'show me', 'list', 'find', 'search', 'look for',
      'workspace summary', 'project structure', 'file structure',
      // Modification tasks
      'update', 'modify', 'change', 'edit', 'add', 'remove',
      'fix', 'improve', 'refactor', 'enhance',
      // Creation tasks that need context
      'create', 'build', 'make', 'generate', 'setup', 'initialize',
      'implement', 'develop', 'write',
      // Complex tasks
      'need to', 'we need', 'i need', 'want to', 'should',
      'app', 'project', 'component', 'feature', 'functionality'
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
        systemPrompt = `You are a helpful coding assistant with REAL workspace access. You can EXECUTE commands and CREATE files.

CRITICAL RULE: When you decide to use a tool, output ONLY the XML tool call - NO explanations, NO plans, NO other text.

## EXACT Tool Call Format (COPY THIS EXACTLY):
<tool_call>
<tool_name>tool_name_here</tool_name>
<arguments>{"arg": "value"}</arguments>
</tool_call>

IMPORTANT: 
- Use </arguments> NOT </>
- Use </tool_name> NOT </>
- Use </tool_call> NOT </>
- Close ALL tags properly

## WRONG Examples:
❌ <arguments>{"path": "."}</> (missing "arguments" in closing tag)
❌ <tool_name>list_files</> (missing "tool_name" in closing tag)
❌ "Let's start by... <tool_call>..." (text before XML)

## CORRECT Examples:
✅ <tool_call><tool_name>list_files</tool_name><arguments>{"path": "."}</arguments></tool_call>
✅ <tool_call><tool_name>write_file</tool_name><arguments>{"path": "App.jsx", "content": "..."}</arguments></tool_call>

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
1. When user asks to CREATE/BUILD a project → IMMEDIATELY use execute_command (DO NOT check workspace first)
2. When user asks to CREATE/WRITE files → IMMEDIATELY use write_file with the actual content
3. When user asks to UPDATE/MODIFY existing code → Use read_file first, then write_file
4. ALWAYS use tools to perform actions - NEVER just give instructions
5. After using a tool, CONTINUE using more tools until the task is complete
6. If a tool fails, try a different approach - DON'T give up
7. For complex tasks, use MULTIPLE tools in sequence (read → modify → write)
8. Only provide final answer when ALL actions are complete`;

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
        systemPrompt += `\n\n## CRITICAL: You have REAL workspace access. When you use a tool, output ONLY the XML - NO explanations.

## EXACT Tool Call Format (COPY EXACTLY):
<tool_call>
<tool_name>tool_name_here</tool_name>
<arguments>{"arg": "value"}</arguments>
</tool_call>

IMPORTANT:
- Use </arguments> NOT </>
- Use </tool_name> NOT </>
- Close ALL tags with full names

## WRONG:
❌ <arguments>{"path": "."}</> (wrong closing tag)
❌ "Let's create... <tool_call>..." (text before XML)

## CORRECT:
✅ <tool_call><tool_name>list_files</tool_name><arguments>{"path": "."}</arguments></tool_call>

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
You: <tool_call><tool_name>execute_command</tool_name><arguments>{"command": "npm create vite@latest my-app -- --template react"}</arguments></tool_call>

User: "What files are in the workspace?"
You: <tool_call><tool_name>list_files</tool_name><arguments>{"path": "."}</arguments></tool_call>`;
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
      // Get system prompt
      const systemPrompt = this.buildSystemPrompt(conversation.agent);
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
      console.log(`⚙️ ReAct (External LLM): Starting ReAct loop with model ${model}`);
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
        }
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
    progressCallback?: (status: string) => void
  ): Promise<{ finalAnswer: string; steps: any[]; toolsUsed: string[] }> {
    const steps: any[] = [];
    const toolsUsed: string[] = [];
    let iteration = 0;
    const MAX_ITERATIONS = 5; // Allow more iterations for complex queries
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

      // Execute tool
      const toolResult = await this.mcpService.executeTool({
        name: toolCall.name,
        arguments: toolCall.arguments
      });

      const observation = toolResult.success
        ? JSON.stringify(toolResult.result, null, 2)
        : `Error: ${toolResult.error}`;

      console.log(`👁️ Observation: ${observation.substring(0, 200)}...`);
      steps.push({ observation });

      // Broadcast tool result to UI
      if (progressCallback) {
        const resultPreview = observation.length > 100 ? observation.substring(0, 100) + '...' : observation;
        const stepInfo = `📋 Step ${iteration}/${MAX_ITERATIONS}`;
        progressCallback(`${stepInfo}\n✅ ${toolCall.name} completed\n\n${resultPreview}\n\n🤔 Deciding next action...`);
      }

      // Check if tool failed
      const toolFailed = !toolResult.success || observation.includes('error') || observation.includes('Error');
      
      console.log(`🔄 Preparing next iteration. Tool failed: ${toolFailed}`);
      
      // Prepare next message with tool result - encourage continuation if needed
      if (toolFailed) {
        currentMessage = `Previous query: ${userMessage}\n\nTool used: ${toolCall.name}\nTool result: ERROR - ${observation}\n\nThe tool failed. You MUST try a different approach:
1. Try a different tool
2. Try the same tool with different arguments
3. Try to work around the error

Output ONLY the XML tool call for your next action (no explanations).
Example: <tool_call><tool_name>read_file</tool_name><arguments>{"path": "package.json"}</arguments></tool_call>`;
      } else {
        // Check if this looks like a complete task that needs action
        const needsMoreWork = userMessage.toLowerCase().includes('create') || 
                              userMessage.toLowerCase().includes('build') ||
                              userMessage.toLowerCase().includes('make') ||
                              userMessage.toLowerCase().includes('update') ||
                              userMessage.toLowerCase().includes('add');
        
        if (needsMoreWork && iteration === 1) {
          // For action-oriented tasks, strongly encourage continuation after first tool
          currentMessage = `Previous query: ${userMessage}\n\nTool used: ${toolCall.name}\nTool result: ${observation}\n\nYou've gathered information. Now you MUST take action to complete the user's request.

What's the next step to accomplish: "${userMessage}"?

Output ONLY the XML tool call for your next action (no explanations).
Examples:
- <tool_call><tool_name>create_directory</tool_name><arguments>{"path": "project-name"}</arguments></tool_call>
- <tool_call><tool_name>write_file</tool_name><arguments>{"path": "file.js", "content": "..."}</arguments></tool_call>
- <tool_call><tool_name>execute_command</tool_name><arguments>{"command": "npm install"}</arguments></tool_call>`;
        } else {
          currentMessage = `Previous query: ${userMessage}\n\nTool used: ${toolCall.name}\nTool result: ${observation}\n\nDecide your next action:
1. Need more info or another action? → Output ONLY the XML tool call (no explanations)
2. Have enough info to answer? → Provide your final answer (text only, no XML)

CRITICAL: If using a tool, output ONLY the XML - NO text before or after it.
Example: <tool_call><tool_name>write_file</tool_name><arguments>{"path": "App.jsx", "content": "..."}</arguments></tool_call>`;
        }
      }
      
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
    
    // Try standard format first
    let toolCallRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/s;
    let match = response.match(toolCallRegex);
    
    // Try alternative format with malformed closing tags
    if (!match) {
      console.log('⚠️ Standard format failed, trying alternative patterns...');
      // Handle <arguments>...</> instead of <arguments>...</arguments>
      toolCallRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)<\/>\s*<\/tool_call>/s;
      match = response.match(toolCallRegex);
      
      if (match) {
        console.log('✅ Found malformed XML with </> instead of </arguments>');
      }
    }
    
    // Try even more lenient pattern
    if (!match) {
      // Handle missing closing tags entirely
      toolCallRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)$/s;
      match = response.match(toolCallRegex);
      
      if (match) {
        console.log('✅ Found incomplete XML, attempting to parse...');
      }
    }
    
    if (match) {
      const toolName = match[1].trim();
      let argsJson = match[2].trim();
      
      // Clean up malformed JSON
      argsJson = argsJson.replace(/<\/?>/g, ''); // Remove <> or </>
      argsJson = argsJson.replace(/<\/tool_call>.*$/s, ''); // Remove trailing </tool_call>
      
      console.log('📝 Extracted tool name:', toolName);
      console.log('📝 Extracted arguments:', argsJson);
      
      try {
        const args = parseJSON(argsJson);
        if (args) {
          console.log('✅ Successfully parsed tool call:', toolName, args);
          return { name: toolName, arguments: args };
        }
      } catch (error) {
        console.error('❌ Failed to parse tool arguments:', error);
        console.error('Raw args string:', argsJson);
      }
    } else {
      console.log('❌ No tool call pattern matched');
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