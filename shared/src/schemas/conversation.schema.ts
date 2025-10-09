/**
 * Conversation schema definitions and validators
 */

import { AgentConversation } from '../types';

/**
 * Conversation status enum
 */
export const ConversationStatusEnum = ['active', 'archived'] as const;
export type ConversationStatus = typeof ConversationStatusEnum[number];

/**
 * Create conversation request schema
 */
export const CreateConversationSchema = {
  agentId: {
    type: 'string' as const,
    required: true,
    pattern: /^[a-f0-9-]{36}$/i, // UUID pattern
  },
  userId: {
    type: 'string' as const,
    required: true,
    pattern: /^[a-f0-9-]{36}$/i,
  },
  projectId: {
    type: 'string' as const,
    required: false,
    pattern: /^[a-f0-9-]{36}$/i,
  },
  title: {
    type: 'string' as const,
    required: false,
    minLength: 1,
    maxLength: 200,
  },
  initialMessage: {
    type: 'string' as const,
    required: false,
    maxLength: 10000,
  },
};

/**
 * Update conversation request schema
 */
export const UpdateConversationSchema = {
  title: {
    type: 'string' as const,
    required: false,
    minLength: 1,
    maxLength: 200,
  },
  status: {
    type: 'string' as const,
    required: false,
    enum: ConversationStatusEnum,
  },
};

/**
 * Validator functions
 */

export function validateConversationStatus(status: any): status is ConversationStatus {
  return ConversationStatusEnum.includes(status);
}

export function validateConversationId(id: any): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-f0-9-]{36}$/i.test(id);
}

export function validateConversation(conversation: any): conversation is AgentConversation {
  if (!conversation || typeof conversation !== 'object') return false;
  
  // Validate required fields
  if (!validateConversationId(conversation.id)) return false;
  if (!validateConversationId(conversation.agentId)) return false;
  if (!validateConversationId(conversation.userId)) return false;
  if (typeof conversation.title !== 'string' || conversation.title.length === 0) return false;
  if (!validateConversationStatus(conversation.status)) return false;
  
  // Validate dates
  if (!(conversation.createdAt instanceof Date)) return false;
  if (!(conversation.updatedAt instanceof Date)) return false;
  
  // Validate messages array
  if (!Array.isArray(conversation.messages)) return false;
  
  return true;
}

/**
 * Type guards
 */

export function isConversationStatus(value: unknown): value is ConversationStatus {
  return validateConversationStatus(value);
}

export function isConversation(value: unknown): value is AgentConversation {
  return validateConversation(value);
}

/**
 * Default values
 */

export const DEFAULT_CONVERSATION_TITLE = 'New Conversation';
export const DEFAULT_CONVERSATION_STATUS: ConversationStatus = 'active';
