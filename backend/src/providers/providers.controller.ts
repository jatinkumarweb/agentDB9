import { Controller, Get, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import type { APIResponse } from '@agentdb9/shared';

@ApiTags('providers')
@Controller('api/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get provider configurations' })
  @ApiResponse({ status: 200, description: 'Provider configurations retrieved' })
  async getProviderConfigs(): Promise<APIResponse> {
    try {
      const configs = await this.providersService.getProviderConfigs();
      return {
        success: true,
        data: configs,
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

  @Post('config')
  @ApiOperation({ summary: 'Update provider configuration' })
  @ApiResponse({ status: 200, description: 'Provider configuration updated' })
  async updateProviderConfig(
    @Body() body: { provider: string; apiKey: string }
  ): Promise<APIResponse> {
    try {
      const result = await this.providersService.updateProviderConfig(
        body.provider,
        body.apiKey
      );
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