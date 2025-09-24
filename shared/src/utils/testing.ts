// Environment testing utilities

import { ServiceStatus, EnvironmentTest, TestSuite, ModelTest, DatabaseTest, EnvironmentHealth } from '../types/testing';

export class EnvironmentTester {
  private baseUrls = {
    frontend: 'http://localhost:3000',
    backend: 'http://localhost:8000',
    llmService: 'http://localhost:9000',
    vscode: 'http://localhost:8080',
    ollama: 'http://localhost:11434',
    qdrant: 'http://localhost:6333',
    postgres: 'postgresql://postgres:password@localhost:5432/coding_agent',
    redis: 'redis://localhost:6379'
  };

  async checkServiceHealth(name: string, url: string, timeout = 5000): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          name,
          url,
          status: 'healthy',
          responseTime,
          lastChecked: new Date(),
          version: data.version,
          details: data
        };
      } else {
        return {
          name,
          url,
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          lastChecked: new Date()
        };
      }
    } catch (error) {
      return {
        name,
        url,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      };
    }
  }

  async testModelAvailability(modelId: string, provider: string): Promise<ModelTest> {
    const testPrompt = 'Hello, this is a test. Please respond with "Test successful".';
    const startTime = Date.now();
    
    try {
      // First check if model is available
      const modelsResponse = await fetch(`${this.baseUrls.llmService}/api/models`);
      
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const modelInfo = modelsData.models?.find((m: any) => m.id === modelId);
        
        if (modelInfo) {
          // If model is disabled, return disabled status instead of testing
          if (modelInfo.status === 'disabled') {
            return {
              modelId,
              provider,
              available: false,
              status: 'disabled',
              reason: modelInfo.reason || 'Model is disabled',
              requiresApiKey: modelInfo.requiresApiKey || false,
              apiKeyConfigured: modelInfo.apiKeyConfigured || false,
              responseTime: Date.now() - startTime,
              testPrompt,
              timestamp: new Date()
            };
          }
        }
      }
      
      // Test model inference
      const response = await fetch(`${this.baseUrls.llmService}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testPrompt,
          modelId,
          provider,
          maxTokens: 50,
          temperature: 0.1
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          modelId,
          provider,
          available: true,
          status: 'available',
          requiresApiKey: false,
          apiKeyConfigured: true,
          responseTime,
          testPrompt,
          response: data.data?.content || 'No response content',
          timestamp: new Date()
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle disabled model response
        if (response.status === 400 && errorData.reason) {
          return {
            modelId,
            provider,
            available: false,
            status: 'disabled',
            reason: errorData.reason,
            requiresApiKey: errorData.requiresApiKey || false,
            apiKeyConfigured: errorData.apiKeyConfigured || false,
            responseTime,
            testPrompt,
            timestamp: new Date()
          };
        }
        
        return {
          modelId,
          provider,
          available: false,
          status: 'error',
          requiresApiKey: false,
          apiKeyConfigured: false,
          responseTime,
          testPrompt,
          error: `HTTP ${response.status}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        modelId,
        provider,
        available: false,
        status: 'error',
        requiresApiKey: false,
        apiKeyConfigured: false,
        responseTime: Date.now() - startTime,
        testPrompt,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  async testDatabaseConnection(type: 'postgresql' | 'redis' | 'qdrant'): Promise<DatabaseTest> {
    const startTime = Date.now();
    
    try {
      let endpoint = '';
      switch (type) {
        case 'postgresql':
          endpoint = `${this.baseUrls.backend}/api/test/database`;
          break;
        case 'redis':
          endpoint = `${this.baseUrls.backend}/api/test/redis`;
          break;
        case 'qdrant':
          endpoint = `${this.baseUrls.qdrant}/collections`;
          break;
      }
      
      const response = await fetch(endpoint);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          type,
          connected: true,
          responseTime,
          details: data
        };
      } else {
        return {
          type,
          connected: false,
          responseTime,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        type,
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async runConnectivityTests(): Promise<TestSuite> {
    const tests: EnvironmentTest[] = [];
    const startTime = new Date();
    
    // Test all services
    const services = [
      { name: 'Frontend', url: this.baseUrls.frontend },
      { name: 'Backend', url: this.baseUrls.backend },
      { name: 'LLM Service', url: this.baseUrls.llmService },
      { name: 'VS Code Server', url: this.baseUrls.vscode },
      { name: 'Ollama', url: this.baseUrls.ollama },
      { name: 'Qdrant', url: this.baseUrls.qdrant }
    ];
    
    for (const service of services) {
      const test: EnvironmentTest = {
        id: `connectivity-${service.name.toLowerCase().replace(' ', '-')}`,
        name: `${service.name} Connectivity`,
        description: `Test if ${service.name} is accessible`,
        category: 'connectivity',
        status: 'running',
        timestamp: new Date()
      };
      
      const startTestTime = Date.now();
      const status = await this.checkServiceHealth(service.name, service.url);
      const duration = Date.now() - startTestTime;
      
      test.status = status.status === 'healthy' ? 'passed' : 'failed';
      test.duration = duration;
      test.error = status.error;
      test.result = status;
      
      tests.push(test);
    }
    
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      skipped: tests.filter(t => t.status === 'skipped').length
    };
    
    return {
      id: 'connectivity-suite',
      name: 'Service Connectivity Tests',
      description: 'Test connectivity to all services',
      tests,
      status: 'completed',
      startTime,
      endTime: new Date(),
      summary
    };
  }

  async runModelTests(): Promise<TestSuite> {
    const tests: EnvironmentTest[] = [];
    const startTime = new Date();
    
    const modelsToTest = [
      { id: 'codellama:7b', provider: 'ollama' },
      { id: 'deepseek-coder:6.7b', provider: 'ollama' },
      { id: 'mistral:7b', provider: 'ollama' },
      { id: 'gpt-4', provider: 'openai' },
      { id: 'claude-3-sonnet', provider: 'anthropic' }
    ];
    
    for (const model of modelsToTest) {
      const test: EnvironmentTest = {
        id: `model-${model.id.replace(':', '-')}`,
        name: `${model.id} Model Test`,
        description: `Test ${model.id} model availability and response`,
        category: 'functionality',
        status: 'running',
        timestamp: new Date()
      };
      
      const startTestTime = Date.now();
      const result = await this.testModelAvailability(model.id, model.provider);
      const duration = Date.now() - startTestTime;
      
      // Handle different model statuses
      if (result.status === 'disabled') {
        // Disabled models are not failures, they're expected when API keys are missing
        test.status = result.requiresApiKey && !result.apiKeyConfigured ? 'skipped' : 'passed';
        test.error = result.reason;
      } else if (result.available) {
        test.status = 'passed';
      } else {
        test.status = 'failed';
        test.error = result.error;
      }
      
      test.duration = duration;
      test.result = result;
      
      tests.push(test);
    }
    
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      skipped: tests.filter(t => t.status === 'skipped').length
    };
    
    return {
      id: 'model-suite',
      name: 'Model Availability Tests',
      description: 'Test availability and functionality of AI models',
      tests,
      status: 'completed',
      startTime,
      endTime: new Date(),
      summary
    };
  }

  async runDatabaseTests(): Promise<TestSuite> {
    const tests: EnvironmentTest[] = [];
    const startTime = new Date();
    
    const databases: Array<'postgresql' | 'redis' | 'qdrant'> = ['postgresql', 'redis', 'qdrant'];
    
    for (const db of databases) {
      const test: EnvironmentTest = {
        id: `database-${db}`,
        name: `${db.toUpperCase()} Connection Test`,
        description: `Test connection to ${db} database`,
        category: 'connectivity',
        status: 'running',
        timestamp: new Date()
      };
      
      const startTestTime = Date.now();
      const result = await this.testDatabaseConnection(db);
      const duration = Date.now() - startTestTime;
      
      test.status = result.connected ? 'passed' : 'failed';
      test.duration = duration;
      test.error = result.error;
      test.result = result;
      
      tests.push(test);
    }
    
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      skipped: tests.filter(t => t.status === 'skipped').length
    };
    
    return {
      id: 'database-suite',
      name: 'Database Connection Tests',
      description: 'Test connections to all databases',
      tests,
      status: 'completed',
      startTime,
      endTime: new Date(),
      summary
    };
  }

  async getEnvironmentHealth(): Promise<EnvironmentHealth> {
    const [connectivitySuite, modelSuite, databaseSuite] = await Promise.all([
      this.runConnectivityTests(),
      this.runModelTests(),
      this.runDatabaseTests()
    ]);
    
    const allTests = [
      ...connectivitySuite.tests,
      ...modelSuite.tests,
      ...databaseSuite.tests
    ];
    
    const failedTests = allTests.filter(t => t.status === 'failed');
    const passedTests = allTests.filter(t => t.status === 'passed');
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (failedTests.length === 0) {
      overall = 'healthy';
    } else if (failedTests.length < allTests.length / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }
    
    const issues = failedTests.map(t => `${t.name}: ${t.error || 'Failed'}`);
    const recommendations = this.generateRecommendations(failedTests);
    
    return {
      overall,
      services: connectivitySuite.tests.map(t => t.result as ServiceStatus).filter(Boolean),
      models: modelSuite.tests.map(t => t.result as ModelTest).filter(Boolean),
      databases: databaseSuite.tests.map(t => t.result as DatabaseTest).filter(Boolean),
      lastUpdated: new Date(),
      uptime: Date.now(), // This would be calculated from actual uptime
      issues,
      recommendations
    };
  }

  private generateRecommendations(failedTests: EnvironmentTest[]): string[] {
    const recommendations: string[] = [];
    
    failedTests.forEach(test => {
      if (test.id.includes('connectivity')) {
        recommendations.push(`Check if ${test.name} service is running and accessible`);
      } else if (test.id.includes('model')) {
        const result = test.result as ModelTest;
        if (result?.status === 'disabled' && result?.requiresApiKey && !result?.apiKeyConfigured) {
          recommendations.push(`Configure API key for ${result.provider} in .env file`);
        } else {
          recommendations.push(`Verify ${test.name} is installed and configured correctly`);
        }
      } else if (test.id.includes('database')) {
        recommendations.push(`Check ${test.name} connection settings and ensure service is running`);
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }
}

export const environmentTester = new EnvironmentTester();