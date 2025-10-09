/**
 * Message schema definitions and validators
 */

import { ConversationMessage, MessageMetadata } from '../types';

/**
 * Message role enum
 */
export const MessageRoleEnum = ['user', 'agent', 'system', 'tool'] as const;
export type MessageRole = typeof MessageRoleEnum[number];

/**
 * Create message request schema
 */
export const CreateMessageSchema = {
  conversationId: {
    type: 'string' as const,
    required: true,
    pattern: /^[a-f0-9-]{36}$/i,
  },
  role: {
    type: 'string' as const,
    required: true,
    enum: MessageRoleEnum,
  },
  content: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 100000,
  },
  metadata: {
    type: 'object' as const,
    required: false,
  },
};

/**
 * Update message request schema
 */
export const UpdateMessageSchema = {
  content: {
    type: 'string' as const,
    required: false,
    minLength: 1,
    maxLength: 100000,
  },
  metadata: {
    type: 'object' as const,
    required: false,
  },
};

/**
 * Message metadata schema
 */
export const MessageMetadataSchema = {
  streaming: {
    type: 'boolean' as const,
    required: false,
  },
  completed: {
    type: 'boolean' as const,
    required: false,
  },
  stopped: {
    type: 'boolean' as const,
    required: false,
  },
  model: {
    type: 'string' as const,
    required: false,
  },
  provider: {
    type: 'string' as const,
    required: false,
  },
  temperature: {
    type: 'number' as const,
    required: false,
    min: 0,
    max: 2,
  },
  tokenUsage: {
    type: 'object' as const,
    required: false,
    properties: {
      prompt: { type: 'number' as const, min: 0 },
      completion: { type: 'number' as const, min: 0 },
      total: { type: 'number' as const, min: 0 },
    },
  },
  generatedAt: {
    type: 'string' as const,
    required: false,
  },
  responseTime: {
    type: 'number' as const,
    required: false,
    min: 0,
  },
  codeBlocks: {
    type: 'array' as const,
    required: false,
    items: {
      type: 'object' as const,
      properties: {
        language: { type: 'string' as const },
        code: { type: 'string' as const },
        filename: { type: 'string' as const, required: false },
      },
    },
  },
  fileReferences: {
    type: 'array' as const,
    required: false,
    items: {
      type: 'string' as const,
    },
  },
  toolCalls: {
    type: 'array' as const,
    required: false,
    items: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        parameters: { type: 'object' as const },
        result: { type: 'any' as const, required: false },
      },
    },
  },
};

/**
 * Validator functions
 */

export function validateMessageRole(role: any): role is MessageRole {
  return MessageRoleEnum.includes(role);
}

export function validateMessageId(id: any): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-f0-9-]{36}$/i.test(id);
}

export function validateMessageMetadata(metadata: any): metadata is MessageMetadata {
  if (!metadata || typeof metadata !== 'object') return true; // metadata is optional
  
  // Validate optional fields if present
  if (metadata.streaming !== undefined && typeof metadata.streaming !== 'boolean') return false;
  if (metadata.completed !== undefined && typeof metadata.completed !== 'boolean') return false;
  if (metadata.stopped !== undefined && typeof metadata.stopped !== 'boolean') return false;
  if (metadata.model !== undefined && typeof metadata.model !== 'string') return false;
  if (metadata.provider !== undefined && typeof metadata.provider !== 'string') return false;
  
  if (metadata.temperature !== undefined) {
    if (typeof metadata.temperature !== 'number' || metadata.temperature < 0 || metadata.temperature > 2) {
      return false;
    }
  }
  
  if (metadata.tokenUsage !== undefined) {
    const usage = metadata.tokenUsage;
    if (typeof usage !== 'object') return false;
    if (typeof usage.prompt !== 'number' || usage.prompt < 0) return false;
    if (typeof usage.completion !== 'number' || usage.completion < 0) return false;
    if (typeof usage.total !== 'number' || usage.total < 0) return false;
  }
  
  if (metadata.responseTime !== undefined) {
    if (typeof metadata.responseTime !== 'number' || metadata.responseTime < 0) return false;
  }
  
  if (metadata.codeBlocks !== undefined) {
    if (!Array.isArray(metadata.codeBlocks)) return false;
    for (const block of metadata.codeBlocks) {
      if (typeof block !== 'object') return false;
      if (typeof block.language !== 'string') return false;
      if (typeof block.code !== 'string') return false;
    }
  }
  
  if (metadata.fileReferences !== undefined) {
    if (!Array.isArray(metadata.fileReferences)) return false;
    for (const ref of metadata.fileReferences) {
      if (typeof ref !== 'string') return false;
    }
  }
  
  if (metadata.toolCalls !== undefined) {
    if (!Array.isArray(metadata.toolCalls)) return false;
    for (const call of metadata.toolCalls) {
      if (typeof call !== 'object') return false;
      if (typeof call.name !== 'string') return false;
      if (typeof call.parameters !== 'object') return false;
    }
  }
  
  return true;
}

export function validateMessage(message: any): message is ConversationMessage {
  if (!message || typeof message !== 'object') return false;
  
  // Validate required fields
  if (!validateMessageId(message.id)) return false;
  if (!validateMessageId(message.conversationId)) return false;
  if (!validateMessageRole(message.role)) return false;
  if (typeof message.content !== 'string' || message.content.length === 0) return false;
  
  // Validate timestamp
  if (!(message.timestamp instanceof Date)) return false;
  
  // Validate metadata if present
  if (message.metadata !== undefined && !validateMessageMetadata(message.metadata)) return false;
  
  return true;
}

/**
 * Type guards
 */

export function isMessageRole(value: unknown): value is MessageRole {
  return validateMessageRole(value);
}

export function isMessage(value: unknown): value is ConversationMessage {
  return validateMessage(value);
}

export function isMessageMetadata(value: unknown): value is MessageMetadata {
  return validateMessageMetadata(value);
}

/**
 * Helper functions
 */

export function isUserMessage(message: ConversationMessage): boolean {
  return message.role === 'user';
}

export function isAgentMessage(message: ConversationMessage): boolean {
  return message.role === 'agent';
}

export function isSystemMessage(message: ConversationMessage): boolean {
  return message.role === 'system';
}

export function isToolMessage(message: ConversationMessage): boolean {
  return message.role === 'tool';
}

export function isStreamingMessage(message: ConversationMessage): boolean {
  return message.metadata?.streaming === true;
}

export function isCompletedMessage(message: ConversationMessage): boolean {
  return message.metadata?.completed === true;
}

export function hasCodeBlocks(message: ConversationMessage): boolean {
  return (message.metadata?.codeBlocks?.length ?? 0) > 0;
}

export function hasToolCalls(message: ConversationMessage): boolean {
  return (message.metadata?.toolCalls?.length ?? 0) > 0;
}

/**
 * Message content utilities
 */

export function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }
  
  return blocks;
}

export function extractFileReferences(content: string): string[] {
  const fileRefRegex = /`([^`]+\.(ts|tsx|js|jsx|py|java|go|rs|cpp|c|h|css|html|json|yaml|yml|md|txt))`/g;
  const references: string[] = [];
  
  let match;
  while ((match = fileRefRegex.exec(content)) !== null) {
    references.push(match[1]);
  }
  
  return [...new Set(references)]; // Remove duplicates
}

export function sanitizeMessageContent(content: string, maxLength: number = 100000): string {
  // Remove null bytes
  let sanitized = content.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '... [truncated]';
  }
  
  return sanitized;
}

/**
 * Default values
 */

export const DEFAULT_MESSAGE_ROLE: MessageRole = 'user';
export const DEFAULT_MESSAGE_CONTENT = '';
export const DEFAULT_MESSAGE_METADATA: MessageMetadata = {};
