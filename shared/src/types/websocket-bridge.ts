// WebSocket/RPC bridge types for VSCode-backend communication

/**
 * WebSocket bridge for real-time communication between VSCode and backend
 * Supports both event-based messaging and RPC-style request/response
 */
export interface WebSocketBridge {
  // Connection management
  connect(url: string, options?: ConnectionOptions): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Event-based messaging
  emit(event: string, data: any): void;
  on(event: string, handler: EventHandler): () => void;
  off(event: string, handler: EventHandler): void;
  once(event: string, handler: EventHandler): void;
  
  // RPC-style request/response
  request<T = any>(method: string, params?: any, timeout?: number): Promise<T>;
  
  // Subscription management
  subscribe(channel: string, handler: SubscriptionHandler): () => void;
  unsubscribe(channel: string): void;
  
  // Connection state
  getState(): ConnectionState;
  onStateChange(handler: StateChangeHandler): () => void;
}

/**
 * Connection options
 */
export interface ConnectionOptions {
  // Authentication
  auth?: {
    token?: string;
    userId?: string;
    sessionId?: string;
  };
  
  // Reconnection
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  reconnectDelayMax?: number;
  
  // Timeouts
  timeout?: number;
  pingInterval?: number;
  pongTimeout?: number;
  
  // Transport
  transports?: ('websocket' | 'polling')[];
  
  // Custom headers
  headers?: Record<string, string>;
  
  // Query parameters
  query?: Record<string, string>;
}

/**
 * Connection state
 */
export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'reconnecting' | 'error';
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectAttempts: number;
  latency?: number;
  error?: Error;
}

/**
 * Event handler
 */
export type EventHandler = (data: any) => void;

/**
 * Subscription handler
 */
export type SubscriptionHandler = (data: any) => void;

/**
 * State change handler
 */
export type StateChangeHandler = (state: ConnectionState) => void;

/**
 * RPC request
 */
export interface RPCRequest {
  id: string;
  method: string;
  params?: any;
  timestamp: Date;
}

/**
 * RPC response
 */
export interface RPCResponse<T = any> {
  id: string;
  result?: T;
  error?: RPCError;
  timestamp: Date;
}

/**
 * RPC error
 */
export interface RPCError {
  code: number;
  message: string;
  data?: any;
}

/**
 * Standard RPC error codes
 */
export enum RPCErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  TIMEOUT = -32000,
  UNAUTHORIZED = -32001,
  FORBIDDEN = -32002,
  NOT_FOUND = -32003,
}

/**
 * WebSocket event types for agent communication
 */
export enum AgentEventType {
  // Agent status
  AGENT_STATUS_UPDATE = 'agent_status_update',
  AGENT_STARTED = 'agent_started',
  AGENT_STOPPED = 'agent_stopped',
  AGENT_ERROR = 'agent_error',
  
  // Task events
  TASK_STARTED = 'task_started',
  TASK_PROGRESS = 'task_progress',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  TASK_CANCELLED = 'task_cancelled',
  
  // Message events
  MESSAGE_CREATED = 'message_created',
  MESSAGE_UPDATED = 'message_updated',
  MESSAGE_STREAMING = 'message_streaming',
  MESSAGE_COMPLETED = 'message_completed',
  MESSAGE_STOPPED = 'message_stopped',
  
  // Conversation events
  CONVERSATION_CREATED = 'conversation_created',
  CONVERSATION_UPDATED = 'conversation_updated',
  CONVERSATION_ARCHIVED = 'conversation_archived',
  
  // Tool execution events
  TOOL_STARTED = 'tool_started',
  TOOL_PROGRESS = 'tool_progress',
  TOOL_COMPLETED = 'tool_completed',
  TOOL_FAILED = 'tool_failed',
  
  // File events
  FILE_CREATED = 'file_created',
  FILE_UPDATED = 'file_updated',
  FILE_DELETED = 'file_deleted',
  FILE_RENAMED = 'file_renamed',
  
  // Editor events
  EDITOR_OPENED = 'editor_opened',
  EDITOR_CLOSED = 'editor_closed',
  EDITOR_CHANGED = 'editor_changed',
  SELECTION_CHANGED = 'selection_changed',
  
  // Terminal events
  TERMINAL_OUTPUT = 'terminal_output',
  TERMINAL_COMMAND = 'terminal_command',
  TERMINAL_EXIT = 'terminal_exit',
  
  // Git events
  GIT_COMMIT = 'git_commit',
  GIT_PUSH = 'git_push',
  GIT_PULL = 'git_pull',
  GIT_BRANCH_CHANGED = 'git_branch_changed',
  
  // System events
  SYSTEM_HEALTH = 'system_health',
  SYSTEM_ERROR = 'system_error',
  SYSTEM_WARNING = 'system_warning',
}

/**
 * WebSocket event payload
 */
export interface WebSocketEvent<T = any> {
  type: AgentEventType | string;
  data: T;
  timestamp: Date;
  source?: string;
  correlationId?: string;
}

/**
 * Agent status update event
 */
export interface AgentStatusUpdateEvent {
  agentId: string;
  status: 'idle' | 'thinking' | 'coding' | 'testing' | 'error' | 'offline';
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Task progress event
 */
export interface TaskProgressEvent {
  taskId: string;
  agentId: string;
  progress: number; // 0-100
  stage: string;
  message?: string;
  estimatedCompletion?: Date;
}

/**
 * Message streaming event
 */
export interface MessageStreamingEvent {
  messageId: string;
  conversationId: string;
  content: string;
  delta?: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

/**
 * Tool execution event
 */
export interface ToolExecutionEvent {
  toolId: string;
  toolName: string;
  agentId: string;
  conversationId?: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
}

/**
 * File change event
 */
export interface FileChangeEvent {
  path: string;
  action: 'created' | 'updated' | 'deleted' | 'renamed';
  content?: string;
  oldPath?: string;
  newPath?: string;
  agentId?: string;
  conversationId?: string;
}

/**
 * Editor change event
 */
export interface EditorChangeEvent {
  file: string;
  action: 'opened' | 'closed' | 'changed';
  content?: string;
  selection?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  cursor?: { line: number; character: number };
}

/**
 * Terminal output event
 */
export interface TerminalOutputEvent {
  terminalId: string;
  output: string;
  type: 'stdout' | 'stderr';
  timestamp: Date;
}

/**
 * RPC methods for agent operations
 */
export enum AgentRPCMethod {
  // Agent management
  CREATE_AGENT = 'agent.create',
  GET_AGENT = 'agent.get',
  UPDATE_AGENT = 'agent.update',
  DELETE_AGENT = 'agent.delete',
  LIST_AGENTS = 'agent.list',
  START_AGENT = 'agent.start',
  STOP_AGENT = 'agent.stop',
  
  // Conversation management
  CREATE_CONVERSATION = 'conversation.create',
  GET_CONVERSATION = 'conversation.get',
  UPDATE_CONVERSATION = 'conversation.update',
  DELETE_CONVERSATION = 'conversation.delete',
  LIST_CONVERSATIONS = 'conversation.list',
  
  // Message management
  SEND_MESSAGE = 'message.send',
  GET_MESSAGES = 'message.list',
  STOP_GENERATION = 'message.stop',
  
  // Task execution
  EXECUTE_TASK = 'task.execute',
  GET_TASK_STATUS = 'task.status',
  CANCEL_TASK = 'task.cancel',
  
  // Tool execution
  EXECUTE_TOOL = 'tool.execute',
  LIST_TOOLS = 'tool.list',
  GET_TOOL_INFO = 'tool.info',
  
  // File operations
  READ_FILE = 'file.read',
  WRITE_FILE = 'file.write',
  CREATE_FILE = 'file.create',
  DELETE_FILE = 'file.delete',
  LIST_FILES = 'file.list',
  
  // Editor operations
  OPEN_FILE = 'editor.open',
  CLOSE_FILE = 'editor.close',
  INSERT_TEXT = 'editor.insert',
  REPLACE_TEXT = 'editor.replace',
  GET_SELECTION = 'editor.selection',
  
  // Terminal operations
  EXECUTE_COMMAND = 'terminal.execute',
  CREATE_TERMINAL = 'terminal.create',
  SEND_TEXT = 'terminal.send',
  
  // Git operations
  GIT_STATUS = 'git.status',
  GIT_COMMIT = 'git.commit',
  GIT_PUSH = 'git.push',
  GIT_PULL = 'git.pull',
  
  // System operations
  GET_HEALTH = 'system.health',
  GET_METRICS = 'system.metrics',
}

/**
 * WebSocket bridge factory
 */
export interface WebSocketBridgeFactory {
  create(type: 'client' | 'server', options?: any): WebSocketBridge;
}

/**
 * WebSocket server interface
 */
export interface WebSocketServer {
  // Server lifecycle
  start(port: number, options?: ServerOptions): Promise<void>;
  stop(): Promise<void>;
  
  // Client management
  getClients(): WebSocketClient[];
  getClient(clientId: string): WebSocketClient | null;
  broadcast(event: string, data: any, filter?: ClientFilter): void;
  
  // Room management
  createRoom(roomId: string): void;
  deleteRoom(roomId: string): void;
  addToRoom(clientId: string, roomId: string): void;
  removeFromRoom(clientId: string, roomId: string): void;
  broadcastToRoom(roomId: string, event: string, data: any): void;
  
  // RPC handling
  registerMethod(method: string, handler: RPCMethodHandler): void;
  unregisterMethod(method: string): void;
  
  // Event handling
  onConnection(handler: ConnectionHandler): void;
  onDisconnection(handler: DisconnectionHandler): void;
  onError(handler: ErrorHandler): void;
}

/**
 * Server options
 */
export interface ServerOptions {
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  maxConnections?: number;
  pingInterval?: number;
  pongTimeout?: number;
  compression?: boolean;
  perMessageDeflate?: boolean;
}

/**
 * WebSocket client (server-side representation)
 */
export interface WebSocketClient {
  id: string;
  userId?: string;
  sessionId?: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: Set<string>;
  metadata: Record<string, any>;
  
  // Client operations
  send(event: string, data: any): void;
  disconnect(reason?: string): void;
  join(room: string): void;
  leave(room: string): void;
}

/**
 * Client filter for broadcasting
 */
export type ClientFilter = (client: WebSocketClient) => boolean;

/**
 * RPC method handler
 */
export type RPCMethodHandler = (params: any, client: WebSocketClient) => Promise<any>;

/**
 * Connection handler
 */
export type ConnectionHandler = (client: WebSocketClient) => void;

/**
 * Disconnection handler
 */
export type DisconnectionHandler = (client: WebSocketClient, reason: string) => void;

/**
 * Error handler
 */
export type ErrorHandler = (error: Error, client?: WebSocketClient) => void;

/**
 * Message queue for reliable delivery
 */
export interface MessageQueue {
  enqueue(message: QueuedMessage): void;
  dequeue(): QueuedMessage | null;
  peek(): QueuedMessage | null;
  size(): number;
  clear(): void;
  
  // Persistence
  save(): Promise<void>;
  load(): Promise<void>;
}

/**
 * Queued message
 */
export interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
  nextRetry?: Date;
  priority: number;
}

/**
 * Message acknowledgment
 */
export interface MessageAck {
  messageId: string;
  status: 'received' | 'processed' | 'failed';
  timestamp: Date;
  error?: string;
}
