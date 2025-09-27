'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Send, Bot, User, Plus, Settings, LogOut, Wifi, WifiOff, Square } from 'lucide-react';
import { CodingAgent, AgentConversation, ConversationMessage } from '@agentdb9/shared';
import AgentCreator from '@/components/AgentCreator';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConversationCache } from '@/hooks/useConversationCache';

interface ChatPageProps {}

export default function ChatPage({}: ChatPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, checkAuth, logout, user } = useAuthStore();

  // Local state
  const [agents, setAgents] = useState<CodingAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<CodingAgent | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket and caching hooks
  const { isConnected: wsConnected, emit: wsEmit, on: wsOn, off: wsOff, error: wsError } = useWebSocket();
  const cache = useConversationCache();

  // Memoize stable functions to prevent useEffect dependency issues
  const formatTimestamp = useCallback((ts?: string | Date | number) => {
    if (!ts) return '';
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const sortMessagesByTimestamp = useCallback((messages: ConversationMessage[]) => {
    return [...messages].sort((a, b) => {
      const timestampA = new Date(a.timestamp as any).getTime();
      const timestampB = new Date(b.timestamp as any).getTime();
      return timestampA - timestampB;
    });
  }, []);

  const mergeMessages = useCallback((existingMessages: ConversationMessage[], newMessages: ConversationMessage[]) => {
    const messageMap = new Map<string, ConversationMessage>();

    existingMessages.forEach((msg) => {
      if (msg.id) messageMap.set(msg.id, msg);
    });

    newMessages.forEach((msg) => {
      const id = msg.id;
      if (!id) {
        const fallbackId = `no-id-${msg.role}-${msg.timestamp ?? Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        messageMap.set(fallbackId, { ...msg, id: fallbackId });
        return;
      }

      const existing = messageMap.get(id);
      if (existing) {
        messageMap.set(id, {
          ...existing,
          ...msg,
          metadata: { ...existing.metadata, ...msg.metadata },
        });
      } else {
        messageMap.set(id, msg);
      }
    });

    return sortMessagesByTimestamp(
  Array.from(messageMap.values()).map((msg) => ({ ...msg }))
);
  }, [sortMessagesByTimestamp]);

  const isUserRole = useCallback((role: string) => {
    const userRoles = ['user', 'human', 'person'];
    return userRoles.includes((role || '').toLowerCase());
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Use refs to avoid stale closures
  const currentConversationRef = useRef(currentConversation);
  const cacheRef = useRef(cache);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Auth check - run only once on mount
  useEffect(() => {
    checkAuth();
  }, []); // Empty dependency array

  // Redirect to login after auth check completes if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('Chat page: redirecting to login - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // WebSocket event handlers with enhanced debugging
  const handleMessageUpdate = useCallback((data: {
    conversationId: string;
    messageId: string;
    content: string;
    streaming: boolean;
    metadata?: any;
  }) => {
    console.log('🔄 Received message update:', data);

    // Update generating state immediately, outside of setCurrentConversation
    flushSync(() => {
      if (data.streaming) {
        console.log('🟡 Setting generating state to true');
        setIsGenerating(true);
        setGeneratingMessageId(data.messageId);
      } else {
        console.log('🟢 Setting generating state to false');
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
    : { ...msg }   // <-- clone here
);

      const sortedMessages = sortMessagesByTimestamp(updatedMessages);
      const newConversation = { 
        ...prev, 
        messages: sortedMessages
      };
      console.log('📝 Updated conversation with', sortedMessages.length, 'messages');
      return newConversation;
      });
    });

    try {
      cacheRef.current?.updateMessage?.(data.conversationId, data.messageId, {
        content: data.content,
        metadata: { ...data.metadata, streaming: data.streaming },
      });
    } catch (err) {
      console.error('Cache update error:', err);
    }
  }, [sortMessagesByTimestamp]);


  const handleNewMessage = useCallback((data: {
    conversationId: string;
    message: ConversationMessage;
  }) => {
    console.log('📨 Received new message:', data);

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
        console.log('❌ Conversation ID mismatch for new message:', prev.id, 'vs', data.conversationId);
        return prev;
      }

      const existingMessages = prev.messages || [];
      const mergedMessages = mergeMessages(existingMessages, [data.message]);
      console.log('✅ Added new message to conversation:', data.message.id, 'Total messages:', mergedMessages.length);

      return { 
        ...prev, 
        messages: mergedMessages
      };
      });
    });

    try {
      cacheRef.current?.addMessage?.(data.conversationId, data.message);
    } catch (err) {
      console.error('Cache add error:', err);
    }
  }, [mergeMessages]);


  const handleConversationUpdate = useCallback((data: { conversationId: string; messages: ConversationMessage[] }) => {
    console.log('Received conversation update:', data);

    setCurrentConversation((prev) => {
      if (!prev) return prev;
      if (prev.id !== data.conversationId) return prev;

      const sortedMessages = sortMessagesByTimestamp(data.messages);
      return { ...prev, messages: sortedMessages };
    });

    try {
      cacheRef.current?.setMessages?.(data.conversationId, sortMessagesByTimestamp(data.messages));
    } catch (err) {
      console.error('Cache error:', err);
    }
  }, [sortMessagesByTimestamp]);


  const handleGenerationStopped = useCallback((data: { conversationId: string; messageId: string }) => {
    console.log('Generation stopped:', data);

    setIsGenerating(false);
    setGeneratingMessageId(null);

    setCurrentConversation((prev) => {
      if (!prev) return prev;
      if (prev.id !== data.conversationId) return prev;

      const updatedMessages = (prev.messages || []).map((msg) =>
        msg.id === data.messageId ? { ...msg, metadata: { ...msg.metadata, streaming: false } } : msg
      );

      return { ...prev, messages: sortMessagesByTimestamp(updatedMessages) };
    });
  }, [sortMessagesByTimestamp]);

  // Memoize WebSocket handlers
  const wsHandlers = useMemo(() => ({
    message_update: handleMessageUpdate,
    new_message: handleNewMessage,
    conversation_update: handleConversationUpdate,
    generation_stopped: handleGenerationStopped,
  }), [handleMessageUpdate, handleNewMessage, handleConversationUpdate, handleGenerationStopped]);

  // Set up WebSocket handlers BEFORE joining rooms
  useEffect(() => {
    if (!wsConnected) return;

    console.log('Setting up WebSocket event handlers');

    Object.entries(wsHandlers).forEach(([event, handler]) => {
      wsOn(event, handler);
      console.log(`Registered handler for: ${event}`);
    });

    return () => {
      console.log('Cleaning up WebSocket event handlers');
      try {
        Object.entries(wsHandlers).forEach(([event, handler]) => {
          wsOff(event, handler);
        });
      } catch (err) {
        console.error('Error cleaning up WebSocket handlers:', err);
      }
    };
  }, [wsConnected, wsOn, wsOff, wsHandlers]);

  // Join conversation room AFTER handlers are set up
  const currentConversationId = currentConversation?.id;
  
  useEffect(() => {
    if (!wsConnected || !currentConversationId) return;

    // Small delay to ensure handlers are registered
    const timer = setTimeout(() => {
      console.log('Joining conversation room:', currentConversationId);
      wsEmit('join_conversation', { conversationId: currentConversationId });
    }, 100);

    return () => {
      clearTimeout(timer);
      console.log('Leaving conversation room:', currentConversationId);
      wsEmit('leave_conversation', { conversationId: currentConversationId });
    };
  }, [wsConnected, currentConversationId, wsEmit]);

  // Fetch agents - stable function
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
        setSelectedAgent((prev) => prev ?? (data.data.length > 0 ? data.data[0] : null));
      } else {
        console.error('Failed to fetch agents response:', data);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('Failed to load agents');
    }
  }, []);

  // Fetch conversations - use cache ref to avoid dependencies
  const fetchConversations = useCallback(async (agentId: string) => {
    try {
      const currentCache = cacheRef.current;
      const cachedConversations = currentCache?.getConversation?.(agentId);
      if (cachedConversations) {
        console.log('Using cached conversations for agent:', agentId);
        setConversations(cachedConversations);
        return;
      }

      const response = await fetch(`/api/conversations/agent/${agentId}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.data);
        currentCache?.setConversation?.(agentId, data.data);
      } else {
        console.error('Failed to fetch conversations response:', data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, []);

  const createNewConversation = useCallback(async () => {
    if (!selectedAgent) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent.id, title: 'New Conversation' }),
      });

      const data = await response.json();
      if (data.success) {
        const newConversation = data.data;
        setConversations((prev) => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        setError(null);
      } else {
        setError(data.error || 'Failed to create conversation');
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgent]);

  // Refresh conversation - use cache ref
  const refreshConversation = useCallback(async () => {
    if (!currentConversation || isRefreshing) return;

    try {
      setIsRefreshing(true);

      const currentCache = cacheRef.current;
      const cachedMessages = currentCache?.getMessages?.(currentConversation.id);
if (cachedMessages) {
  const cloned = cachedMessages.map((m) => ({ ...m }));
  const updatedConversation = { ...currentConversation, messages: sortMessagesByTimestamp(cloned) };
  setCurrentConversation(updatedConversation);
}

      const messagesResponse = await fetch(`/api/conversations/${currentConversation.id}/messages`);
      const messagesData = await messagesResponse.json();

      if (messagesData.success) {
        const sortedMessages = sortMessagesByTimestamp(messagesData.data);
        const updatedConversation = { ...currentConversation, messages: sortedMessages };
        setCurrentConversation(updatedConversation);
        currentCache?.setMessages?.(currentConversation.id, sortedMessages);
        setConversations((prev) => prev.map((c) => (c.id === currentConversation.id ? updatedConversation : c)));
      }
    } catch (err) {
      console.error('Failed to refresh conversation:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentConversation, isRefreshing, sortMessagesByTimestamp]);

  const sendMessage = useCallback(async () => {
    if (!message.trim() || !currentConversation || isLoading || isGenerating) return;

    const messageContent = message.trim();
    setMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: messageContent }),
      });

      const data = await response.json();
      if (data.success) {
        const userMessage: ConversationMessage = {
          id: data.data.id ?? `temp-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'user',
          content: messageContent,
          timestamp: new Date().toISOString(),
          conversationId: currentConversation.id,
          metadata: {},
        };

        // Add user message immediately
        setCurrentConversation((prev) => {
          if (!prev) return prev;
          const existingMessages = prev.messages || [];
          const mergedMessages = mergeMessages(existingMessages, [userMessage]);
          return { ...prev, messages: mergedMessages };
        });

        // Add fallback refresh for WebSocket issues
        if (!wsConnected) {
          console.log('WebSocket not connected, using polling fallback');
          const pollForUpdates = () => {
            setTimeout(() => refreshConversation(), 1000);
            setTimeout(() => refreshConversation(), 3000);
            setTimeout(() => refreshConversation(), 5000);
          };
          pollForUpdates();
        } else {
          console.log('WebSocket connected, waiting for real-time updates');
          // Safety net - if no WebSocket update received in 10 seconds, force refresh
          setTimeout(() => {
            console.log('Safety net: Checking if response was received via WebSocket');
            refreshConversation();
          }, 10000);
        }
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      setMessage(messageContent);
    } finally {
      setIsLoading(false);
    }
  }, [message, currentConversation, isLoading, isGenerating, mergeMessages, wsConnected, refreshConversation]);

  const retryLastMessage = useCallback(() => {
    if (!currentConversation?.messages?.length) return;
    const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
    if (lastMessage.role === 'user') {
      setMessage(lastMessage.content);
      setError(null);
    }
  }, [currentConversation]);

  const stopGeneration = useCallback(async () => {
    if (!isGenerating || !generatingMessageId) return;

    try {
      if (wsConnected) {
        wsEmit('stop_generation', { conversationId: currentConversation?.id, messageId: generatingMessageId });
      }

      const response = await fetch(`/api/conversations/${currentConversation?.id}/messages/${generatingMessageId}/stop`, {
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !isGenerating) {
        sendMessage();
      }
    }
  }, [isLoading, isGenerating, sendMessage]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [logout, router]);

  // Auto-refresh fallback when WebSocket is disconnected and generation is happening
  useEffect(() => {
    if (!wsConnected && currentConversation && (isLoading || isGenerating)) {
      const fallbackInterval = setInterval(() => {
        console.log('WebSocket disconnected, using fallback refresh');
        refreshConversation();
      }, 2000);

      return () => clearInterval(fallbackInterval);
    }
  }, [wsConnected, currentConversation, isLoading, isGenerating, refreshConversation]);

  // Load messages when conversation changes - use cache ref
  useEffect(() => {
    if (!currentConversationId) return;

    setIsGenerating(false);
    setGeneratingMessageId(null);

    const loadConversationMessages = async () => {
      try {
        const currentCache = cacheRef.current;
        const cachedMessages = currentCache?.getMessages?.(currentConversationId);
        if (cachedMessages && cachedMessages.length > 0) {
          console.log('Using cached messages for conversation:', currentConversationId);
          const sortedMessages = sortMessagesByTimestamp(cachedMessages);
          setCurrentConversation((prev) => (prev ? { ...prev, messages: sortedMessages } : null));
          return;
        }

        const response = await fetch(`/api/conversations/${currentConversationId}/messages`);
        const data = await response.json();

        if (data.success) {
          const sortedMessages = sortMessagesByTimestamp(data.data);
          setCurrentConversation((prev) => (prev ? { ...prev, messages: sortedMessages } : null));
          currentCache?.setMessages?.(currentConversationId, sortedMessages);
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
      }
    };

    loadConversationMessages();
  }, [currentConversationId, sortMessagesByTimestamp]);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Fetch conversations when agent is selected
  const selectedAgentId = selectedAgent?.id;
  useEffect(() => {
    if (selectedAgentId) {
      fetchConversations(selectedAgentId);
      setCurrentConversation(null);
    } else {
      setConversations([]);
      setCurrentConversation(null);
    }
  }, [selectedAgentId, fetchConversations]);

  // Scroll to bottom when messages change
  const messagesLength = currentConversation?.messages?.length;
  useEffect(() => {
    if (messagesLength) {
      scrollToBottom();
    }
  }, [messagesLength, scrollToBottom]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Coding Agents</h2>
            <div className="flex items-center space-x-2">
              <AgentCreator onAgentCreated={fetchAgents} />
              <Settings className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
            </div>
          </div>
          <select
            value={selectedAgent?.id || ''}
            onChange={(e) => {
              const agent = agents.find((a) => a.id === e.target.value) || null;
              setSelectedAgent(agent);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an agent...</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.configuration.model})
              </option>
            ))}
          </select>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Conversations</h3>
              <button
                onClick={createNewConversation}
                disabled={!selectedAgent || isLoading}
                className="p-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    if (currentConversation?.id !== conversation.id) {
                      setCurrentConversation({ ...conversation, messages: [] });
                    }
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversation?.id === conversation.id
                      ? 'bg-blue-100 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 truncate">{conversation.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{conversation.messages?.length ?? 0} messages</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTimestamp((conversation as any).updatedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Info and Logout */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.username || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">{selectedAgent?.name}</h1>
                    <p className="text-sm text-gray-500">
                      {selectedAgent?.configuration.model} • {selectedAgent?.status}
                    </p>
                  </div>
                </div>

                {/* WebSocket Connection Status */}
                <div className="flex items-center space-x-2">
                  {wsConnected ? (
                    <div className="flex items-center text-green-600" title="Real-time connection active">
                      <Wifi className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-orange-500" title="Using polling fallback">
                      <WifiOff className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Polling</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!currentConversation.messages || currentConversation.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {currentConversation.messages === undefined ? 'Loading messages...' : 'No messages yet. Start a conversation!'}
                    </p>
                  </div>
                </div>
              ) : (
                currentConversation.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${isUserRole(msg.role) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isUserRole(msg.role) ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                      <div className="flex items-center mb-1">
                        {isUserRole(msg.role) ? <User className="w-4 h-4 mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                        <span className="text-xs font-medium opacity-75 mr-2">{msg.role}</span>
                        <span className="text-xs opacity-75">{formatTimestamp(msg.timestamp as any)}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content || (msg.metadata?.streaming ? 'Thinking...' : '')}</div>

                      {msg.metadata?.streaming && (
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center">
                            <div className="flex space-x-1 mr-2">
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="text-xs opacity-75">Streaming...</span>
                          </div>
                          {generatingMessageId === msg.id && (
                            <button onClick={stopGeneration} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                              Stop
                            </button>
                          )}
                        </div>
                      )}

                      {msg.metadata && !msg.metadata.streaming && (
                        <div className="text-xs opacity-75 mt-2">
                          {msg.metadata.responseTime && `Response time: ${msg.metadata.responseTime}ms`}
                          {msg.metadata.executionTime && `Execution time: ${msg.metadata.executionTime}ms`}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {(isLoading || (isGenerating && !currentConversation.messages?.some((msg) => msg.id === generatingMessageId))) && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="flex items-center">
                      <Bot className="w-4 h-4 mr-2" />
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span className="text-sm text-gray-600">{isLoading ? 'Sending message...' : 'AI is thinking...'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 mx-4 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="flex-1">{error}</span>
                  <div className="flex items-center space-x-2 ml-2">
                    {error.includes('Failed to send message') && (
                      <button onClick={retryLastMessage} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">Retry</button>
                    )}
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
                  </div>
                </div>
              </div>
            )}

            {/* WebSocket Connection Issues */}
            {!wsConnected && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 mx-4 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-sm">Real-time connection lost. Using polling fallback for updates.</span>
                </div>
              </div>
            )}

            {/* Generation Status */}
            {isGenerating && (
              <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-sm text-yellow-700 font-medium">AI is generating response...</span>
                  </div>
                  <button onClick={stopGeneration} className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors flex items-center space-x-1">
                    <Square className="w-3 h-3" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isGenerating ? 'Please wait for the current response to complete...' : 'Type your message...'}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={1}
                  disabled={isLoading || isGenerating}
                />
                {isGenerating ? (
                  <button onClick={stopGeneration} className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2">
                    <Square className="w-4 h-4" />
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                ) : (
                  <button onClick={sendMessage} disabled={!message.trim() || isLoading} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Connection Status */}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  {wsConnected ? (
                    <span className="flex items-center text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                      Real-time connected
                    </span>
                  ) : (
                    <span className="flex items-center text-orange-500">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-1" />
                      Using polling fallback
                    </span>
                  )}
                </div>
                {wsError && <span className="text-red-500">WebSocket error: {wsError}</span>}
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Welcome to AgentDB9 Chat</h2>
              <p className="text-gray-500 mb-4">
                {selectedAgent ? 'Select a conversation or create a new one to start chatting' : 'Select an agent to begin'}
              </p>
              {selectedAgent && (
                <button onClick={createNewConversation} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                  Start New Conversation
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}