import { Controller, Get, Post, Patch, Body, Param, Query, HttpStatus, HttpException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { AddMessageDto } from '../dto/add-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { APIResponse } from '@agentdb9/shared';
import { RateLimitGuard, RateLimit, RateLimitWindow } from '../common/guards/rate-limit.guard';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('api/conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get conversations by agent ID' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async findByAgent(@Query('agentId') agentId: string, @CurrentUser() user: any): Promise<APIResponse> {
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
      const conversations = await this.conversationsService.findByAgent(agentId, user.id);
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
  async findConversationsByAgent(@Param('agentId') agentId: string, @CurrentUser() user: any): Promise<APIResponse> {
    try {
      const conversations = await this.conversationsService.findByAgent(agentId, user.id);
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
  @UseGuards(RateLimitGuard)
  @RateLimit(20)  // 20 conversation creations
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  @ApiResponse({ status: 429, description: 'Too many conversation creation attempts' })
  async create(@Body() createConversationDto: CreateConversationDto, @CurrentUser() user: any): Promise<APIResponse> {
    try {
      const conversation = await this.conversationsService.create(createConversationDto, user.id);
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
  @UseGuards(RateLimitGuard)
  @RateLimit(30)  // 30 messages
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Add a message to a conversation' })
  @ApiResponse({ status: 201, description: 'Message added successfully' })
  @ApiResponse({ status: 429, description: 'Too many messages sent' })
  async addMessage(@Param('id') id: string, @Body() addMessageDto: AddMessageDto): Promise<APIResponse> {
    try {
      // Create full message data with conversationId from URL parameter
      const messageData = { 
        ...addMessageDto, 
        conversationId: id 
      };
      const message = await this.conversationsService.addMessage(messageData);
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

  @Post(':id/messages/:messageId/stop')
  @ApiOperation({ summary: 'Stop generation for a specific message' })
  @ApiResponse({ status: 200, description: 'Generation stopped successfully' })
  async stopGeneration(
    @Param('id') conversationId: string, 
    @Param('messageId') messageId: string
  ): Promise<APIResponse> {
    try {
      await this.conversationsService.stopGeneration(conversationId, messageId);
      return {
        success: true,
        data: { message: 'Generation stopped successfully' },
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

  @Patch(':id/messages/:messageId/feedback')
  @ApiOperation({ summary: 'Add or update feedback for a message' })
  @ApiResponse({ status: 200, description: 'Feedback updated successfully' })
  async updateMessageFeedback(
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: { feedback: 'negative' | 'neutral' | 'positive' | null },
    @CurrentUser() user: any
  ): Promise<APIResponse> {
    try {
      const message = await this.conversationsService.updateMessageFeedback(
        conversationId,
        messageId,
        body.feedback,
        user.id
      );
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