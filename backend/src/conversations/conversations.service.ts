import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { CreateMessageDto } from '../dto/create-message.dto';

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
    const conversation = this.conversationsRepository.create(createConversationDto);
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

  async addMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    // Verify conversation exists
    await this.findOne(createMessageDto.conversationId);
    
    const message = this.messagesRepository.create(createMessageDto);
    const savedMessage = await this.messagesRepository.save(message);

    // Update conversation's updatedAt timestamp
    await this.conversationsRepository.update(
      createMessageDto.conversationId,
      { updatedAt: new Date() }
    );

    return savedMessage;
  }

  async remove(id: string): Promise<void> {
    const conversation = await this.findOne(id);
    await this.conversationsRepository.remove(conversation);
  }
}