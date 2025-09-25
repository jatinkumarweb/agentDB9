import { Controller, Get, Post, Delete, Body, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import type { APIResponse } from '@agentdb9/shared';

@ApiTags('models')
@Controller('api/models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

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