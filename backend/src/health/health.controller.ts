import { Controller, Get, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import type { APIResponse } from '@agentdb9/shared';

@ApiTags('health')
@Controller()
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

  @Get('api/models')
  @ApiOperation({ summary: 'Get available models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async getModels(): Promise<APIResponse> {
    try {
      const models = await this.healthService.getModels();
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
}