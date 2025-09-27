import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { CreateConversationDto } from '../dto/create-conversation.dto';
// CreateMessageDto import removed - using plain object type instead

@Injectable()
export class ConversationsService {
  private ollamaAvailable: boolean | null = null;
  private lastOllamaCheck: number = 0;
  private readonly OLLAMA_CHECK_INTERVAL = 60000; // Check every minute

  constructor(
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async findByAgent(agentId: string, userId?: string): Promise<Conversation[]> {
    const whereCondition = userId ? { agentId, userId } : { agentId };
    return this.conversationsRepository.find({
      where: whereCondition,
      order: { updatedAt: 'DESC' },
      relations: ['messages'],
    });
  }

  async findOne(id: string): Promise<Conversation> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id },
      relations: ['messages', 'agent'],
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
    // Verify conversation exists
    const conversation = await this.findOne(messageData.conversationId);
    
    const message = this.messagesRepository.create(messageData);
    const savedMessage = await this.messagesRepository.save(message);

    // Update conversation's updatedAt timestamp
    await this.conversationsRepository.update(
      messageData.conversationId,
      { updatedAt: new Date() }
    );

    // Generate agent response if this is a user message
    if (this.isUserRole(messageData.role)) {
      // Don't await this to avoid blocking the user message response
      this.generateAgentResponse(conversation, messageData.content).catch(error => {
        console.error('Failed to generate agent response:', error);
      });
    }

    return savedMessage;
  }

  private isUserRole(role: string): boolean {
    const userRoles = ['user', 'human', 'person'];
    return userRoles.includes(role.toLowerCase());
  }

  private async generateAgentResponse(conversation: any, userMessage: string): Promise<void> {
    try {
      const startTime = Date.now();
      const model = conversation.agent?.configuration?.model || 'qwen2.5-coder:7b';
      
      // Check if this is an Ollama model and if we should attempt to use it
      const isOllamaModel = this.isOllamaModel(model);
      let agentResponse: string;
      
      if (isOllamaModel) {
        // Check if Ollama is available before making the call
        const isOllamaHealthy = await this.checkOllamaHealth();
        console.log(`Ollama health check result: ${isOllamaHealthy} for model: ${model}`);
        
        if (isOllamaHealthy) {
          try {
            // Use streaming API which handles message creation internally
            await this.callOllamaAPIStreaming(userMessage, model, conversation);
            return; // Exit early since streaming handles message creation
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
        // For non-Ollama models, provide a helpful message
        agentResponse = `🤖 **External API Model Selected**

This agent is configured to use "${model}" which requires external API access.

**Your message:** "${userMessage}"

**To enable this model:**
1. Configure the appropriate API key in your environment variables
2. Ensure the model provider service is accessible

**Available in local development:**
- Message storage and conversation history
- Agent configuration management
- Switch to Ollama models when available`;
      }
      
      const responseTime = Date.now() - startTime;
      
      // Create agent response message
      const agentMessageData = {
        conversationId: conversation.id,
        role: 'agent',
        content: agentResponse,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: model,
          responseTime: responseTime,
          provider: isOllamaModel ? 'ollama' : 'external'
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

  private async checkOllamaHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached result if recent, but only if it was false (failed)
    // If it was true (success), recheck more frequently to catch failures
    if (this.ollamaAvailable !== null && (now - this.lastOllamaCheck) < this.OLLAMA_CHECK_INTERVAL) {
      if (!this.ollamaAvailable) {
        return this.ollamaAvailable; // Keep using cached false result
      }
      // For true results, recheck more frequently (every 10 seconds)
      if ((now - this.lastOllamaCheck) < 10000) {
        return this.ollamaAvailable;
      }
    }

    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Quick health check
      
      console.log(`Checking Ollama health at: ${ollamaUrl}/api/version`);
      
      const response = await fetch(`${ollamaUrl}/api/version`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      this.ollamaAvailable = response.ok;
      this.lastOllamaCheck = now;
      
      console.log(`Ollama health check: ${response.ok ? 'HEALTHY' : 'UNHEALTHY'} (status: ${response.status})`);
      
      return this.ollamaAvailable;
    } catch (error) {
      console.log(`Ollama health check failed: ${error.message}`);
      this.ollamaAvailable = false;
      this.lastOllamaCheck = now;
      return false;
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
      
      // Add timeout for local environments where Ollama might not be available
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout for streaming
      
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
          stream: true,
          options: {
            temperature: 0.3,
            top_p: 0.8,
            num_predict: 1024
          }
        }),
        signal: controller.signal,
      });

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
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Streaming completed, total content length:', fullContent.length);
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              hasReceivedData = true;
              
              if (data.message?.content) {
                fullContent += data.message.content;
                
                // Update the message in database less frequently to reduce load
                // Update every 100 characters or every 2 seconds, whichever comes first
                const shouldUpdate = fullContent.length % 100 === 0 || 
                                   data.done || 
                                   (Date.now() - startTime) % 2000 < 100;
                
                if (shouldUpdate) {
                  await this.messagesRepository.update(savedMessage.id, {
                    content: fullContent,
                    metadata: {
                      ...agentMessageData.metadata,
                      streaming: !data.done,
                      lastUpdate: new Date().toISOString()
                    } as Record<string, any>
                  });
                }
              }
              
              if (data.done) {
                console.log('Received done signal, finalizing response');
                // Final update with complete response
                await this.messagesRepository.update(savedMessage.id, {
                  content: fullContent || 'I apologize, but I was unable to generate a response at this time.',
                  metadata: {
                    ...agentMessageData.metadata,
                    streaming: false,
                    completed: true,
                    responseTime: Date.now() - startTime,
                    finalUpdate: new Date().toISOString()
                  } as Record<string, any>
                });
                return fullContent;
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
          await this.messagesRepository.update(savedMessage.id, {
            content: fullContent,
            metadata: {
              ...agentMessageData.metadata,
              streaming: false,
              completed: true,
              responseTime: Date.now() - startTime,
              finalUpdate: new Date().toISOString()
            } as Record<string, any>
          });
        }
      } finally {
        reader.releaseLock();
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

  async remove(id: string): Promise<void> {
    const conversation = await this.findOne(id);
    await this.conversationsRepository.remove(conversation);
  }
}