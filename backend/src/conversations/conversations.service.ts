import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { CreateConversationDto } from '../dto/create-conversation.dto';
// CreateMessageDto import removed - using plain object type instead

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async findByAgent(agentId: string): Promise<Conversation[]> {
    return this.conversationsRepository.find({
      where: { agentId },
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

  async create(createConversationDto: CreateConversationDto): Promise<Conversation> {
    const conversation = this.conversationsRepository.create({
      ...createConversationDto,
      // TODO: Replace with actual userId when user management is implemented
      userId: 'default-user',
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
      
      // Generate response using Ollama
      const agentResponse = await this.callOllamaAPI(userMessage, conversation.agent?.configuration?.model || 'qwen2.5-coder:7b');
      const responseTime = Date.now() - startTime;
      
      // Create agent response message
      const agentMessageData = {
        conversationId: conversation.id,
        role: 'agent',
        content: agentResponse,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: conversation.agent?.configuration?.model || 'qwen2.5-coder:7b',
          responseTime: responseTime
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

  private async callOllamaAPI(userMessage: string, model: string): Promise<string> {
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const apiUrl = `${ollamaUrl}/api/chat`;
      console.log('Calling Ollama API:', apiUrl, 'with model:', model);
      
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
            temperature: 0.7,
            top_p: 0.9
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || 'I apologize, but I was unable to generate a response at this time.';
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      return `I apologize, but I encountered an error while processing your request. Please try again later. (Error: ${error.message})`;
    }
  }

  async remove(id: string): Promise<void> {
    const conversation = await this.findOne(id);
    await this.conversationsRepository.remove(conversation);
  }
}