import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, HttpException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { APIResponse } from '@agentdb9/shared';
import { RateLimitGuard, RateLimit, RateLimitWindow } from '../common/guards/rate-limit.guard';

@ApiTags('agents')
@ApiBearerAuth()
@Controller('api/agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all agents' })
  @ApiResponse({ status: 200, description: 'List of agents retrieved successfully' })
  async findAll(@CurrentUser() user: any, @Query('includeAvailability') includeAvailability?: string): Promise<APIResponse> {
    try {
      const agents = await this.agentsService.findAll(user.id);
      
      // If includeAvailability is requested, check model availability
      if (includeAvailability === 'true') {
        const agentsWithAvailability = await this.agentsService.checkAgentsAvailability(agents);
        return {
          success: true,
          data: agentsWithAvailability,
        };
      }
      
      return {
        success: true,
        data: agents,
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
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async findOne(@Param('id') id: string): Promise<APIResponse> {
    try {
      const agent = await this.agentsService.findOne(id);
      if (!agent) {
        throw new HttpException(
          {
            success: false,
            error: 'Agent not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        data: agent,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(10)  // 10 agent creations
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 429, description: 'Too many agent creation attempts' })
  async create(@Body() createAgentDto: CreateAgentDto, @CurrentUser() user: any): Promise<APIResponse> {
    try {
      const agent = await this.agentsService.create(createAgentDto, user.id);
      return {
        success: true,
        data: agent,
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

  @Put(':id')
  @ApiOperation({ summary: 'Update an agent' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateAgentDto>): Promise<APIResponse> {
    try {
      const agent = await this.agentsService.update(id, updateData);
      return {
        success: true,
        data: agent,
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async remove(@Param('id') id: string): Promise<APIResponse> {
    try {
      await this.agentsService.remove(id);
      return {
        success: true,
        message: 'Agent deleted successfully',
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

  @Post(':id/tasks')
  @UseGuards(RateLimitGuard)
  @RateLimit(30)  // 30 task executions
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Execute a task with an agent' })
  @ApiResponse({ status: 200, description: 'Task executed successfully' })
  @ApiResponse({ status: 429, description: 'Too many task execution attempts' })
  async executeTask(@Param('id') id: string, @Body() taskData: any): Promise<APIResponse> {
    try {
      const result = await this.agentsService.executeTask(id, taskData);
      return {
        success: true,
        data: result,
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

  @Post('chat')
  @UseGuards(RateLimitGuard)
  @RateLimit(30)  // 30 chat messages
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Chat with AI agent' })
  @ApiResponse({ status: 200, description: 'Agent response generated successfully' })
  @ApiResponse({ status: 429, description: 'Too many chat requests' })
  async chat(@Body() chatData: { message: string; context?: any }, @CurrentUser() user: any): Promise<APIResponse> {
    try {
      const result = await this.agentsService.processChat(chatData.message, {
        ...chatData.context,
        userId: user.id,
        userEmail: user.email,
        userName: user.username
      });
      
      return {
        success: true,
        data: result,
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

  @Post(':id/chat')
  @UseGuards(RateLimitGuard)
  @RateLimit(30)  // 30 chat messages
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Chat with specific AI agent' })
  @ApiResponse({ status: 200, description: 'Agent response generated successfully' })
  @ApiResponse({ status: 429, description: 'Too many chat requests' })
  async chatWithAgent(
    @Param('id') agentId: string,
    @Body() chatData: { message: string; context?: any },
    @CurrentUser() user: any
  ): Promise<APIResponse> {
    try {
      const result = await this.agentsService.processChatWithAgent(agentId, chatData.message, {
        ...chatData.context,
        userId: user.id,
        userEmail: user.email,
        userName: user.username
      });
      
      return {
        success: true,
        data: result,
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
}