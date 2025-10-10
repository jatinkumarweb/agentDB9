import { Injectable } from '@nestjs/common';

@Injectable()
export class ModelsService {
  
  async getModels(userId?: string): Promise<any> {
    try {
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:9000';
      
      console.log('[ModelsService] getModels called with userId:', userId, 'type:', typeof userId);
      
      // Add userId as query parameter if available
      const url = userId 
        ? `${llmServiceUrl}/api/models?userId=${userId}`
        : `${llmServiceUrl}/api/models`;
      
      console.log('[ModelsService] Fetching models from LLM service:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`LLM Service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('LLM Service response structure:', JSON.stringify(result).substring(0, 200));
      
      // Return just the data portion to avoid double wrapping
      // LLM service returns { success: true, data: { models: [...], ... } }
      // We want to return { models: [...], ... }
      if (result.success && result.data) {
        console.log('Returning result.data');
        return result.data;
      }
      
      console.log('Returning fallback');
      return result.data || result;
    } catch (error) {
      console.error('Failed to fetch models from LLM service:', error);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }
  
  async downloadModel(modelId: string): Promise<any> {
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      
      // Check if model is valid Ollama model
      if (!this.isValidOllamaModel(modelId)) {
        throw new Error(`Invalid model ID: ${modelId}. Only Ollama models can be downloaded.`);
      }

      console.log(`Initiating download for model: ${modelId}`);
      
      // Start the download process
      const response = await fetch(`${ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelId,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        modelId,
        status: 'downloading',
        message: `Download initiated for ${modelId}`,
        details: result
      };
    } catch (error) {
      console.error(`Failed to download model ${modelId}:`, error);
      throw new Error(`Failed to download model: ${error.message}`);
    }
  }

  async removeModel(modelId: string): Promise<any> {
    try {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
      
      // Check if model is valid Ollama model
      if (!this.isValidOllamaModel(modelId)) {
        throw new Error(`Invalid model ID: ${modelId}. Only Ollama models can be removed.`);
      }

      console.log(`Initiating removal for model: ${modelId}`);
      
      // Remove the model
      const response = await fetch(`${ollamaUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return {
        modelId,
        status: 'removed',
        message: `Model ${modelId} has been removed`
      };
    } catch (error) {
      console.error(`Failed to remove model ${modelId}:`, error);
      throw new Error(`Failed to remove model: ${error.message}`);
    }
  }

  private isValidOllamaModel(modelId: string): boolean {
    // List of valid Ollama models that can be downloaded/removed
    const validModels = [
      // Llama models (3.2 and 3.3 support function calling)
      'llama3.3:70b',
      'llama3.2:1b',
      'llama3.2:3b',
      'llama3.2:11b',
      'llama3.2:90b',
      'llama3.1:8b',
      'llama3.1:70b',
      'llama2:7b',
      'llama2:13b',
      'llama2:70b',
      // Code-specific models
      'codellama:7b',
      'codellama:13b',
      'codellama:34b',
      'deepseek-coder:6.7b',
      'deepseek-coder:33b',
      'codegemma:7b',
      'starcoder2:7b',
      'starcoder2:15b',
      'qwen2.5-coder:7b',
      'qwen2.5-coder:32b',
      'magicoder:7b',
      'codestral:22b',
      // General purpose models
      'mistral:7b',
      'mistral:latest',
      'mixtral:8x7b',
      'mixtral:8x22b',
      'qwen2.5:7b',
      'qwen2.5:14b',
      'qwen2.5:32b',
      'phi3:mini',
      'phi3:medium',
      'phi4:14b',
      'gemma:2b',
      'gemma:7b',
      'gemma2:9b',
      'gemma2:27b'
    ];
    
    return validModels.includes(modelId);
  }

  async getDownloadableModels(): Promise<string[]> {
    // Return list of models that can be downloaded
    // Organized by category for better UX
    return [
      // Latest Llama models (with function calling support)
      'llama3.3:70b',
      'llama3.2:1b',
      'llama3.2:3b',
      'llama3.2:11b',
      'llama3.2:90b',
      'llama3.1:8b',
      'llama3.1:70b',
      'llama2:7b',
      'llama2:13b',
      'llama2:70b',
      // Code-specific models
      'codellama:7b',
      'codellama:13b',
      'codellama:34b',
      'deepseek-coder:6.7b',
      'deepseek-coder:33b',
      'codegemma:7b',
      'starcoder2:7b',
      'starcoder2:15b',
      'qwen2.5-coder:7b',
      'qwen2.5-coder:32b',
      'magicoder:7b',
      'codestral:22b',
      // General purpose models (Mistral with function calling)
      'mistral:7b',
      'mistral:latest',
      'mixtral:8x7b',
      'mixtral:8x22b',
      // Qwen models (2.5 supports function calling)
      'qwen2.5:7b',
      'qwen2.5:14b',
      'qwen2.5:32b',
      // Phi models
      'phi3:mini',
      'phi3:medium',
      'phi4:14b',
      // Gemma models
      'gemma:2b',
      'gemma:7b',
      'gemma2:9b',
      'gemma2:27b'
    ];
  }
}