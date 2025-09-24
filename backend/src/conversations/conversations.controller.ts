import { Controller, Get, Post, Body, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { CreateMessageDto } from '../dto/create-message.dto';
import { APIResponse } from '@agentdb9/shared';

@ApiTags('conversations')
@Controller('api/conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get conversations by agent ID' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async findByAgent(@Query('agentId') agentId: string): Promise<APIResponse> {
    if (!agentId) {
      throw new HttpException(
        {
          success: false,
          error: 'Agent ID is required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const conversations = await this.conversationsService.findByAgent(agentId);
      return {
        success: true,
        data: conversations,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Get conversations for a specific agent' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async findConversationsByAgent(@Param('agentId') agentId: string): Promise<APIResponse> {
    try {
      const conversations = await this.conversationsService.findByAgent(agentId);
      return {
        success: true,
        data: conversations,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findOne(@Param('id') id: string): Promise<APIResponse> {
    try {
      const conversation = await this.conversationsService.findOne(id);
      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async create(@Body() createConversationDto: CreateConversationDto): Promise<APIResponse> {
    try {
      const conversation = await this.conversationsService.create(createConversationDto);
      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(@Param('id') id: string): Promise<APIResponse> {
    try {
      const messages = await this.conversationsService.getMessages(id);
      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add a message to a conversation' })
  @ApiResponse({ status: 201, description: 'Message added successfully' })
  async addMessage(@Param('id') id: string, @Body() createMessageDto: CreateMessageDto): Promise<APIResponse> {
    try {
      createMessageDto.conversationId = id;
      const message = await this.conversationsService.addMessage(createMessageDto);
      return {
        success: true,
        data: message,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}