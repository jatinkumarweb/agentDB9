// Shared types for AgentDB9 Coding Agent

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project and ProjectFile interfaces are now in agent.ts

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  projectId?: string;
}

export interface CodeAnalysis {
  id: string;
  fileId: string;
  analysis: string;
  suggestions: string[];
  embeddings?: number[];
  createdAt: Date;
}

export interface LLMRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  projectId?: string;
  modelId?: string;
  provider?: ModelProvider;
  stream?: boolean;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelId?: string;
  provider?: ModelProvider;
  responseTime?: number;
}

export type ModelProvider = 'ollama' | 'openai' | 'anthropic' | 'cohere' | 'huggingface';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  capabilities: ModelCapability[];
  parameters: ModelParameters;
  pricing?: ModelPricing;
  performance: ModelPerformance;
  availability: ModelAvailability;
}

export interface ModelAvailability {
  status: 'available' | 'disabled' | 'error' | 'unknown';
  reason?: string;
  requiresApiKey: boolean;
  apiKeyConfigured: boolean;
  lastChecked?: Date;
}

export interface ModelCapability {
  type: 'code-generation' | 'code-completion' | 'code-analysis' | 'chat' | 'documentation' | 'architecture' | 'code-review' | 'debugging' | 'refactoring' | 'problem-solving' | 'reasoning';
  quality: 'low' | 'medium' | 'high' | 'excellent';
  speed: 'slow' | 'medium' | 'fast' | 'very-fast';
}

export interface ModelParameters {
  maxTokens: number;
  contextLength: number;
  temperature: { min: number; max: number; default: number };
  topP?: { min: number; max: number; default: number };
  frequencyPenalty?: { min: number; max: number; default: number };
}

export interface ModelPricing {
  inputTokens: number; // per 1K tokens
  outputTokens: number; // per 1K tokens
  currency: string;
}

export interface ModelPerformance {
  averageResponseTime: number; // milliseconds
  tokensPerSecond: number;
  memoryUsage: number; // MB
  gpuRequired: boolean;
}

export interface OllamaModel {
  name: string;
  size: string;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface VSCodeExtension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  categories: string[];
  enabled: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  framework?: string;
  files: TemplateFile[];
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  extensions: string[];
}

export interface TemplateFile {
  path: string;
  content: string;
  template: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Additional types for models and VSCode integration
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: Date;
  content?: string;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface ModelMetrics {
  responseTime: number;
  tokensPerSecond: number;
  qualityScore: number;
  costPerRequest: number;
  successRate: number;
}

// Re-export all types
export * from './testing';
export * from './agent';
export * from './agent-profile';
export * from './context';
export * from './conversation-manager';
export * from './websocket-bridge';
export * from './knowledge-base';
export * from './mcp';
export * from './api';