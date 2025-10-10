import { Controller, Get, Post, Body, Request, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';
import type { APIResponse } from '@agentdb9/shared';

@ApiTags('health')
@Controller()
@Public() // Make all health endpoints public
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('api/status')
  @ApiOperation({ summary: 'API status endpoint' })
  @ApiResponse({ status: 200, description: 'API status retrieved' })
  getStatus(): APIResponse {
    return {
      success: true,
      message: 'AgentDB9 Backend API is running',
      data: {
        version: '2.0.0',
        framework: 'NestJS',
        database: 'PostgreSQL with TypeORM',
      },
    };
  }

  // Renamed to avoid conflict with ModelsController
  // This is a legacy endpoint for health checks only
  @Get('api/health/models')
  @ApiOperation({ summary: 'Get available models (health check)' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async getModelsHealth(@Request() req): Promise<APIResponse> {
    try {
      const userId = req.user?.id;
      const models = await this.healthService.getModels(userId);
      return {
        success: true,
        data: models,
      };
    } catch (error) {
      // Use the service's fallback logic instead of hardcoded models
      const fallbackModels = await this.healthService.getModels();
      return {
        success: true,
        data: fallbackModels,
      };
    }
  }

  @Post('api/test/environment')
  @ApiOperation({ summary: 'Test environment health' })
  @ApiResponse({ status: 200, description: 'Environment test completed' })
  async testEnvironment(@Body() testData: any): Promise<APIResponse> {
    try {
      const result = await this.healthService.testEnvironment(testData);
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

  @Get('api/test/database')
  @ApiOperation({ summary: 'Test database connection' })
  @ApiResponse({ status: 200, description: 'Database test completed' })
  async testDatabase(): Promise<any> {
    return this.healthService.testDatabase();
  }

  @Get('api/test/redis')
  @ApiOperation({ summary: 'Test Redis connection' })
  @ApiResponse({ status: 200, description: 'Redis test completed' })
  async testRedis(): Promise<any> {
    return this.healthService.testRedis();
  }

  @Post('api/vscode/setup-extensions')
  @ApiOperation({ summary: 'Setup VS Code extensions' })
  @ApiResponse({ status: 200, description: 'Extensions setup initiated' })
  async setupVSCodeExtensions(): Promise<APIResponse> {
    return this.healthService.setupVSCodeExtensions();
  }

  @Get('api/debug/ollama')
  @ApiOperation({ summary: 'Debug Ollama connection' })
  @ApiResponse({ status: 200, description: 'Ollama debug information' })
  async debugOllama(): Promise<APIResponse> {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    try {
      // Test connection
      const response = await fetch(`${ollamaHost}/api/version`);
      const version = response.ok ? await response.json() : null;
      
      // Test models
      const modelsResponse = await fetch(`${ollamaHost}/api/tags`);
      const models = modelsResponse.ok ? await modelsResponse.json() : null;
      
      return {
        success: true,
        data: {
          ollamaHost,
          environmentVariable: process.env.OLLAMA_HOST,
          connection: {
            accessible: response.ok,
            status: response.status,
            version: version
          },
          models: models,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          ollamaHost,
          environmentVariable: process.env.OLLAMA_HOST,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}