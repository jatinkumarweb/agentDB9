/**
 * Unit tests for agent interfaces and validators
 */

import {
  validateAgentConfiguration,
  validateAgentCapability,
  validateAgentStatus,
  validateAgentCategory,
  isAgentConfiguration,
  isAgentCapability,
  isAgentStatus,
  isAgentCategory,
  DEFAULT_AGENT_CONFIGURATION,
  DEFAULT_AGENT_CAPABILITIES,
  AgentConfiguration,
  AgentCapability,
  AgentStatus,
  AgentCategory,
} from '../schemas/agent.schema';

describe('Agent Configuration Validation', () => {
  const validConfig: AgentConfiguration = {
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

  test('should validate correct configuration', () => {
    expect(validateAgentConfiguration(validConfig)).toBe(true);
    expect(isAgentConfiguration(validConfig)).toBe(true);
  });

  test('should reject invalid llmProvider', () => {
    const invalid = { ...validConfig, llmProvider: 'invalid' };
    expect(validateAgentConfiguration(invalid)).toBe(false);
  });

  test('should reject missing model', () => {
    const invalid = { ...validConfig, model: '' };
    expect(validateAgentConfiguration(invalid)).toBe(false);
  });

  test('should reject invalid temperature', () => {
    expect(validateAgentConfiguration({ ...validConfig, temperature: -1 })).toBe(false);
    expect(validateAgentConfiguration({ ...validConfig, temperature: 3 })).toBe(false);
  });

  test('should reject invalid maxTokens', () => {
    expect(validateAgentConfiguration({ ...validConfig, maxTokens: 0 })).toBe(false);
    expect(validateAgentConfiguration({ ...validConfig, maxTokens: -100 })).toBe(false);
  });

  test('should reject invalid codeStyle', () => {
    const invalid = { ...validConfig, codeStyle: { ...validConfig.codeStyle, indentSize: 0 } };
    expect(validateAgentConfiguration(invalid)).toBe(false);
  });

  test('should reject invalid indentType', () => {
    const invalid = { ...validConfig, codeStyle: { ...validConfig.codeStyle, indentType: 'invalid' as any } };
    expect(validateAgentConfiguration(invalid)).toBe(false);
  });

  test('should reject invalid quotes', () => {
    const invalid = { ...validConfig, codeStyle: { ...validConfig.codeStyle, quotes: 'invalid' as any } };
    expect(validateAgentConfiguration(invalid)).toBe(false);
  });

  test('should reject non-boolean autoSave', () => {
    const invalid = { ...validConfig, autoSave: 'true' as any };
    expect(validateAgentConfiguration(invalid)).toBe(false);
  });

  test('should validate default configuration', () => {
    expect(validateAgentConfiguration(DEFAULT_AGENT_CONFIGURATION)).toBe(true);
  });
});

describe('Agent Capability Validation', () => {
  const validCapability: AgentCapability = {
    type: 'code-generation',
    enabled: true,
    confidence: 0.8,
  };

  test('should validate correct capability', () => {
    expect(validateAgentCapability(validCapability)).toBe(true);
    expect(isAgentCapability(validCapability)).toBe(true);
  });

  test('should reject invalid type', () => {
    const invalid = { ...validCapability, type: 'invalid' };
    expect(validateAgentCapability(invalid)).toBe(false);
  });

  test('should reject non-boolean enabled', () => {
    const invalid = { ...validCapability, enabled: 'true' as any };
    expect(validateAgentCapability(invalid)).toBe(false);
  });

  test('should reject invalid confidence', () => {
    expect(validateAgentCapability({ ...validCapability, confidence: -0.1 })).toBe(false);
    expect(validateAgentCapability({ ...validCapability, confidence: 1.1 })).toBe(false);
  });

  test('should validate all capability types', () => {
    const types = [
      'code-generation',
      'code-modification',
      'code-refactoring',
      'debugging',
      'testing',
      'documentation',
      'architecture-design',
    ];

    types.forEach(type => {
      const capability = { ...validCapability, type: type as any };
      expect(validateAgentCapability(capability)).toBe(true);
    });
  });

  test('should validate default capabilities', () => {
    DEFAULT_AGENT_CAPABILITIES.forEach(capability => {
      expect(validateAgentCapability(capability)).toBe(true);
    });
  });
});

describe('Agent Status Validation', () => {
  test('should validate all valid statuses', () => {
    const statuses: AgentStatus[] = ['idle', 'thinking', 'coding', 'testing', 'error', 'offline'];
    
    statuses.forEach(status => {
      expect(validateAgentStatus(status)).toBe(true);
      expect(isAgentStatus(status)).toBe(true);
    });
  });

  test('should reject invalid status', () => {
    expect(validateAgentStatus('invalid')).toBe(false);
    expect(validateAgentStatus('')).toBe(false);
    expect(validateAgentStatus(null)).toBe(false);
    expect(validateAgentStatus(undefined)).toBe(false);
  });
});

describe('Agent Category Validation', () => {
  test('should validate all valid categories', () => {
    const categories: AgentCategory[] = [
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
    ];
    
    categories.forEach(category => {
      expect(validateAgentCategory(category)).toBe(true);
      expect(isAgentCategory(category)).toBe(true);
    });
  });

  test('should reject invalid category', () => {
    expect(validateAgentCategory('invalid')).toBe(false);
    expect(validateAgentCategory('')).toBe(false);
    expect(validateAgentCategory(null)).toBe(false);
  });
});

describe('Agent Configuration Edge Cases', () => {
  test('should handle null values', () => {
    expect(validateAgentConfiguration(null)).toBe(false);
    expect(validateAgentConfiguration(undefined)).toBe(false);
  });

  test('should handle non-object values', () => {
    expect(validateAgentConfiguration('string')).toBe(false);
    expect(validateAgentConfiguration(123)).toBe(false);
    expect(validateAgentConfiguration([])).toBe(false);
  });

  test('should handle missing required fields', () => {
    expect(validateAgentConfiguration({})).toBe(false);
    expect(validateAgentConfiguration({ llmProvider: 'ollama' })).toBe(false);
  });

  test('should handle partial configuration', () => {
    const partial = {
      llmProvider: 'ollama',
      model: 'test',
      temperature: 0.5,
      maxTokens: 1000,
    };
    expect(validateAgentConfiguration(partial)).toBe(false); // Missing codeStyle and boolean fields
  });
});

describe('Agent Capability Edge Cases', () => {
  test('should handle boundary confidence values', () => {
    const capability: AgentCapability = {
      type: 'code-generation',
      enabled: true,
      confidence: 0,
    };
    expect(validateAgentCapability(capability)).toBe(true);

    capability.confidence = 1;
    expect(validateAgentCapability(capability)).toBe(true);
  });

  test('should handle null values', () => {
    expect(validateAgentCapability(null)).toBe(false);
    expect(validateAgentCapability(undefined)).toBe(false);
  });

  test('should handle missing fields', () => {
    expect(validateAgentCapability({ type: 'code-generation' })).toBe(false);
    expect(validateAgentCapability({ enabled: true })).toBe(false);
  });
});
