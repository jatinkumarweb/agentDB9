/**
 * Knowledge Base and Vector Store Types
 */

import { KnowledgeSource, KnowledgeSourceMetadata, CodeBlock } from './agent';

/**
 * Document chunk with embeddings
 */
export interface DocumentChunk {
  id: string;
  sourceId: string;
  agentId: string;
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
  createdAt: Date;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  // Position in document
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  
  // Content info
  tokenCount: number;
  characterCount: number;
  
  // Source info
  sourceType: string;
  sourceUrl?: string;
  sourceTitle: string;
  
  // Semantic info
  heading?: string;
  section?: string;
  codeLanguage?: string;
  
  // Tags and classification
  tags: string[];
  category?: string;
  importance?: number; // 0-1
  
  // Version control
  version?: string;
  lastUpdated: Date;
}

/**
 * Vector search query
 */
export interface VectorSearchQuery {
  query: string;
  agentId: string;
  topK?: number;
  filters?: VectorSearchFilters;
  includeMetadata?: boolean;
  minScore?: number;
}

/**
 * Vector search filters
 */
export interface VectorSearchFilters {
  sourceTypes?: string[];
  tags?: string[];
  categories?: string[];
  languages?: string[];
  frameworks?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  version?: string;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  chunk: DocumentChunk;
  score: number;
  highlights?: string[];
}

/**
 * Knowledge ingestion request
 */
export interface KnowledgeIngestionRequest {
  agentId: string;
  source: KnowledgeSource;
  options?: IngestionOptions;
}

/**
 * Ingestion options
 */
export interface IngestionOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  extractMetadata?: boolean;
  generateEmbeddings?: boolean;
  overwrite?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  sourceId: string;
  status: 'success' | 'partial' | 'failed';
  chunksCreated: number;
  tokensProcessed: number;
  duration: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Knowledge retrieval request
 */
export interface KnowledgeRetrievalRequest {
  agentId: string;
  query: string;
  context?: string;
  topK?: number;
  filters?: VectorSearchFilters;
  rerank?: boolean;
}

/**
 * Knowledge retrieval response
 */
export interface KnowledgeRetrievalResponse {
  results: VectorSearchResult[];
  totalResults: number;
  query: string;
  processingTime: number;
  context?: string;
}

/**
 * Embedding provider configuration
 */
export interface EmbeddingProviderConfig {
  provider: 'openai' | 'cohere' | 'huggingface' | 'ollama';
  model: string;
  apiKey?: string;
  apiUrl?: string;
  dimensions?: number;
  batchSize?: number;
  maxRetries?: number;
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  type: 'chroma' | 'pinecone' | 'weaviate' | 'qdrant';
  url?: string;
  apiKey?: string;
  collection: string;
  dimensions: number;
  metric?: 'cosine' | 'euclidean' | 'dot';
  indexType?: string;
}

/**
 * Document loader interface
 */
export interface DocumentLoader {
  type: 'pdf' | 'markdown' | 'website' | 'api' | 'github';
  load(source: KnowledgeSource): Promise<LoadedDocument>;
  supports(source: KnowledgeSource): boolean;
}

/**
 * Loaded document
 */
export interface LoadedDocument {
  content: string;
  metadata: KnowledgeSourceMetadata;
  sections?: DocumentSection[];
  codeBlocks?: CodeBlock[];
}

/**
 * Document section
 */
export interface DocumentSection {
  title: string;
  content: string;
  level: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Text chunker interface
 */
export interface TextChunker {
  chunk(document: LoadedDocument, options: ChunkingOptions): DocumentChunk[];
}

/**
 * Chunking options
 */
export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  preserveStructure?: boolean;
  splitOnSentences?: boolean;
  respectCodeBlocks?: boolean;
}

/**
 * Embedding generator interface
 */
export interface EmbeddingGenerator {
  generate(texts: string[]): Promise<number[][]>;
  generateSingle(text: string): Promise<number[]>;
  getDimensions(): number;
}

/**
 * Vector store interface
 */
export interface VectorStore {
  // Collection management
  createCollection(name: string, dimensions: number): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  collectionExists(name: string): Promise<boolean>;
  
  // Document operations
  addDocuments(chunks: DocumentChunk[]): Promise<void>;
  updateDocument(chunkId: string, chunk: DocumentChunk): Promise<void>;
  deleteDocument(chunkId: string): Promise<void>;
  deleteBySource(sourceId: string): Promise<void>;
  
  // Search operations
  search(query: VectorSearchQuery, embedding: number[]): Promise<VectorSearchResult[]>;
  similaritySearch(embedding: number[], topK: number, filters?: VectorSearchFilters): Promise<VectorSearchResult[]>;
  
  // Metadata operations
  getMetadata(chunkId: string): Promise<ChunkMetadata | null>;
  updateMetadata(chunkId: string, metadata: Partial<ChunkMetadata>): Promise<void>;
  
  // Statistics
  getCollectionStats(collection: string): Promise<CollectionStats>;
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  name: string;
  documentCount: number;
  totalTokens: number;
  dimensions: number;
  lastUpdated: Date;
  storageSize?: number;
}

/**
 * Knowledge base manager interface
 */
export interface KnowledgeBaseManager {
  // Ingestion
  ingestSource(request: KnowledgeIngestionRequest): Promise<IngestionResult>;
  ingestBatch(requests: KnowledgeIngestionRequest[]): Promise<IngestionResult[]>;
  
  // Retrieval
  retrieve(request: KnowledgeRetrievalRequest): Promise<KnowledgeRetrievalResponse>;
  
  // Source management
  addSource(agentId: string, source: KnowledgeSource): Promise<KnowledgeSource>;
  updateSource(sourceId: string, updates: Partial<KnowledgeSource>): Promise<KnowledgeSource>;
  deleteSource(sourceId: string): Promise<void>;
  listSources(agentId: string): Promise<KnowledgeSource[]>;
  
  // Reindexing
  reindexSource(sourceId: string): Promise<IngestionResult>;
  reindexAgent(agentId: string): Promise<IngestionResult[]>;
  
  // Statistics
  getStats(agentId: string): Promise<KnowledgeBaseStats>;
}

/**
 * Knowledge base statistics
 */
export interface KnowledgeBaseStats {
  agentId: string;
  totalSources: number;
  totalChunks: number;
  totalTokens: number;
  sourcesByType: Record<string, number>;
  lastIndexed?: Date;
  storageSize?: number;
}

/**
 * Knowledge context for agent
 */
export interface AgentKnowledgeContext {
  agentId: string;
  relevantChunks: DocumentChunk[];
  sources: KnowledgeSource[];
  totalRelevance: number;
  retrievalTime: number;
}

/**
 * Reranker interface for improving search results
 */
export interface Reranker {
  rerank(query: string, results: VectorSearchResult[]): Promise<VectorSearchResult[]>;
}

/**
 * Knowledge update event
 */
export interface KnowledgeUpdateEvent {
  type: 'source_added' | 'source_updated' | 'source_deleted' | 'reindex_started' | 'reindex_completed' | 'reindex_failed';
  agentId: string;
  sourceId?: string;
  timestamp: Date;
  data?: any;
}
