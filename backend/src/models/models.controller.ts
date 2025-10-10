import { Controller, Get, Post, Delete, Body, HttpStatus, HttpException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import type { APIResponse } from '@agentdb9/shared';
import { Request } from 'express';

@ApiTags('models')
@ApiBearerAuth()
@Controller('api/models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available models' })
  @ApiResponse({ status: 200, description: 'List of all models' })
  async getModels(@Req() req: Request): Promise<APIResponse> {
    try {
      // Get userId from authenticated user
      const userId = (req.user as any)?.id;
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