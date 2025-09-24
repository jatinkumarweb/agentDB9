// Model management utilities

import { ModelConfig, ModelProvider, CodeTask, PerformanceRequirements, ModelMetrics } from '../types/models';

export const OLLAMA_MODELS: Record<string, ModelConfig> = {
  'codellama:7b': {
    id: 'codellama:7b',
    name: 'Code Llama 7B',
    provider: 'ollama',
    description: 'Fast code generation and completion',
    capabilities: [
      { type: 'code-generation', quality: 'high', speed: 'fast' },
      { type: 'code-completion', quality: 'high', speed: 'very-fast' },
      { type: 'code-analysis', quality: 'medium', speed: 'fast' }
    ],
    parameters: {
      maxTokens: 4096,
      contextLength: 16384,
      temperature: { min: 0.0, max: 1.0, default: 0.1 }
    },
    performance: {
      averageResponseTime: 2000,
      tokensPerSecond: 50,
      memoryUsage: 4000,
      gpuRequired: false
    }
  },
  'codellama:13b': {
    id: 'codellama:13b',
    name: 'Code Llama 13B',
    provider: 'ollama',
    description: 'Balanced performance for complex code tasks',
    capabilities: [
      { type: 'code-generation', quality: 'high', speed: 'medium' },
      { type: 'code-completion', quality: 'high', speed: 'fast' },
      { type: 'code-analysis', quality: 'high', speed: 'medium' },
      { type: 'documentation', quality: 'high', speed: 'medium' }
    ],
    parameters: {
      maxTokens: 4096,
      contextLength: 16384,
      temperature: { min: 0.0, max: 1.0, default: 0.1 }
    },
    performance: {
      averageResponseTime: 4000,
      tokensPerSecond: 30,
      memoryUsage: 8000,
      gpuRequired: true
    }
  },
  'deepseek-coder:6.7b': {
    id: 'deepseek-coder:6.7b',
    name: 'DeepSeek Coder 6.7B',
    provider: 'ollama',
    description: 'Specialized for code completion and analysis',
    capabilities: [
      { type: 'code-completion', quality: 'excellent', speed: 'very-fast' },
      { type: 'code-analysis', quality: 'high', speed: 'fast' },
      { type: 'code-generation', quality: 'high', speed: 'fast' }
    ],
    parameters: {
      maxTokens: 4096,
      contextLength: 16384,
      temperature: { min: 0.0, max: 1.0, default: 0.1 }
    },
    performance: {
      averageResponseTime: 1500,
      tokensPerSecond: 60,
      memoryUsage: 3500,
      gpuRequired: false
    }
  },
  'mistral:7b': {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    provider: 'ollama',
    description: 'General purpose model for chat and documentation',
    capabilities: [
      { type: 'chat', quality: 'high', speed: 'fast' },
      { type: 'documentation', quality: 'high', speed: 'fast' },
      { type: 'code-generation', quality: 'medium', speed: 'fast' }
    ],
    parameters: {
      maxTokens: 4096,
      contextLength: 32768,
      temperature: { min: 0.0, max: 1.0, default: 0.7 }
    },
    performance: {
      averageResponseTime: 2000,
      tokensPerSecond: 45,
      memoryUsage: 4000,
      gpuRequired: false
    }
  }
};

export const EXTERNAL_MODELS: Record<string, ModelConfig> = {
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'Most capable model for complex reasoning',
    capabilities: [
      { type: 'code-generation', quality: 'excellent', speed: 'medium' },
      { type: 'code-analysis', quality: 'excellent', speed: 'medium' },
      { type: 'architecture', quality: 'excellent', speed: 'slow' },
      { type: 'documentation', quality: 'excellent', speed: 'medium' }
    ],
    parameters: {
      maxTokens: 8192,
      contextLength: 128000,
      temperature: { min: 0.0, max: 2.0, default: 0.1 }
    },
    pricing: {
      inputTokens: 0.03,
      outputTokens: 0.06,
      currency: 'USD'
    },
    performance: {
      averageResponseTime: 5000,
      tokensPerSecond: 20,
      memoryUsage: 0,
      gpuRequired: false
    }
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    description: 'Balanced model for code and analysis',
    capabilities: [
      { type: 'code-generation', quality: 'excellent', speed: 'fast' },
      { type: 'code-analysis', quality: 'excellent', speed: 'fast' },
      { type: 'code-review', quality: 'excellent', speed: 'medium' }
    ],
    parameters: {
      maxTokens: 4096,
      contextLength: 200000,
      temperature: { min: 0.0, max: 1.0, default: 0.1 }
    },
    pricing: {
      inputTokens: 0.003,
      outputTokens: 0.015,
      currency: 'USD'
    },
    performance: {
      averageResponseTime: 3000,
      tokensPerSecond: 35,
      memoryUsage: 0,
      gpuRequired: false
    }
  }
};

export class ModelSelector {
  private models: Record<string, ModelConfig>;
  private metrics: Record<string, ModelMetrics> = {};

  constructor() {
    this.models = { ...OLLAMA_MODELS, ...EXTERNAL_MODELS };
  }

  selectForTask(task: CodeTask): ModelConfig {
    const candidates = Object.values(this.models).filter(model =>
      model.capabilities.some(cap => cap.type === task.type)
    );

    if (candidates.length === 0) {
      return this.models['codellama:13b']; // fallback
    }

    // Score models based on task requirements
    const scored = candidates.map(model => {
      const capability = model.capabilities.find(cap => cap.type === task.type);
      if (!capability) return { model, score: 0 };

      let score = 0;
      
      // Quality scoring
      const qualityScores = { low: 1, medium: 2, high: 3, excellent: 4 };
      score += qualityScores[capability.quality] * 3;

      // Speed scoring (inverse for urgency)
      const speedScores = { slow: 1, medium: 2, fast: 3, 'very-fast': 4 };
      if (task.urgency === 'high') {
        score += speedScores[capability.speed] * 2;
      }

      // Complexity adjustment
      if (task.complexity === 'high' && capability.quality === 'excellent') {
        score += 2;
      }

      // Local preference for privacy
      if (model.provider === 'ollama') {
        score += 1;
      }

      return { model, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].model;
  }

  selectForPerformance(requirements: PerformanceRequirements): ModelConfig {
    const candidates = Object.values(this.models).filter(model => {
      // Filter by response time
      if (model.performance.averageResponseTime > requirements.maxResponseTime) {
        return false;
      }

      // Filter by GPU requirement
      if (requirements.requiresGPU !== undefined && 
          model.performance.gpuRequired !== requirements.requiresGPU) {
        return false;
      }

      // Filter by local requirement
      if (requirements.requiresLocal && model.provider !== 'ollama') {
        return false;
      }

      // Filter by cost
      if (requirements.maxCost && model.pricing) {
        const estimatedCost = (model.pricing.inputTokens + model.pricing.outputTokens) / 1000;
        if (estimatedCost > requirements.maxCost) {
          return false;
        }
      }

      return true;
    });

    if (candidates.length === 0) {
      return this.models['codellama:7b']; // fastest fallback
    }

    // Select best performing model
    candidates.sort((a, b) => {
      const aQuality = this.getAverageQuality(a);
      const bQuality = this.getAverageQuality(b);
      
      if (aQuality !== bQuality) {
        return bQuality - aQuality; // Higher quality first
      }
      
      return a.performance.averageResponseTime - b.performance.averageResponseTime; // Faster first
    });

    return candidates[0];
  }

  getFallbackChain(primaryModel: string): string[] {
    const fallbackChains: Record<string, string[]> = {
      'gpt-4': ['claude-3-sonnet', 'codellama:13b', 'codellama:7b'],
      'claude-3-sonnet': ['gpt-4', 'codellama:13b', 'codellama:7b'],
      'codellama:13b': ['codellama:7b', 'deepseek-coder:6.7b', 'mistral:7b'],
      'codellama:7b': ['deepseek-coder:6.7b', 'mistral:7b'],
      'deepseek-coder:6.7b': ['codellama:7b', 'mistral:7b']
    };

    return fallbackChains[primaryModel] || ['codellama:7b', 'mistral:7b'];
  }

  selectCostOptimal(task: CodeTask, budget: 'low' | 'medium' | 'high'): ModelConfig {
    const budgetLimits = {
      low: 0.01,    // $0.01 per request
      medium: 0.05, // $0.05 per request
      high: 0.20    // $0.20 per request
    };

    const maxCost = budgetLimits[budget];
    
    // For low budget, prefer local models
    if (budget === 'low') {
      return this.selectForTask({ ...task, urgency: 'low' });
    }

    const requirements: PerformanceRequirements = {
      maxResponseTime: 10000,
      minQuality: task.complexity === 'high' ? 'high' : 'medium',
      maxCost
    };

    return this.selectForPerformance(requirements);
  }

  updateMetrics(modelId: string, metrics: Partial<ModelMetrics>): void {
    this.metrics[modelId] = { ...this.metrics[modelId], ...metrics };
  }

  getModelMetrics(modelId: string): ModelMetrics | undefined {
    return this.metrics[modelId];
  }

  private getAverageQuality(model: ModelConfig): number {
    const qualityScores = { low: 1, medium: 2, high: 3, excellent: 4 };
    const total = model.capabilities.reduce((sum, cap) => sum + qualityScores[cap.quality], 0);
    return total / model.capabilities.length;
  }
}

export const modelSelector = new ModelSelector();

export const getAvailableModels = (): ModelConfig[] => {
  return Object.values({ ...OLLAMA_MODELS, ...EXTERNAL_MODELS });
};

export const getModelById = (id: string): ModelConfig | undefined => {
  return { ...OLLAMA_MODELS, ...EXTERNAL_MODELS }[id];
};

export const getModelsByProvider = (provider: ModelProvider): ModelConfig[] => {
  return getAvailableModels().filter(model => model.provider === provider);
};