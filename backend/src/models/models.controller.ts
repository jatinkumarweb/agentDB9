import { Controller, Get, Post, Delete, Body, HttpStatus, HttpException, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import type { APIResponse } from '@agentdb9/shared';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('models')
@Controller('api/models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all available models' })
  @ApiResponse({ status: 200, description: 'List of all models' })
  async getModels(@Req() req: Request): Promise<APIResponse> {
    console.log('[ModelsController] ===== GET /api/models CALLED =====');
    console.log('[ModelsController] Headers:', JSON.stringify(req.headers));
    console.log('[ModelsController] req.user:', req.user);
    try {
      // Get userId from authenticated user
      const userId = (req.user as any)?.id;
      console.log('[ModelsController] getModels called, userId:', userId, 'type:', typeof userId);
      
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'User not authenticated',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      
      const result = await this.modelsService.getModels(userId);
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('download')
  @ApiOperation({ summary: 'Download a model' })
  @ApiResponse({ status: 200, description: 'Model download initiated' })
  async downloadModel(@Body() body: { modelId: string }): Promise<APIResponse> {
    try {
      const result = await this.modelsService.downloadModel(body.modelId);
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('remove')
  @ApiOperation({ summary: 'Remove a model' })
  @ApiResponse({ status: 200, description: 'Model removal initiated' })
  async removeModel(@Body() body: { modelId: string }): Promise<APIResponse> {
    try {
      const result = await this.modelsService.removeModel(body.modelId);
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
}