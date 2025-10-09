/**
 * Memory System Types
 * 
 * Implements short-term (STM) and long-term (LTM) memory for agents
 * to enable continuous learning and context retention across sessions.
 */

/**
 * Memory types
 */
export type MemoryType = 'short-term' | 'long-term';

/**
 * Memory entry categories
 */
export type MemoryCategory = 
  | 'interaction'      // User-agent interactions
  | 'lesson'          // Learned lessons and patterns
  | 'challenge'       // Resolved challenges and solutions
  | 'feedback'        // User feedback and preferences
  | 'context'         // Project and workspace context
  | 'decision'        // Important decisions made
  | 'error'           // Errors encountered and fixes
  | 'success'         // Successful completions
  | 'preference';     // User preferences and patterns

/**
 * Short-Term Memory Entry
 * Stores recent interactions and context for active sessions
 */
export interface ShortTermMemory {
  id: string;
  agentId: string;
  sessionId: string;
  category: MemoryCategory;
  content: string;
  metadata: MemoryMetadata;
  importance: number; // 0-1, used for consolidation priority
  embedding?: number[];
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Long-Term Memory Entry
 * Stores consolidated knowledge and learnings
 */
export interface LongTermMemory {
  id: string;
  agentId: string;
  category: MemoryCategory;
  summary: string;
  details: string;
  metadata: MemoryMetadata;
  importance: number;
  accessCount: number;
  lastAccessedAt?: Date;
  embedding?: number[];
  consolidatedFrom?: string[]; // STM IDs that were consolidated
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Memory metadata
 */
export interface MemoryMetadata {
  // Context
  workspaceId?: string;
  projectId?: string;
  userId?: string;
  
  // Classification
  tags: string[];
  keywords: string[];
  
  // Relationships
  relatedMemories?: string[];
  parentMemoryId?: string;
  
  // Quality metrics
  confidence: number; // 0-1
  relevance: number;  // 0-1
  
  // Source information
  source: MemorySource;
  sourceId?: string;
  
  // Consolidation tracking
  lastConsolidation?: Date;
  consolidationCount?: number;
  
  // Custom metadata
  custom?: Record<string, any>;
}

/**
 * Memory source
 */
export type MemorySource = 
  | 'chat'
  | 'code-execution'
  | 'error-resolution'
  | 'user-feedback'
  | 'system-observation'
  | 'consolidation';

/**
 * Memory query for retrieval
 */
export interface MemoryQuery {
  agentId: string;
  query?: string;
  category?: MemoryCategory;
  sessionId?: string;
  workspaceId?: string;
  tags?: string[];
  minImportance?: number;
  minRelevance?: number;
  limit?: number;
  includeEmbeddings?: boolean;
}

/**
 * Memory retrieval result
 */
export interface MemoryRetrievalResult {
  memories: (ShortTermMemory | LongTermMemory)[];
  totalCount: number;
  query: string;
  processingTime: number;
}

/**
 * Memory consolidation request
 */
export interface MemoryConsolidationRequest {
  agentId: string;
  sessionId?: string;
  minImportance?: number;
  maxAge?: number; // in hours
  strategy?: ConsolidationStrategy;
}

/**
 * Consolidation strategy
 */
export type ConsolidationStrategy = 
  | 'summarize'      // Summarize multiple STMs into one LTM
  | 'merge'          // Merge similar STMs
  | 'promote'        // Promote important STMs to LTM
  | 'archive';       // Archive old STMs

/**
 * Memory consolidation result
 */
export interface MemoryConsolidationResult {
  agentId: string;
  strategy: ConsolidationStrategy;
  stmProcessed: number;
  ltmCreated: number;
  ltmUpdated: number;
  stmArchived: number;
  duration: number;
  summary: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  agentId: string;
  shortTerm: {
    total: number;
    byCategory: Record<MemoryCategory, number>;
    averageImportance: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  };
  longTerm: {
    total: number;
    byCategory: Record<MemoryCategory, number>;
    averageImportance: number;
    totalAccesses: number;
    mostAccessed?: LongTermMemory;
  };
  consolidation: {
    lastRun?: Date;
    totalRuns: number;
    averageDuration: number;
  };
}

/**
 * Memory context for agent
 * Provides relevant memories for current interaction
 */
export interface MemoryContext {
  agentId: string;
  sessionId: string;
  
  // Recent interactions (STM)
  recentInteractions: ShortTermMemory[];
  
  // Relevant long-term knowledge
  relevantLessons: LongTermMemory[];
  relevantChallenges: LongTermMemory[];
  relevantFeedback: LongTermMemory[];
  
  // Context summary
  summary: string;
  
  // Metadata
  totalMemories: number;
  retrievalTime: number;
}

/**
 * Memory creation request
 */
export interface CreateMemoryRequest {
  agentId: string;
  sessionId?: string;
  category: MemoryCategory;
  content: string;
  metadata?: Partial<MemoryMetadata>;
  importance?: number;
  type?: MemoryType;
}

/**
 * Memory update request
 */
export interface UpdateMemoryRequest {
  importance?: number;
  metadata?: Partial<MemoryMetadata>;
  content?: string;
  summary?: string;
}

/**
 * Memory search filters
 */
export interface MemorySearchFilters {
  category?: MemoryCategory[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  importanceRange?: {
    min: number;
    max: number;
  };
  workspaceId?: string;
  userId?: string;
}

/**
 * Lesson learned from experience
 */
export interface Lesson {
  id: string;
  agentId: string;
  title: string;
  description: string;
  context: string;
  solution: string;
  outcome: string;
  tags: string[];
  importance: number;
  applicableScenarios: string[];
  createdAt: Date;
  appliedCount: number;
  successRate: number;
}

/**
 * Challenge resolution record
 */
export interface ChallengeResolution {
  id: string;
  agentId: string;
  challenge: string;
  context: string;
  attemptedSolutions: string[];
  successfulSolution: string;
  reasoning: string;
  tags: string[];
  importance: number;
  createdAt: Date;
  reusedCount: number;
}

/**
 * User feedback record
 */
export interface UserFeedback {
  id: string;
  agentId: string;
  userId: string;
  sessionId: string;
  feedbackType: FeedbackType;
  content: string;
  context: string;
  sentiment: Sentiment;
  actionTaken?: string;
  tags: string[];
  createdAt: Date;
}

export type FeedbackType = 
  | 'positive'
  | 'negative'
  | 'suggestion'
  | 'correction'
  | 'preference';

export type Sentiment = 
  | 'very-positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very-negative';

/**
 * Memory consolidation job
 */
export interface ConsolidationJob {
  id: string;
  agentId: string;
  status: JobStatus;
  strategy: ConsolidationStrategy;
  startedAt: Date;
  completedAt?: Date;
  result?: MemoryConsolidationResult;
  error?: string;
}

export type JobStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

/**
 * Memory export format
 */
export interface MemoryExport {
  agentId: string;
  exportedAt: Date;
  shortTermMemories: ShortTermMemory[];
  longTermMemories: LongTermMemory[];
  stats: MemoryStats;
}

/**
 * Memory import request
 */
export interface MemoryImportRequest {
  agentId: string;
  data: MemoryExport;
  strategy: ImportStrategy;
}

export type ImportStrategy = 
  | 'merge'      // Merge with existing memories
  | 'replace'    // Replace all memories
  | 'append';    // Append to existing memories
