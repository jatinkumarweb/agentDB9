/**
 * Agent schema definitions and validators
 */

import { AgentProfile, AgentConfiguration, AgentCapability, AgentStatus, AgentCategory } from '../types';

/**
 * Agent configuration schema
 */
export const AgentConfigurationSchema = {
  llmProvider: {
    type: 'string' as const,
    enum: ['ollama', 'openai', 'anthropic', 'cohere'] as const,
    required: true,
  },
  model: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  temperature: {
    type: 'number' as const,
    required: true,
    min: 0,
    max: 2,
  },
  maxTokens: {
    type: 'number' as const,
    required: true,
    min: 1,
    max: 100000,
  },
  systemPrompt: {
    type: 'string' as const,
    required: false,
    maxLength: 10000,
  },
  codeStyle: {
    type: 'object' as const,
    required: true,
    properties: {
      indentSize: { type: 'number' as const, min: 1, max: 8 },
      indentType: { type: 'string' as const, enum: ['spaces', 'tabs'] },
      lineLength: { type: 'number' as const, min: 40, max: 200 },
      semicolons: { type: 'boolean' as const },
      quotes: { type: 'string' as const, enum: ['single', 'double'] },
      trailingCommas: { type: 'boolean' as const },
      bracketSpacing: { type: 'boolean' as const },
      arrowParens: { type: 'string' as const, enum: ['always', 'avoid'] },
    },
  },
  autoSave: {
    type: 'boolean' as const,
    required: true,
  },
  autoFormat: {
    type: 'boolean' as const,
    required: true,
  },
  autoTest: {
    type: 'boolean' as const,
    required: true,
  },
};

/**
 * Agent capability schema
 */
export const AgentCapabilitySchema = {
  type: {
    type: 'string' as const,
    enum: [
      'code-generation',
      'code-modification',
      'code-refactoring',
      'debugging',
      'testing',
      'documentation',
      'architecture-design',
    ] as const,
    required: true,
  },
  enabled: {
    type: 'boolean' as const,
    required: true,
  },
  confidence: {
    type: 'number' as const,
    required: true,
    min: 0,
    max: 1,
  },
};

/**
 * Agent status enum
 */
export const AgentStatusEnum: readonly AgentStatus[] = [
  'idle',
  'thinking',
  'coding',
  'testing',
  'error',
  'offline',
] as const;

/**
 * Agent category enum
 */
export const AgentCategoryEnum: readonly AgentCategory[] = [
  'general-coding',
  'frontend-development',
  'backend-development',
  'fullstack-development',
  'devops',
  'testing',
  'code-review',
  'documentation',
  'debugging',
  'refactoring',
  'architecture',
  'custom',
] as const;

/**
 * Create agent request schema
 */
export const CreateAgentSchema = {
  name: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
  },
  description: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
  },
  category: {
    type: 'string' as const,
    required: false,
    enum: AgentCategoryEnum,
  },
  configuration: {
    type: 'object' as const,
    required: true,
    schema: AgentConfigurationSchema,
  },
  capabilities: {
    type: 'array' as const,
    required: false,
    items: {
      type: 'object' as const,
      schema: AgentCapabilitySchema,
    },
  },
};

/**
 * Update agent request schema
 */
export const UpdateAgentSchema = {
  name: {
    type: 'string' as const,
    required: false,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
  },
  description: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
  },
  configuration: {
    type: 'object' as const,
    required: false,
    schema: AgentConfigurationSchema,
  },
  capabilities: {
    type: 'array' as const,
    required: false,
    items: {
      type: 'object' as const,
      schema: AgentCapabilitySchema,
    },
  },
};

/**
 * Validator functions
 */

export function validateAgentConfiguration(config: any): config is AgentConfiguration {
  if (!config || typeof config !== 'object') return false;
  
  // Validate required fields
  if (!['ollama', 'openai', 'anthropic', 'cohere'].includes(config.llmProvider)) return false;
  if (typeof config.model !== 'string' || config.model.length === 0) return false;
  if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) return false;
  if (typeof config.maxTokens !== 'number' || config.maxTokens < 1) return false;
  
  // Validate code style
  if (!config.codeStyle || typeof config.codeStyle !== 'object') return false;
  const style = config.codeStyle;
  if (typeof style.indentSize !== 'number' || style.indentSize < 1 || style.indentSize > 8) return false;
  if (!['spaces', 'tabs'].includes(style.indentType)) return false;
  if (!['single', 'double'].includes(style.quotes)) return false;
  if (!['always', 'avoid'].includes(style.arrowParens)) return false;
  
  // Validate boolean fields
  if (typeof config.autoSave !== 'boolean') return false;
  if (typeof config.autoFormat !== 'boolean') return false;
  if (typeof config.autoTest !== 'boolean') return false;
  
  return true;
}

export function validateAgentCapability(capability: any): capability is AgentCapability {
  if (!capability || typeof capability !== 'object') return false;
  
  const validTypes = [
    'code-generation',
    'code-modification',
    'code-refactoring',
    'debugging',
    'testing',
    'documentation',
    'architecture-design',
  ];
  
  if (!validTypes.includes(capability.type)) return false;
  if (typeof capability.enabled !== 'boolean') return false;
  if (typeof capability.confidence !== 'number' || capability.confidence < 0 || capability.confidence > 1) return false;
  
  return true;
}

export function validateAgentStatus(status: any): status is AgentStatus {
  return AgentStatusEnum.includes(status);
}

export function validateAgentCategory(category: any): category is AgentCategory {
  return AgentCategoryEnum.includes(category);
}

/**
 * Default values
 */

export const DEFAULT_AGENT_CONFIGURATION: AgentConfiguration = {
  llmProvider: 'ollama',
  model: 'qwen2.5-coder:7b',
  temperature: 0.3,
  maxTokens: 2048,
  codeStyle: {
    indentSize: 2,
    indentType: 'spaces',
    lineLength: 100,
    semicolons: true,
    quotes: 'single',
    trailingCommas: true,
    bracketSpacing: true,
    arrowParens: 'always',
  },
  autoSave: true,
  autoFormat: true,
  autoTest: false,
};

export const DEFAULT_AGENT_CAPABILITIES: AgentCapability[] = [
  { type: 'code-generation', enabled: true, confidence: 0.8 },
  { type: 'code-modification', enabled: true, confidence: 0.8 },
  { type: 'code-refactoring', enabled: true, confidence: 0.7 },
  { type: 'debugging', enabled: true, confidence: 0.6 },
  { type: 'testing', enabled: false, confidence: 0.5 },
  { type: 'documentation', enabled: true, confidence: 0.7 },
  { type: 'architecture-design', enabled: false, confidence: 0.5 },
];

/**
 * Type guards
 */

export function isAgentConfiguration(value: unknown): value is AgentConfiguration {
  return validateAgentConfiguration(value);
}

export function isAgentCapability(value: unknown): value is AgentCapability {
  return validateAgentCapability(value);
}

export function isAgentStatus(value: unknown): value is AgentStatus {
  return validateAgentStatus(value);
}

export function isAgentCategory(value: unknown): value is AgentCategory {
  return validateAgentCategory(value);
}
