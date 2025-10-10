import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

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
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProviderConfigs(userId: string): Promise<ProviderConfig[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const apiKeys = user?.preferences?.apiKeys || {};
    
    console.log(`[getProviderConfigs] userId: ${userId}, user found: ${!!user}, apiKeys:`, JSON.stringify(apiKeys));

    const providers = [
      {
        name: 'openai',
        displayName: 'OpenAI',
        apiKeyLabel: 'OpenAI API Key',
        apiKeyPlaceholder: 'sk-...',
        configured: !!apiKeys.openai && apiKeys.openai.length > 0,
        models: []
      },
      {
        name: 'anthropic',
        displayName: 'Anthropic',
        apiKeyLabel: 'Anthropic API Key',
        apiKeyPlaceholder: 'sk-ant-...',
        configured: !!apiKeys.anthropic && apiKeys.anthropic.length > 0,
        models: []
      },
      {
        name: 'cohere',
        displayName: 'Cohere',
        apiKeyLabel: 'Cohere API Key',
        apiKeyPlaceholder: 'co-...',
        configured: !!apiKeys.cohere && apiKeys.cohere.length > 0,
        models: []
      },
      {
        name: 'huggingface',
        displayName: 'Hugging Face',
        apiKeyLabel: 'Hugging Face API Key',
        apiKeyPlaceholder: 'hf_...',
        configured: !!apiKeys.huggingface && apiKeys.huggingface.length > 0,
        models: []
      }
    ];

    return providers;
  }

  async getProviderStatus(userId: string): Promise<Record<string, boolean>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const apiKeys = user?.preferences?.apiKeys || {};
    
    return {
      openai: !!apiKeys.openai && apiKeys.openai.length > 0,
      anthropic: !!apiKeys.anthropic && apiKeys.anthropic.length > 0,
      cohere: !!apiKeys.cohere && apiKeys.cohere.length > 0,
      huggingface: !!apiKeys.huggingface && apiKeys.huggingface.length > 0,
    };
  }

  async getApiKey(userId: string, provider: string): Promise<string | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const apiKeys = user?.preferences?.apiKeys || {};
    return apiKeys[provider] || null;
  }

  async removeProviderConfig(userId: string, provider: string): Promise<any> {
    try {
      // Validate provider
      if (!this.isValidProvider(provider)) {
        throw new Error(`Invalid provider: ${provider}`);
      }

      // Get user
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Remove API key
      if (user.preferences?.apiKeys?.[provider]) {
        delete user.preferences.apiKeys[provider];
        await this.userRepository.save(user);
      }

      return {
        provider,
        configured: false,
        message: `${provider} API key removed successfully`
      };
    } catch (error) {
      console.error(`Failed to remove ${provider} config:`, error);
      throw new Error(`Failed to remove ${provider} configuration: ${error.message}`);
    }
  }

  async updateProviderConfig(userId: string, provider: string, apiKey: string): Promise<any> {
    try {
      if (!this.isValidProvider(provider)) {
        throw new Error(`Invalid provider: ${provider}`);
      }

      // Trim whitespace from API key
      const trimmedApiKey = apiKey?.trim() || '';
      
      if (!trimmedApiKey || trimmedApiKey.length === 0) {
        throw new Error('API key cannot be empty');
      }

      // Validate API key format
      this.validateApiKey(provider, trimmedApiKey);

      // Test the API key
      const isValid = await this.testApiKey(provider, trimmedApiKey);
      if (!isValid) {
        throw new Error(`Invalid API key for ${provider}`);
      }

      // Update user preferences
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.preferences) {
        user.preferences = {};
      }
      if (!user.preferences.apiKeys) {
        user.preferences.apiKeys = {};
      }

      // Create a new object to ensure TypeORM detects the change
      user.preferences = {
        ...user.preferences,
        apiKeys: {
          ...user.preferences.apiKeys,
          [provider]: trimmedApiKey
        }
      };
      
      console.log(`[updateProviderConfig] Before save - userId: ${userId}, provider: ${provider}, preferences:`, JSON.stringify(user.preferences));
      
      const savedUser = await this.userRepository.save(user);
      
      console.log(`[updateProviderConfig] After save - userId: ${userId}, saved preferences:`, JSON.stringify(savedUser.preferences));
      
      // Verify the save by re-fetching from database
      const verifyUser = await this.userRepository.findOne({ where: { id: userId } });
      console.log(`[updateProviderConfig] Verification query - userId: ${userId}, DB preferences:`, JSON.stringify(verifyUser?.preferences));

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
    // More flexible patterns to accommodate various API key formats
    const patterns = {
      // OpenAI: sk- followed by alphanumeric, hyphens, underscores (project keys: sk-proj-)
      openai: /^sk-[a-zA-Z0-9\-_]{20,}$/,
      // Anthropic: sk-ant- followed by alphanumeric, hyphens, underscores
      anthropic: /^sk-ant-[a-zA-Z0-9\-_]{20,}$/,
      // Cohere: alphanumeric string
      cohere: /^[a-zA-Z0-9\-_]{20,}$/,
      // HuggingFace: hf_ followed by alphanumeric
      huggingface: /^hf_[a-zA-Z0-9]{20,}$/
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
}