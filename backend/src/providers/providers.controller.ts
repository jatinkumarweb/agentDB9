import { Controller, Get, Post, Delete, Body, Query, HttpStatus, HttpException, Request, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import type { APIResponse } from '@agentdb9/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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

  @Public() // Allow internal service calls (LLM service needs this)
  @Get('key/:provider')
  @ApiOperation({ summary: 'Get API key for a specific provider' })
  @ApiResponse({ status: 200, description: 'API key retrieved' })
  async getProviderKey(
    @Param('provider') provider: string,
    @Query('userId') userId?: string
  ): Promise<APIResponse> {
    try {
      console.log('[ProvidersController] getProviderKey called for provider:', provider, 'userId:', userId);
      
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'User ID required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      const apiKey = await this.providersService.getApiKey(userId, provider);
      
      if (!apiKey) {
        return {
          success: false,
          error: 'API key not configured for this provider',
        };
      }
      
      return {
        success: true,
        data: { apiKey },
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

  @Public() // Allow internal service calls without authentication
  @Get('status')
  @ApiOperation({ summary: 'Get API key configuration status for all providers' })
  @ApiResponse({ status: 200, description: 'Provider status retrieved' })
  async getProviderStatus(@Request() req, @Query('userId') queryUserId?: string): Promise<APIResponse> {
    try {
      console.log('[ProvidersController] getProviderStatus called with queryUserId:', queryUserId, 'req.user?.id:', req.user?.id);
      
      // Allow userId from query param (for internal service calls) or from auth token
      const userId = queryUserId || req.user?.id;
      
      console.log('[ProvidersController] Using userId:', userId);
      
      if (!userId) {
        console.error('[ProvidersController] No userId provided');
        throw new HttpException(
          {
            success: false,
            error: 'User ID required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      const status = await this.providersService.getProviderStatus(userId);
      console.log('[ProvidersController] Provider status result:', JSON.stringify(status));
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      console.error('[ProvidersController] Error in getProviderStatus:', error);
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