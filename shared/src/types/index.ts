// Shared types for AgentDB9 Coding Agent

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  files: ProjectFile[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

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
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}