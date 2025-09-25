import { Injectable } from '@nestjs/common';

@Injectable()
export class ModelsService {
  
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
      'codellama:7b',
      'codellama:13b',
      'deepseek-coder:6.7b',
      'mistral:7b',
      'codegemma:7b',
      'starcoder2:7b',
      'qwen2.5-coder:7b',
      'magicoder:7b',
      'codestral:22b',
      'llama3.1:8b',
      'llama2:7b',
      'llama2:13b',
      'phi3:mini',
      'phi3:medium',
      'gemma:2b',
      'gemma:7b'
    ];
    
    return validModels.includes(modelId);
  }

  async getDownloadableModels(): Promise<string[]> {
    // Return list of models that can be downloaded
    return [
      'codellama:7b',
      'codellama:13b',
      'deepseek-coder:6.7b',
      'mistral:7b',
      'codegemma:7b',
      'starcoder2:7b',
      'qwen2.5-coder:7b',
      'magicoder:7b',
      'codestral:22b',
      'llama3.1:8b',
      'llama2:7b',
      'llama2:13b',
      'phi3:mini',
      'phi3:medium',
      'gemma:2b',
      'gemma:7b'
    ];
  }
}