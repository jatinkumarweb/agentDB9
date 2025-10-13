import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingProviderConfig } from '@agentdb9/shared';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private providers = new Map<string, EmbeddingProvider>();

  /**
   * Generate embeddings for texts
   */
  async generate(texts: string[], config: EmbeddingProviderConfig): Promise<number[][]> {
    const provider = this.getProvider(config);
    
    this.logger.log(`Generating embeddings for ${texts.length} texts using ${config.provider}`);
    
    const batchSize = config.batchSize || 100;
    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await provider.generateBatch(batch);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Generate single embedding
   */
  async generateSingle(text: string, config: EmbeddingProviderConfig): Promise<number[]> {
    const provider = this.getProvider(config);
    return provider.generateSingle(text);
  }

  /**
   * Get embedding dimensions for a provider
   */
  getDimensions(config: EmbeddingProviderConfig): number {
    const provider = this.getProvider(config);
    return provider.getDimensions();
  }

  /**
   * Get or create provider
   */
  private getProvider(config: EmbeddingProviderConfig): EmbeddingProvider {
    const key = `${config.provider}:${config.model}`;
    
    if (!this.providers.has(key)) {
      const provider = this.createProvider(config);
      this.providers.set(key, provider);
    }

    return this.providers.get(key)!;
  }

  /**
   * Create provider instance
   */
  private createProvider(config: EmbeddingProviderConfig): EmbeddingProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config);
      case 'cohere':
        return new CohereEmbeddingProvider(config);
      case 'huggingface':
        return new HuggingFaceEmbeddingProvider(config);
      case 'ollama':
        return new OllamaEmbeddingProvider(config);
      default:
        throw new Error(`Unsupported embedding provider: ${config.provider}`);
    }
  }
}

/**
 * Base embedding provider interface
 */
interface EmbeddingProvider {
  generateBatch(texts: string[]): Promise<number[][]>;
  generateSingle(text: string): Promise<number[]>;
  getDimensions(): number;
}

/**
 * OpenAI embedding provider
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger('OpenAIEmbeddingProvider');
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(config: EmbeddingProviderConfig) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || 1536;

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      this.logger.error('Failed to generate OpenAI embeddings:', error);
      throw error;
    }
  }

  async generateSingle(text: string): Promise<number[]> {
    const embeddings = await this.generateBatch([text]);
    return embeddings[0];
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

/**
 * Cohere embedding provider
 */
class CohereEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger('CohereEmbeddingProvider');
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(config: EmbeddingProviderConfig) {
    this.apiKey = config.apiKey || process.env.COHERE_API_KEY || '';
    this.model = config.model || 'embed-english-v3.0';
    this.dimensions = config.dimensions || 1024;

    if (!this.apiKey) {
      throw new Error('Cohere API key is required');
    }
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          texts: texts,
          input_type: 'search_document',
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embeddings;
    } catch (error) {
      this.logger.error('Failed to generate Cohere embeddings:', error);
      throw error;
    }
  }

  async generateSingle(text: string): Promise<number[]> {
    const embeddings = await this.generateBatch([text]);
    return embeddings[0];
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

/**
 * HuggingFace embedding provider
 */
class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger('HuggingFaceEmbeddingProvider');
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly apiUrl: string;

  constructor(config: EmbeddingProviderConfig) {
    this.apiKey = config.apiKey || process.env.HUGGINGFACE_API_KEY || '';
    this.model = config.model || 'sentence-transformers/all-MiniLM-L6-v2';
    this.dimensions = config.dimensions || 384;
    this.apiUrl = config.apiUrl || `https://api-inference.huggingface.co/models/${this.model}`;

    if (!this.apiKey) {
      throw new Error('HuggingFace API key is required');
    }
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data[0]) ? data : [data];
    } catch (error) {
      this.logger.error('Failed to generate HuggingFace embeddings:', error);
      throw error;
    }
  }

  async generateSingle(text: string): Promise<number[]> {
    const embeddings = await this.generateBatch([text]);
    return embeddings[0];
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

/**
 * Ollama embedding provider
 */
class OllamaEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger('OllamaEmbeddingProvider');
  private readonly model: string;
  private readonly dimensions: number;
  private readonly apiUrl: string;

  constructor(config: EmbeddingProviderConfig) {
    this.model = config.model || 'nomic-embed-text';
    this.dimensions = config.dimensions || 768;
    this.apiUrl = config.apiUrl || process.env.OLLAMA_HOST || 'http://ollama:11434';
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateSingle(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  async generateSingle(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embeddings[0];
    } catch (error) {
      this.logger.error('Failed to generate Ollama embeddings:', error);
      throw error;
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
