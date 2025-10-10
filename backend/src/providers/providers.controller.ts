import { Controller, Get, Post, Delete, Body, Query, HttpStatus, HttpException, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import type { APIResponse } from '@agentdb9/shared';

@ApiTags('providers')
@ApiBearerAuth()
@Controller('api/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get provider configurations' })
  @ApiResponse({ status: 200, description: 'Provider configurations retrieved' })
  async getProviderConfigs(@Request() req): Promise<APIResponse> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'User not authenticated',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      const configs = await this.providersService.getProviderConfigs(userId);
      return {
        success: true,
        data: configs,
      };
    } catch (error) {
      // Re-throw HttpExceptions as-is
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

  @Get('status')
  @ApiOperation({ summary: 'Get API key configuration status for all providers' })
  @ApiResponse({ status: 200, description: 'Provider status retrieved' })
  async getProviderStatus(@Request() req, @Query('userId') queryUserId?: string): Promise<APIResponse> {
    try {
      // Allow userId from query param (for internal service calls) or from auth token
      const userId = queryUserId || req.user?.id;
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'User ID required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const status = await this.providersService.getProviderStatus(userId);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      // Re-throw HttpExceptions as-is
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

  @Post('config')
  @ApiOperation({ summary: 'Update provider configuration' })
  @ApiResponse({ status: 200, description: 'Provider configuration updated' })
  async updateProviderConfig(
    @Request() req,
    @Body() body: { provider: string; apiKey: string }
  ): Promise<APIResponse> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'User not authenticated',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      const result = await this.providersService.updateProviderConfig(
        userId,
        body.provider,
        body.apiKey
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Re-throw HttpExceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('config/:provider')
  @ApiOperation({ summary: 'Remove provider API key' })
  @ApiResponse({ status: 200, description: 'Provider API key removed' })
  async removeProviderConfig(
    @Request() req,
    @Param('provider') provider: string
  ): Promise<APIResponse> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'User not authenticated',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      const result = await this.providersService.removeProviderConfig(userId, provider);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Re-throw HttpExceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }
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