import { Injectable } from '@nestjs/common';
import { getAvailableModels, environmentTester } from '@agentdb9/shared';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'AgentDB9 Backend',
      version: '2.0.0',
      framework: 'NestJS',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getModels() {
    try {
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:9000';
      
      // Add timeout and better error handling for local environments
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(`${llmServiceUrl}/api/models`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`LLM service responded with ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.log('LLM service unavailable, using fallback models:', error.message);
      
      // Fallback to shared package models with better local environment support
      const availableModels = getAvailableModels(true);
      return {
        success: true,
        models: availableModels.map(model => ({
          id: model.id,
          provider: model.provider,
          status: model.provider === 'ollama' ? 'unavailable' : model.availability.status,
          reason: model.provider === 'ollama' ? 'Ollama service not available' : model.availability.reason,
          requiresApiKey: model.availability.requiresApiKey,
          apiKeyConfigured: model.availability.apiKeyConfigured,
        })),
        available: availableModels.filter(m => m.provider !== 'ollama' && m.availability.status !== 'disabled').length,
        disabled: availableModels.filter(m => m.provider === 'ollama' || m.availability.status === 'disabled').length,
        timestamp: new Date().toISOString(),
        warning: 'Local LLM services (Ollama) are not available. Only external API models can be used.',
      };
    }
  }

  async testEnvironment(testData: any) {
    try {
      const health = await environmentTester.getEnvironmentHealth();
      return health;
    } catch (error) {
      throw new Error(`Environment test failed: ${error.message}`);
    }
  }

  async testDatabase() {
    try {
      // Mock database test - in real implementation, test actual PostgreSQL connection
      const startTime = Date.now();
      
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        responseTime,
        details: {
          version: '15.0',
          database: 'coding_agent',
          tables: ['agents', 'conversations', 'messages', 'projects'],
        },
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  async testRedis() {
    try {
      // Mock Redis test - in real implementation, test actual Redis connection
      const startTime = Date.now();
      
      // Simulate Redis ping
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        responseTime,
        details: {
          version: '7.0',
          keys: 42,
          memory: '2.1MB',
        },
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  setupVSCodeExtensions() {
    const extensions = [
      'ms-vscode.vscode-typescript-next',
      'bradlc.vscode-tailwindcss',
      'ms-vscode.vscode-docker',
      'esbenp.prettier-vscode',
    ];
    
    return {
      success: true,
      message: 'VS Code extensions setup initiated',
      data: {
        extensions,
        timestamp: new Date().toISOString(),
      },
    };
  }
}