// Conversation management and short-term memory types

import { ConversationMessage, AgentConversation, MessageMetadata as BaseMessageMetadata } from './agent';
import { AgentContext } from './context';

/**
 * ConversationManager handles short-term memory storage and retrieval
 * Manages conversation state, message history, and real-time updates
 */
export interface ConversationManager {
  // Conversation lifecycle
  createConversation(params: CreateConversationParams): Promise<AgentConversation>;
  getConversation(conversationId: string): Promise<AgentConversation | null>;
  updateConversation(conversationId: string, updates: Partial<AgentConversation>): Promise<AgentConversation>;
  deleteConversation(conversationId: string): Promise<void>;
  archiveConversation(conversationId: string): Promise<void>;
  
  // Message management
  addMessage(conversationId: string, message: CreateMessageParams): Promise<ConversationMessage>;
  getMessage(messageId: string): Promise<ConversationMessage | null>;
  updateMessage(messageId: string, updates: Partial<ConversationMessage>): Promise<ConversationMessage>;
  deleteMessage(messageId: string): Promise<void>;
  
  // Message streaming
  streamMessage(conversationId: string, message: CreateMessageParams): AsyncGenerator<MessageChunk, void, unknown>;
  stopStreaming(conversationId: string, messageId: string): Promise<void>;
  
  // History retrieval
  getMessages(conversationId: string, options?: GetMessagesOptions): Promise<ConversationMessage[]>;
  getMessageRange(conversationId: string, startIndex: number, count: number): Promise<ConversationMessage[]>;
  searchMessages(conversationId: string, query: string): Promise<ConversationMessage[]>;
  
  // Conversation queries
  listConversations(userId: string, options?: ListConversationsOptions): Promise<AgentConversation[]>;
  getConversationsByAgent(agentId: string, userId: string): Promise<AgentConversation[]>;
  getConversationsByProject(projectId: string, userId: string): Promise<AgentConversation[]>;
  
  // Memory management
  pruneHistory(conversationId: string, maxMessages: number): Promise<void>;
  summarizeConversation(conversationId: string): Promise<ConversationSummary>;
  exportConversation(conversationId: string, format: 'json' | 'markdown' | 'text'): Promise<string>;
  
  // Real-time updates
  subscribeToConversation(conversationId: string, callback: ConversationUpdateCallback): () => void;
  subscribeToMessage(messageId: string, callback: MessageUpdateCallback): () => void;
  
  // Context integration
  getConversationContext(conversationId: string): Promise<AgentContext | null>;
  updateConversationContext(conversationId: string, context: Partial<AgentContext>): Promise<void>;
}

/**
 * Parameters for creating a new conversation
 */
export interface CreateConversationParams {
  agentId: string;
  userId: string;
  projectId?: string;
  title?: string;
  initialMessage?: string;
  metadata?: ConversationMetadata;
}

/**
 * Parameters for creating a new message
 */
export interface CreateMessageParams {
  role: 'user' | 'agent' | 'system' | 'tool';
  content: string;
  metadata?: ConversationMessageMetadata;
  parentMessageId?: string;
}

/**
 * Extended message metadata for conversation manager
 * Extends the base MessageMetadata from agent types
 */
export interface ConversationMessageMetadata extends BaseMessageMetadata {
  // Streaming state
  streaming?: boolean;
  completed?: boolean;
  stopped?: boolean;
  
  // Generation info
  model?: string;
  provider?: string;
  temperature?: number;
  
  // Token usage
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  
  // Timing
  generatedAt?: string;
  responseTime?: number;
  
  // Content analysis
  codeBlocks?: Array<{
    language: string;
    code: string;
    filename?: string;
  }>;
  fileReferences?: string[];
  toolCalls?: Array<{
    name: string;
    parameters: Record<string, any>;
    result?: any;
  }>;
  
  // Custom metadata
  [key: string]: any;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  tags?: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  archived?: boolean;
  pinned?: boolean;
  lastActivity?: Date;
  messageCount?: number;
  participantCount?: number;
  custom?: Record<string, any>;
}

/**
 * Options for retrieving messages
 */
export interface GetMessagesOptions {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  includeMetadata?: boolean;
  roles?: Array<'user' | 'agent' | 'system' | 'tool'>;
  since?: Date;
  until?: Date;
}

/**
 * Options for listing conversations
 */
export interface ListConversationsOptions {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  status?: 'active' | 'archived' | 'all';
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  includeMessages?: boolean;
  tags?: string[];
}

/**
 * Message chunk for streaming
 */
export interface MessageChunk {
  messageId: string;
  conversationId: string;
  content: string;
  delta?: string;
  isComplete: boolean;
  metadata?: Partial<ConversationMessageMetadata>;
  timestamp: Date;
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  conversationId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  messageCount: number;
  duration: number; // in milliseconds
  participants: Array<{
    role: string;
    messageCount: number;
  }>;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Callback for conversation updates
 */
export type ConversationUpdateCallback = (event: ConversationUpdateEvent) => void;

/**
 * Conversation update event
 */
export interface ConversationUpdateEvent {
  type: 'message_added' | 'message_updated' | 'message_deleted' | 'conversation_updated' | 'conversation_archived';
  conversationId: string;
  data: any;
  timestamp: Date;
}

/**
 * Callback for message updates
 */
export type MessageUpdateCallback = (event: MessageUpdateEvent) => void;

/**
 * Message update event
 */
export interface MessageUpdateEvent {
  type: 'content_updated' | 'metadata_updated' | 'streaming_chunk' | 'streaming_complete' | 'streaming_stopped';
  messageId: string;
  conversationId: string;
  data: any;
  timestamp: Date;
}

/**
 * Conversation store interface for persistence
 */
export interface ConversationStore {
  // Persistence operations
  save(conversation: AgentConversation): Promise<void>;
  load(conversationId: string): Promise<AgentConversation | null>;
  delete(conversationId: string): Promise<void>;
  
  // Message persistence
  saveMessage(message: ConversationMessage): Promise<void>;
  loadMessages(conversationId: string, options?: GetMessagesOptions): Promise<ConversationMessage[]>;
  deleteMessage(messageId: string): Promise<void>;
  
  // Batch operations
  saveBatch(conversations: AgentConversation[]): Promise<void>;
  loadBatch(conversationIds: string[]): Promise<AgentConversation[]>;
  
  // Query operations
  query(filter: ConversationFilter): Promise<AgentConversation[]>;
  count(filter: ConversationFilter): Promise<number>;
  
  // Cleanup operations
  prune(olderThan: Date): Promise<number>;
  vacuum(): Promise<void>;
}

/**
 * Filter for querying conversations
 */
export interface ConversationFilter {
  userId?: string;
  agentId?: string;
  projectId?: string;
  status?: 'active' | 'archived';
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  hasMessages?: boolean;
  minMessages?: number;
  maxMessages?: number;
}

/**
 * Conversation cache for performance optimization
 */
export interface ConversationCache {
  // Cache operations
  get(conversationId: string): Promise<AgentConversation | null>;
  set(conversationId: string, conversation: AgentConversation, ttl?: number): Promise<void>;
  delete(conversationId: string): Promise<void>;
  clear(): Promise<void>;
  
  // Message cache
  getMessages(conversationId: string): Promise<ConversationMessage[] | null>;
  setMessages(conversationId: string, messages: ConversationMessage[], ttl?: number): Promise<void>;
  
  // Cache statistics
  getStats(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hitCount: number;
  missCount: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictionCount: number;
}

/**
 * Conversation analytics
 */
export interface ConversationAnalytics {
  // Conversation metrics
  getTotalConversations(userId: string): Promise<number>;
  getActiveConversations(userId: string): Promise<number>;
  getAverageMessageCount(userId: string): Promise<number>;
  getAverageResponseTime(agentId: string): Promise<number>;
  
  // Usage patterns
  getConversationsByTimeRange(userId: string, start: Date, end: Date): Promise<ConversationTimeSeriesData[]>;
  getPopularAgents(userId: string, limit: number): Promise<AgentUsageData[]>;
  getPopularTopics(userId: string, limit: number): Promise<TopicData[]>;
  
  // Performance metrics
  getTokenUsage(userId: string, timeRange?: TimeRange): Promise<TokenUsageData>;
  getModelUsage(userId: string, timeRange?: TimeRange): Promise<ModelUsageData[]>;
}

/**
 * Time series data for conversations
 */
export interface ConversationTimeSeriesData {
  timestamp: Date;
  count: number;
  messageCount: number;
  averageResponseTime: number;
}

/**
 * Agent usage data
 */
export interface AgentUsageData {
  agentId: string;
  agentName: string;
  conversationCount: number;
  messageCount: number;
  averageResponseTime: number;
  lastUsed: Date;
}

/**
 * Topic data
 */
export interface TopicData {
  topic: string;
  count: number;
  relatedConversations: string[];
}

/**
 * Token usage data
 */
export interface TokenUsageData {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  averageTokensPerMessage: number;
  costEstimate?: number;
}

/**
 * Model usage data
 */
export interface ModelUsageData {
  modelId: string;
  provider: string;
  requestCount: number;
  totalTokens: number;
  averageResponseTime: number;
  errorRate: number;
}

/**
 * Time range for analytics
 */
export interface TimeRange {
  start: Date;
  end: Date;
}
