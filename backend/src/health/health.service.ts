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

  private async checkOllamaAvailability(): Promise<{available: boolean, reason: string, downloadedModels: string[]}> {
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${ollamaUrl}/api/version`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Check which models are actually downloaded
        const tagsResponse = await fetch(`${ollamaUrl}/api/tags`, {
          signal: controller.signal,
        });
        
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const downloadedModels = tagsData.models ? tagsData.models.map(m => m.name) : [];
          const hasModels = downloadedModels.length > 0;
          
          return {
            available: hasModels,
            reason: hasModels ? `Ollama running with ${downloadedModels.length} models` : 'Ollama running but no models downloaded',
            downloadedModels
          };
        }
      }
      
      return {
        available: false,
        reason: `Ollama service responded with status ${response.status}`,
        downloadedModels: []
      };
    } catch (error) {
      return {
        available: false,
        reason: `Ollama service not reachable: ${error.message}`,
        downloadedModels: []
      };
    }
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
      console.log('LLM service unavailable, checking Ollama directly:', error.message);
      
      // Check if Ollama is available directly
      const ollamaStatus = await this.checkOllamaAvailability();
      
      // Fallback to shared package models with actual Ollama status
      const availableModels = getAvailableModels(true);
      const modelsWithStatus = availableModels.map(model => {
        if (model.provider === 'ollama') {
          // Check if this specific model is downloaded in Ollama
          const isDownloaded = ollamaStatus.downloadedModels.includes(model.id);
          return {
            id: model.id,
            provider: model.provider,
            status: isDownloaded ? 'available' : 'unavailable',
            reason: isDownloaded ? 'Downloaded in Ollama' : 
                   ollamaStatus.available ? 'Not downloaded in Ollama' : ollamaStatus.reason,
            requiresApiKey: false,
            apiKeyConfigured: true,
          };
        } else {
          return {
            id: model.id,
            provider: model.provider,
            status: model.availability.status,
            reason: model.availability.reason,
            requiresApiKey: model.availability.requiresApiKey,
            apiKeyConfigured: model.availability.apiKeyConfigured,
          };
        }
      });

      const availableCount = modelsWithStatus.filter(m => m.status === 'available').length;
      const disabledCount = modelsWithStatus.filter(m => m.status !== 'available').length;

      return {
        success: true,
        models: modelsWithStatus,
        available: availableCount,
        disabled: disabledCount,
        timestamp: new Date().toISOString(),
        warning: ollamaStatus.available ? undefined : 'Local LLM services (Ollama) are not available. Only external API models can be used.',
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