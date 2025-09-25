import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface ProviderConfig {
  name: string;
  displayName: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  configured: boolean;
  models: any[];
}

@Injectable()
export class ProvidersService {
  private readonly configPath = path.join(process.cwd(), '.env.local');

  async getProviderConfigs(): Promise<ProviderConfig[]> {
    const providers = [
      {
        name: 'openai',
        displayName: 'OpenAI',
        apiKeyLabel: 'OpenAI API Key',
        apiKeyPlaceholder: 'sk-...',
        configured: !!process.env.OPENAI_API_KEY,
        models: []
      },
      {
        name: 'anthropic',
        displayName: 'Anthropic',
        apiKeyLabel: 'Anthropic API Key',
        apiKeyPlaceholder: 'sk-ant-...',
        configured: !!process.env.ANTHROPIC_API_KEY,
        models: []
      },
      {
        name: 'cohere',
        displayName: 'Cohere',
        apiKeyLabel: 'Cohere API Key',
        apiKeyPlaceholder: 'co-...',
        configured: !!process.env.COHERE_API_KEY,
        models: []
      },
      {
        name: 'huggingface',
        displayName: 'Hugging Face',
        apiKeyLabel: 'Hugging Face API Key',
        apiKeyPlaceholder: 'hf_...',
        configured: !!process.env.HUGGINGFACE_API_KEY,
        models: []
      }
    ];

    return providers;
  }

  async updateProviderConfig(provider: string, apiKey: string): Promise<any> {
    try {
      if (!this.isValidProvider(provider)) {
        throw new Error(`Invalid provider: ${provider}`);
      }

      if (!apiKey || apiKey.trim().length === 0) {
        throw new Error('API key cannot be empty');
      }

      // Validate API key format
      this.validateApiKey(provider, apiKey);

      // Test the API key
      const isValid = await this.testApiKey(provider, apiKey);
      if (!isValid) {
        throw new Error(`Invalid API key for ${provider}`);
      }

      // Update environment variable
      await this.updateEnvironmentVariable(provider, apiKey);

      return {
        provider,
        configured: true,
        message: `${provider} API key configured successfully`
      };
    } catch (error) {
      console.error(`Failed to update ${provider} config:`, error);
      throw new Error(`Failed to configure ${provider}: ${error.message}`);
    }
  }

  private isValidProvider(provider: string): boolean {
    const validProviders = ['openai', 'anthropic', 'cohere', 'huggingface'];
    return validProviders.includes(provider);
  }

  private validateApiKey(provider: string, apiKey: string): void {
    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{48,}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9\-_]{95,}$/,
      cohere: /^[a-zA-Z0-9]{40,}$/,
      huggingface: /^hf_[a-zA-Z0-9]{37}$/
    };

    const pattern = patterns[provider];
    if (pattern && !pattern.test(apiKey)) {
      throw new Error(`Invalid API key format for ${provider}`);
    }
  }

  private async testApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'openai':
          return await this.testOpenAIKey(apiKey);
        case 'anthropic':
          return await this.testAnthropicKey(apiKey);
        case 'cohere':
          return await this.testCohereKey(apiKey);
        case 'huggingface':
          return await this.testHuggingFaceKey(apiKey);
        default:
          return false;
      }
    } catch (error) {
      console.error(`API key test failed for ${provider}:`, error);
      return false;
    }
  }

  private async testOpenAIKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async testAnthropicKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
      });
      // Even if the request fails due to other reasons, a 401 means invalid key
      return response.status !== 401;
    } catch (error) {
      return false;
    }
  }

  private async testCohereKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async testHuggingFaceKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://huggingface.co/api/whoami', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async updateEnvironmentVariable(provider: string, apiKey: string): Promise<void> {
    const envVarName = this.getEnvVarName(provider);
    
    // Update the current process environment
    process.env[envVarName] = apiKey;

    // Also try to update .env.local file for persistence
    try {
      await this.updateEnvFile(envVarName, apiKey);
    } catch (error) {
      console.warn('Could not update .env.local file:', error.message);
      // Don't throw error here as the environment variable is still set for current session
    }
  }

  private getEnvVarName(provider: string): string {
    const envVarMap = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      cohere: 'COHERE_API_KEY',
      huggingface: 'HUGGINGFACE_API_KEY'
    };
    return envVarMap[provider];
  }

  private async updateEnvFile(envVarName: string, value: string): Promise<void> {
    try {
      let envContent = '';
      
      // Read existing .env.local file if it exists
      if (fs.existsSync(this.configPath)) {
        envContent = fs.readFileSync(this.configPath, 'utf8');
      }

      // Update or add the environment variable
      const lines = envContent.split('\n');
      let found = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${envVarName}=`)) {
          lines[i] = `${envVarName}=${value}`;
          found = true;
          break;
        }
      }
      
      if (!found) {
        lines.push(`${envVarName}=${value}`);
      }
      
      // Write back to file
      fs.writeFileSync(this.configPath, lines.join('\n'));
    } catch (error) {
      throw new Error(`Failed to update environment file: ${error.message}`);
    }
  }
}