'use client';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Eye, 
  MessageSquare, 
  Share2, 
  Settings,
  X,
  Send,
  UserCircle,
  Dot,
  Square
} from 'lucide-react';
import { cn } from '@/utils/cn';
import wsManager from '@/lib/websocket';
import { useAuthStore } from '@/stores/authStore';
import { CodingAgent, AgentConversation, ConversationMessage } from '@agentdb9/shared';
import { useWebSocket } from '@/hooks/useWebSocket';

interface User {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  isAgent?: boolean;
  currentFile?: string;
  cursorPosition?: { line: number; column: number };
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system' | 'agent';
  _lastUpdated?: number; // For forcing React re-renders
}

interface CollaborationPanelProps {
  className?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  className = '',
  isOpen,
  onToggle
}) => {
  const { isAuthenticated, token } = useAuthStore();
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'share'>('users');
  const [selectedAgent, setSelectedAgent] = useState<CodingAgent | null>(null);
  const [availableAgents, setAvailableAgents] = useState<CodingAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  
  // Conversation-based chat state - messages stored IN conversation like chat page
  const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  
  // WebSocket integration
  const { isConnected: wsConnected, emit: wsEmit, on: wsOn, off: wsOff } = useWebSocket();
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  // Debug: Log when conversation messages change
  useEffect(() => {
    const messageCount = currentConversation?.messages?.length || 0;
    console.log('💬 Conversation messages updated, count:', messageCount, 'activeTab:', activeTab);
    if (messageCount > 0) {
      const lastMsg = currentConversation!.messages![messageCount - 1];
      console.log('Last message:', lastMsg.id, 'content:', lastMsg.content.substring(0, 50));
    }
  }, [currentConversation?.messages, activeTab]);

  // Fetch available agents from the same API as chat page
  const fetchAgents = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping agent fetch');
      return;
    }

    setIsLoadingAgents(true);
    try {
      console.log('Fetching agents for workspace chat with availability...');
      const response = await fetchWithAuth('/api/agents?includeAvailability=true');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Workspace agents response:', data);
        if (data.success) {
          // Filter out agents with unavailable models
          const availableAgents = (data.data || []).filter((agent: any) => 
            agent.modelAvailable !== false
          );
          
          setAvailableAgents(availableAgents);
          // Select first agent by default
          if (availableAgents.length > 0) {
            setSelectedAgent(availableAgents[0]);
            console.log('Selected default agent:', availableAgents[0].name);
          }
          
          // Log warning if some agents were filtered
          const unavailableCount = (data.data || []).length - availableAgents.length;
          if (unavailableCount > 0) {
            console.warn(`${unavailableCount} agent(s) hidden due to unavailable models`);
          }
        } else {
          console.error('Failed to fetch agents:', data.error);
        }
      } else {
        console.error('Failed to fetch agents:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  useEffect(() => {
    // Initialize current user
    const user: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      name: 'Developer',
      status: 'online',
      isAgent: false
    };
    setCurrentUser(user);

    // Add agent user
    const agentUser: User = {
      id: 'agent_ona',
      name: 'Agent Ona',
      status: 'online',
      isAgent: true
    };

    setActiveUsers([user, agentUser]);

    // Set up WebSocket listeners
    wsManager.on('user_joined', (userData: User) => {
      setActiveUsers(prev => {
        const exists = prev.find(u => u.id === userData.id);
        if (exists) return prev;
        return [...prev, userData];
      });
    });

    wsManager.on('user_left', (userId: string) => {
      setActiveUsers(prev => {
        return prev.filter(u => u.id !== userId);
      });
    });

    wsManager.on('user_status_changed', (data: { userId: string; status: User['status'] }) => {
      setActiveUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, status: data.status } : u
      ));
    });

    wsManager.on('user_file_changed', (data: { userId: string; file: string }) => {
      setActiveUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, currentFile: data.file } : u
      ));
    });

    wsManager.on('agent_message', (data: { message: string; context?: any }) => {
      const agentMessage: ChatMessage = {
        id: 'msg_' + Date.now(),
        userId: 'agent_ona',
        userName: 'Agent Ona',
        message: data.message,
        timestamp: new Date(),
        type: 'agent'
      };
    });

    // Join workspace
    if (wsManager.isConnected()) {
      wsManager.emit('join_workspace', { user });
    }

    return () => {
      wsManager.off('user_joined');
      wsManager.off('user_left');
      wsManager.off('user_status_changed');
      wsManager.off('user_file_changed');
      wsManager.off('agent_message');
    };
  }, []);

  // Helper function to get selected agent name
  const getSelectedAgentName = () => {
    return selectedAgent ? selectedAgent.name : 'AI Agent';
  };

  // Fetch agents when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAgents();
    }
  }, [isAuthenticated]);

  // WebSocket event handlers - use useCallback to prevent re-registration
  const handleMessageUpdate = useCallback((data: {
      conversationId: string;
      messageId: string;
      content: string;
      streaming: boolean;
      metadata?: any;
    }) => {
      console.log('🔄 Received message update:', data.messageId, 'streaming:', data.streaming, 'content length:', data.content.length);
      
      // Use flushSync to force synchronous update
      flushSync(() => {
        if (data.streaming) {
          setIsGenerating(true);
          setGeneratingMessageId(data.messageId);
        } else {
          setIsGenerating(false);
          setGeneratingMessageId(null);
        }
      });
      
      flushSync(() => {
        setCurrentConversation((prev) => {
          if (!prev) {
            console.log('❌ No current conversation');
            return prev;
          }
          if (prev.id !== data.conversationId) {
            console.log('❌ Conversation ID mismatch:', prev.id, 'vs', data.conversationId);
            return prev;
          }

          console.log('✅ Updating conversation messages');
          const existingMessages = prev.messages || [];
          const updatedMessages = existingMessages.map((msg) =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  content: data.content && data.content.length > 0 ? data.content : msg.content,
                  metadata: { ...msg.metadata, ...data.metadata, streaming: data.streaming },
                  _lastUpdated: Date.now(),
                }
              : { ...msg } // Clone all messages
          );

          const newConversation = { 
            ...prev, 
            messages: updatedMessages,
            _forceUpdate: Date.now() // Force React to detect change
          };
          console.log('📝 Updated conversation with', updatedMessages.length, 'messages');
          return newConversation;
        });
      });
    }, []);

    const handleNewMessage = useCallback((data: {
      conversationId: string;
      message: ConversationMessage;
    }) => {
      console.log('📨 Received new message:', data.message.id, 'role:', data.message.role);

      // If agent started streaming, mark generating immediately
      flushSync(() => {
        if (data.message.role === 'agent' && data.message.metadata?.streaming) {
          console.log('🤖 Agent message started streaming');
          setIsGenerating(true);
          setGeneratingMessageId(data.message.id);
        }
      });

      flushSync(() => {
        setCurrentConversation((prev) => {
          if (!prev) {
            console.log('❌ No current conversation for new message');
            return prev;
          }
          if (prev.id !== data.conversationId) {
            console.log('❌ Conversation ID mismatch for new message');
            return prev;
          }

          const existingMessages = prev.messages || [];
          const messageExists = existingMessages.some((m) => m.id === data.message.id);

          if (messageExists) {
            console.log('⚠️ Message already exists, updating instead');
            // Update existing message
            return {
              ...prev,
              messages: existingMessages.map((m) =>
                m.id === data.message.id ? { ...data.message, _lastUpdated: Date.now() } : { ...m }
              ),
            };
          }

          console.log('✅ Adding new message to conversation');
          return {
            ...prev,
            messages: [...existingMessages, { ...data.message, _lastUpdated: Date.now() }],
          };
        });
      });
    }, []);

  const handleGenerationStopped = useCallback((data: { conversationId: string; messageId: string }) => {
    console.log('⏹️ Generation stopped:', data.messageId);
    setIsGenerating(false);
    setGeneratingMessageId(null);
  }, []);

  // Memoize WebSocket handlers
  const wsHandlers = useMemo(() => ({
    message_update: handleMessageUpdate,
    new_message: handleNewMessage,
    generation_stopped: handleGenerationStopped,
  }), [handleMessageUpdate, handleNewMessage, handleGenerationStopped]);

  // Set up WebSocket handlers BEFORE joining rooms
  useEffect(() => {
    if (!wsConnected) return;

    console.log('🔌 Setting up WebSocket event handlers');

    Object.entries(wsHandlers).forEach(([event, handler]) => {
      wsOn(event, handler);
      console.log(`✅ Registered handler for: ${event}`);
    });

    return () => {
      console.log('🔌 Cleaning up WebSocket event handlers');
      Object.entries(wsHandlers).forEach(([event, handler]) => {
        wsOff(event, handler);
      });
    };
  }, [wsConnected, wsOn, wsOff, wsHandlers]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversation?.id) return;

    const loadMessages = async () => {
      try {
        console.log('📥 Loading messages for conversation:', currentConversation.id);
        const response = await fetchWithAuth(`/api/conversations/${currentConversation.id}/messages`);
        const data = await response.json();

        if (data.success) {
          console.log('✅ Loaded', data.data.length, 'messages');
          setCurrentConversation(prev => prev ? { ...prev, messages: data.data } : null);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    // Only load if messages are not already present
    if (!currentConversation.messages || currentConversation.messages.length === 0) {
      loadMessages();
    }
  }, [currentConversation?.id]);

  // Join conversation room AFTER handlers are set up and messages are loaded
  useEffect(() => {
    if (!wsConnected || !currentConversation?.id) return;

    const timer = setTimeout(() => {
      console.log('🔗 Joining conversation room:', currentConversation.id);
      wsEmit('join_conversation', { conversationId: currentConversation.id });
    }, 100);

    return () => {
      clearTimeout(timer);
      console.log('🔌 Leaving conversation room:', currentConversation.id);
      wsEmit('leave_conversation', { conversationId: currentConversation.id });
    };
  }, [wsConnected, currentConversation?.id, wsEmit]);



  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !selectedAgent || isLoading || isGenerating) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    try {
      // Get or create conversation
      const conversation = await getOrCreateConversation();
      if (!conversation) {
        throw new Error('Failed to create conversation');
      }

      // Send message to conversation endpoint
      const response = await fetchWithAuth(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: messageContent }),
      });

      const data = await response.json();
      if (data.success) {
        // WebSocket will handle adding the message and agent response
        // If WebSocket is not connected, fall back to polling
        if (!wsConnected) {
          console.log('WebSocket not connected, using polling fallback');
          setTimeout(() => {
            // Refresh conversation messages
            fetchConversationMessages(conversation.id);
          }, 2000);
        }
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Restore the message content
      setNewMessage(messageContent);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch conversation messages (fallback for when WebSocket is not available)
  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetchWithAuth(`/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentConversation(prev => prev ? { ...prev, messages: data.data } : null);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Failed to fetch conversation messages:', error);
      setIsGenerating(false);
    }
  };

  // Create or get conversation for workspace chat
  const getOrCreateConversation = async () => {
    if (!selectedAgent) return null;

    try {
      // Check if we already have a conversation for this agent
      if (currentConversation && currentConversation.agentId === selectedAgent.id) {
        return currentConversation;
      }

      // Create a new conversation for workspace chat
      const response = await fetchWithAuth('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId: selectedAgent.id, 
          title: `Workspace Chat with ${selectedAgent.name}` 
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newConversation = { ...data.data, messages: [] };
        setCurrentConversation(newConversation);
        return newConversation;
      } else {
        console.error('Failed to create conversation:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const stopGeneration = useCallback(async () => {
    if (!isGenerating || !generatingMessageId || !currentConversation?.id) return;

    try {
      console.log('⏹️ Stopping generation for message:', generatingMessageId);
      
      if (wsConnected) {
        wsEmit('stop_generation', { conversationId: currentConversation.id, messageId: generatingMessageId });
      }

      const response = await fetchWithAuth(`/api/conversations/${currentConversation.id}/messages/${generatingMessageId}/stop`, {
        method: 'POST',
      });

      if (response.ok) {
        setIsGenerating(false);
        setGeneratingMessageId(null);
      }
    } catch (err) {
      console.error('Failed to stop generation:', err);
      setIsGenerating(false);
      setGeneratingMessageId(null);
    }
  }, [isGenerating, generatingMessageId, wsConnected, wsEmit, currentConversation?.id]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-20 z-40 p-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
        title="Open collaboration panel"
      >
        <Users className="w-5 h-5" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={cn(
        "fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40",
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Collaboration
          </h2>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'share', label: 'Share', icon: Share2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'users' && (
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active Users ({activeUsers.length})
              </h3>
              
              <div className="space-y-2">
                {activeUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="relative">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <UserCircle className="w-8 h-8 text-gray-400" />
                      )}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900",
                        getStatusColor(user.status)
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {user.name}
                        </p>
                        {user.isAgent && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                            AI
                          </span>
                        )}
                      </div>
                      
                      {user.currentFile && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          <Eye className="w-3 h-3 inline mr-1" />
                          {user.currentFile.split('/').pop()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator - only show if generating and no agent message exists yet */}
                {isGenerating && !currentConversation?.messages?.some(m => m.role === 'agent' && m.metadata?.streaming) && (
                  <div className="flex space-x-2">
                    <div className="flex-shrink-0">
                      <UserCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {getSelectedAgentName()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(new Date())}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(!currentConversation?.messages || currentConversation.messages.length === 0) && (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start a conversation!
                  </div>
                )}
                {currentConversation?.messages?.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isAgent = msg.role === 'agent';
                  
                  // Debug: log what we're rendering
                  if (isAgent && msg.metadata?.streaming) {
                    console.log('🎨 Rendering agent message:', msg.id, 'content length:', msg.content.length, 'first 50 chars:', msg.content.substring(0, 50));
                  }
                  
                  return (
                    <div
                      key={msg.id}
                      className="flex space-x-2"
                    >
                      <div className="flex-shrink-0">
                        <UserCircle className={cn(
                          "w-6 h-6",
                          isAgent ? "text-blue-500" : "text-gray-400"
                        )} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-xs font-medium",
                            isAgent ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                          )}>
                            {isUser ? 'You' : getSelectedAgentName()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTime(new Date(msg.timestamp))}
                          </span>
                        </div>
                        <p 
                          className="text-sm text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap"
                          data-message-length={msg.content.length}
                        >
                          {msg.content || (msg.metadata?.streaming ? '🤖 Thinking...' : '')}
                        </p>
                        
                        {/* Streaming indicator */}
                        {msg.metadata?.streaming && msg.content && (
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-1">
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              </div>
                              <span className="text-xs text-gray-500">Streaming...</span>
                            </div>
                            {generatingMessageId === msg.id && (
                              <button 
                                onClick={stopGeneration} 
                                className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                              >
                                Stop
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing indicator - only show if generating and no agent message exists yet */}
                {isGenerating && !currentConversation?.messages?.some(m => m.role === 'agent' && m.metadata?.streaming) && (
                  <div className="flex space-x-2">
                    <div className="flex-shrink-0">
                      <UserCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {getSelectedAgentName()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(new Date())}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Agent Selection */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select AI Agent
                  </label>
                  <select
                    value={selectedAgent?.id || ''}
                    onChange={(e) => {
                      const agent = availableAgents.find(a => a.id === e.target.value) || null;
                      setSelectedAgent(agent);
                      // Clear current conversation when agent changes
                      setCurrentConversation(null);
                    }}
                    disabled={isLoadingAgents || availableAgents.length === 0}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  >
                    {isLoadingAgents ? (
                      <option value="">Loading agents...</option>
                    ) : availableAgents.length === 0 ? (
                      <option value="">No agents available</option>
                    ) : (
                      <>
                        <option value="">Choose an agent...</option>
                        {availableAgents.map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.configuration.model})
                          </option>
                        ))}
                
                {/* Typing indicator - only show if generating and no agent message exists yet */}
                {isGenerating && !currentConversation?.messages?.some(m => m.role === 'agent' && m.metadata?.streaming) && (
                  <div className="flex space-x-2">
                    <div className="flex-shrink-0">
                      <UserCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {getSelectedAgentName()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(new Date())}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Message Input */}
              <div className="px-4 pb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedAgent ? `Chat with ${getSelectedAgentName()}...` : "Select an agent first..."}
                    disabled={!selectedAgent}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  />
                  {isGenerating ? (
                    <button
                      onClick={stopGeneration}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                    >
                      <Square className="w-4 h-4" />
                      <span className="text-xs">Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || !selectedAgent || isLoading}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'share' && (
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Share Workspace
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Workspace URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={window.location.href}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(window.location.href)}
                      className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    VS Code URL (Authenticated)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={process.env.NEXT_PUBLIC_VSCODE_PROXY_URL || 'http://localhost:8081'}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(process.env.NEXT_PUBLIC_VSCODE_PROXY_URL || 'http://localhost:8081')}
                      className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Share these URLs with team members to collaborate on the workspace.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CollaborationPanel;