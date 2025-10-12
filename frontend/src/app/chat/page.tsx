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
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

interface ChatPageProps {}

export default function ChatPage({}: ChatPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, checkAuth, logout, user } = useAuthStore();

  // Local state
  const [agents, setAgents] = useState<CodingAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<CodingAgent | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Response time tracking
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);

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

  // Live timer update
  useEffect(() => {
    if (!isTimerRunning) return;
    
    const interval = setInterval(() => {
      // Force re-render to update timer display
      setResponseStartTime(prev => prev);
    }, 100); // Update every 100ms
    
    return () => clearInterval(interval);
  }, [isTimerRunning]);

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
        messages: sortedMessages,
        _forceUpdate: Date.now() // Force React to detect change
      };
      console.log('📝 Updated conversation with', sortedMessages.length, 'messages');
      
      // Stop timer when response is complete
      if (!data.streaming && responseStartTime) {
        const elapsed = Date.now() - responseStartTime;
        setResponseTime(elapsed);
        setIsTimerRunning(false);
        setResponseStartTime(null);
        console.log(`⏱️ Response completed in ${(elapsed / 1000).toFixed(2)}s`);
      }
      
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
        messages: mergedMessages,
        _forceUpdate: Date.now() // Force React to detect change
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
      return { ...prev, messages: sortedMessages, _forceUpdate: Date.now() };
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

      return { ...prev, messages: sortMessagesByTimestamp(updatedMessages), _forceUpdate: Date.now() };
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
      console.log('Fetching agents with availability...');
      setAgentsLoading(true);
      const response = await fetchWithAuth('/api/agents?includeAvailability=true');
      const data = await response.json();
      console.log('Agents response:', data);
      
      if (data.success) {
        // Filter out agents with unavailable models
        const availableAgents = data.data.filter((agent: any) => 
          agent.modelAvailable !== false
        );
        
        console.log('Setting available agents:', availableAgents);
        setAgents(availableAgents);
        setSelectedAgent((prev) => prev ?? (availableAgents.length > 0 ? availableAgents[0] : null));
        
        // Show warning if some agents were filtered out
        const unavailableCount = data.data.length - availableAgents.length;
        if (unavailableCount > 0) {
          console.warn(`${unavailableCount} agent(s) hidden due to unavailable models`);
        }
        
        setError(null);
      } else {
        console.error('Failed to fetch agents response:', data);
        setError(data.error || 'Failed to load agents');
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('Failed to load agents');
    } finally {
      setAgentsLoading(false);
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

      const response = await fetchWithAuth(`/api/conversations/agent/${agentId}`);
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
      const response = await fetchWithAuth('/api/conversations', {
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
  const updatedConversation = { ...currentConversation, messages: sortMessagesByTimestamp(cloned), _forceUpdate: Date.now() };
  setCurrentConversation(updatedConversation);
}

      const messagesResponse = await fetchWithAuth(`/api/conversations/${currentConversation.id}/messages`);
      const messagesData = await messagesResponse.json();

      if (messagesData.success) {
        const sortedMessages = sortMessagesByTimestamp(messagesData.data);
        const updatedConversation = { ...currentConversation, messages: sortedMessages, _forceUpdate: Date.now() };
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
    
    // Start response timer
    const startTime = Date.now();
    setResponseStartTime(startTime);
    setIsTimerRunning(true);
    setResponseTime(null);

    try {
      const response = await fetchWithAuth(`/api/conversations/${currentConversation.id}/messages`, {
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
          timestamp: new Date(),
          conversationId: currentConversation.id,
          metadata: {},
        };

        // Add user message immediately
        setCurrentConversation((prev) => {
          if (!prev) return prev;
          const existingMessages = prev.messages || [];
          const mergedMessages = mergeMessages(existingMessages, [userMessage]);
          return { ...prev, messages: mergedMessages, _forceUpdate: Date.now() };
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

      const response = await fetchWithAuth(`/api/conversations/${currentConversation?.id}/messages/${generatingMessageId}/stop`, {
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

        const response = await fetchWithAuth(`/api/conversations/${currentConversationId}/messages`);
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

  // Fetch agents only after authentication is confirmed
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchAgents();
    }
  }, [isAuthenticated, authLoading, fetchAgents]);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative" data-gradient-bg>
      {/* Animated liquid blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-48 -left-48 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transition-all duration-1000"
          style={{ animation: 'slowFloat 25s ease-in-out infinite' }}
          data-blob="1"
        ></div>
        <div 
          className="absolute top-1/4 -right-48 w-[450px] h-[450px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          style={{ animation: 'slowFloat 30s ease-in-out infinite', animationDelay: '5s' }}
          data-blob="2"
        ></div>
        <div 
          className="absolute -bottom-32 left-1/4 w-[480px] h-[480px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-35 transition-all duration-1000"
          style={{ animation: 'slowFloat 28s ease-in-out infinite', animationDelay: '10s' }}
          data-blob="3"
        ></div>
        <div 
          className="absolute top-1/2 left-1/2 w-[420px] h-[420px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-25"
          style={{ animation: 'slowFloat 32s ease-in-out infinite', animationDelay: '15s' }}
          data-blob="4"
        ></div>
      </div>

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      ></div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        @keyframes slowFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
          backdrop-filter: blur(60px) saturate(200%) brightness(110%);
          -webkit-backdrop-filter: blur(60px) saturate(200%) brightness(110%);
          box-shadow: 
            0 8px 32px 0 rgba(31, 38, 135, 0.15),
            inset 0 1px 2px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05);
        }
        
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1.5rem;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .glass-input {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
          backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          -webkit-backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          box-shadow: 
            0 2px 12px 0 rgba(31, 38, 135, 0.1),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.03);
        }

        .glass-input:focus-within {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
          backdrop-filter: blur(40px) saturate(180%) brightness(110%);
          -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(110%);
          box-shadow: 
            0 4px 16px 0 rgba(99, 102, 241, 0.2),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.3);
        }

        .glass-button {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
          backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          -webkit-backdrop-filter: blur(30px) saturate(180%) brightness(105%);
        }

        .glass-button:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.12));
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .thinking-dots span {
          animation: pulse 1.4s infinite;
        }
        .thinking-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .thinking-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>

      <div className="w-full max-w-7xl h-[92vh] flex gap-3 relative z-10">
        {/* Conversations Sidebar */}
        <div className="w-72 glass-card rounded-3xl border border-white border-opacity-20 p-4 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay'
          }}></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-md relative">
                  <Bot className="w-5 h-5 text-gray-700" />
                  <div className="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{selectedAgent?.name || 'Select Agent'}</h2>
                  <p className="text-xs text-gray-700">{selectedAgent?.configuration?.model || 'AI Assistant'}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <AgentCreator onAgentCreated={fetchAgents} />
                  <button
                    onClick={() => {
                      if (selectedAgent) {
                        router.push(`/agents/${selectedAgent.id}/settings`);
                      } else {
                        alert('Please select an agent first');
                      }
                    }}
                    disabled={!selectedAgent}
                    className="p-2 rounded-xl glass-button border border-white border-opacity-50 hover:border-opacity-70 transition-all disabled:opacity-50"
                    title={selectedAgent ? 'Agent Settings' : 'Select an agent to view settings'}
                  >
                    <Settings className="w-4 h-4 text-gray-800" />
                  </button>
                </div>
              </div>

              <select
                value={selectedAgent?.id || ''}
                onChange={(e) => {
                  const agent = agents.find((a) => a.id === e.target.value) || null;
                  setSelectedAgent(agent);
                }}
                disabled={agentsLoading}
                className="w-full glass-input border border-white border-opacity-50 rounded-xl px-4 py-3 text-gray-900 outline-none font-medium mb-3"
              >
                <option value="">
                  {agentsLoading ? 'Loading agents...' : agents.length === 0 ? 'No agents available' : 'Select an agent...'}
                </option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.configuration?.model || 'No model'})
                  </option>
                ))}
              </select>

              <button
                onClick={createNewConversation}
                disabled={!selectedAgent || isLoading}
                className="w-full py-2.5 rounded-xl glass-button border border-white border-opacity-50 hover:border-opacity-70 transition-all flex items-center justify-center gap-2 text-gray-800 font-medium text-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>

              {error && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="mb-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Conversations</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group p-3 rounded-xl transition-all border cursor-pointer ${
                    currentConversation?.id === conversation.id
                      ? 'glass-input border-white border-opacity-70 ring-2 ring-white ring-opacity-30'
                      : 'glass-button border-white border-opacity-30 hover:border-opacity-50'
                  }`}
                  onClick={() => {
                    if (currentConversation?.id !== conversation.id) {
                      setCurrentConversation({ ...conversation, messages: [] });
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium text-sm mb-1 truncate">
                        {conversation.title}
                      </div>
                      <div className="text-gray-700 text-xs">
                        {conversation.messages?.length ?? 0} messages
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        {formatTimestamp((conversation as any).updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* User Info and Logout */}
            <div className="mt-4 pt-4 border-t border-white border-opacity-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.username || 'User'}</p>
                    <p className="text-xs text-gray-700 truncate">{user?.email || 'user@example.com'}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 glass-card rounded-3xl border border-white border-opacity-20 flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay'
          }}></div>

          {currentConversation ? (
            <div className="relative z-10 flex flex-col h-full">
              {/* Chat Header */}
              <div className="p-4 border-b border-white border-opacity-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-md mr-3">
                      <Bot className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-gray-900">{selectedAgent?.name}</h1>
                      <p className="text-sm text-gray-700">
                        {selectedAgent?.configuration?.model || 'No model'} • {selectedAgent?.status}
                      </p>
                    </div>
                  </div>

                  {/* WebSocket Connection Status */}
                  <div className="flex items-center space-x-2">
                    {wsConnected ? (
                      <div className="flex items-center text-green-600 glass-button px-3 py-1.5 rounded-lg border border-white border-opacity-50" title="Real-time connection active">
                        <Wifi className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">Live</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-orange-500 glass-button px-3 py-1.5 rounded-lg border border-white border-opacity-50" title="Using polling fallback">
                        <WifiOff className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">Polling</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {!currentConversation.messages || currentConversation.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg mx-auto mb-4">
                        <Bot className="w-8 h-8 text-gray-700" />
                      </div>
                      <p className="text-gray-700 font-medium">
                        {currentConversation.messages === undefined ? 'Loading messages...' : 'No messages yet. Start a conversation!'}
                      </p>
                    </div>
                  </div>
                ) : (
                  currentConversation.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${isUserRole(msg.role) ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        isUserRole(msg.role) 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                          : 'glass-input border border-white border-opacity-50 text-gray-900'
                      }`}>
                        <div className="flex items-center mb-2">
                          {isUserRole(msg.role) ? (
                            <div className="w-5 h-5 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-2">
                              <User className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center mr-2">
                              <Bot className="w-3 h-3 text-gray-700" />
                            </div>
                          )}
                          <span className="text-xs font-medium opacity-75 mr-2">{msg.role}</span>
                          <span className="text-xs opacity-75">{formatTimestamp(msg.timestamp as any)}</span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm">{msg.content || (msg.metadata?.streaming ? 'Thinking...' : '')}</div>

                        {msg.metadata?.streaming && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white border-opacity-20">
                            <div className="flex items-center">
                              <div className="thinking-dots flex space-x-1 mr-2">
                                <span className="w-1.5 h-1.5 bg-current rounded-full opacity-75"></span>
                                <span className="w-1.5 h-1.5 bg-current rounded-full opacity-75"></span>
                                <span className="w-1.5 h-1.5 bg-current rounded-full opacity-75"></span>
                              </div>
                              <span className="text-xs opacity-75">Streaming...</span>
                            </div>
                            {generatingMessageId === msg.id && (
                              <button onClick={stopGeneration} className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                Stop
                              </button>
                            )}
                          </div>
                        )}

                        {msg.metadata && !msg.metadata.streaming && (
                          <div className="text-xs opacity-75 mt-2 pt-2 border-t border-white border-opacity-20">
                            {msg.metadata.responseTime && `⏱️ ${msg.metadata.responseTime}ms`}
                            {msg.metadata.executionTime && ` • 🔧 ${msg.metadata.executionTime}ms`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {(isLoading || (isGenerating && !currentConversation.messages?.some((msg) => msg.id === generatingMessageId))) && (
                  <div className="flex justify-start">
                    <div className="glass-input border border-white border-opacity-50 text-gray-900 max-w-xs lg:max-w-md px-4 py-3 rounded-2xl">
                      <div className="flex items-center">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center mr-2">
                          <Bot className="w-3 h-3 text-gray-700" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="thinking-dots flex space-x-1">
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                          </div>
                          <span className="text-sm text-gray-700">{isLoading ? 'Sending message...' : 'AI is thinking...'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Response Timer */}
              {(isTimerRunning || responseTime) && (
                <div className="px-4 py-2 glass-button border-t border-white border-opacity-30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">
                      {isTimerRunning ? '⏱️ Generating response...' : '✅ Response completed'}
                    </span>
                    <span className="font-mono text-gray-900 font-medium">
                      {isTimerRunning 
                        ? `${((Date.now() - (responseStartTime || 0)) / 1000).toFixed(1)}s`
                        : `${(responseTime! / 1000).toFixed(2)}s`
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-2 mx-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="flex-1 text-sm">{error}</span>
                    <div className="flex items-center space-x-2 ml-2">
                      {error.includes('Failed to send message') && (
                        <button onClick={retryLastMessage} className="text-xs px-3 py-1 bg-red-200 text-red-700 rounded-lg hover:bg-red-300 transition-colors font-medium">Retry</button>
                      )}
                      <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">×</button>
                    </div>
                  </div>
                </div>
              )}

              {/* WebSocket Connection Issues */}
              {!wsConnected && (
                <div className="bg-orange-100 border border-orange-300 text-orange-800 px-4 py-2 mx-4 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span className="text-sm">Real-time connection lost. Using polling fallback for updates.</span>
                  </div>
                </div>
              )}

              {/* Generation Status */}
              {isGenerating && (
                <div className="glass-button border-t border-white border-opacity-30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="thinking-dots flex space-x-1">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                        <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                        <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                      </div>
                      <span className="text-sm text-gray-900 font-medium">AI is generating response...</span>
                    </div>
                    <button onClick={stopGeneration} className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-lg hover:from-red-600 hover:to-red-700 transition-all flex items-center space-x-1 shadow-md">
                      <Square className="w-3 h-3" />
                      <span>Stop</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t border-white border-opacity-30">
                <div className="flex space-x-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGenerating ? 'Please wait for the current response to complete...' : 'Type your message...'}
                    className="flex-1 glass-input border border-white border-opacity-50 rounded-xl p-3 text-gray-900 outline-none resize-none placeholder-gray-500"
                    rows={1}
                    disabled={isLoading || isGenerating}
                  />
                  {isGenerating ? (
                    <button onClick={stopGeneration} className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all flex items-center space-x-2 shadow-md">
                      <Square className="w-4 h-4" />
                      <span className="hidden sm:inline">Stop</span>
                    </button>
                  ) : (
                    <button onClick={sendMessage} disabled={!message.trim() || isLoading} className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md">
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Connection Status */}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
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
            </div>
          ) : (
            /* No Conversation Selected */
            <div className="relative z-10 flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg mx-auto mb-4">
                  <Bot className="w-10 h-10 text-gray-700" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to AgentDB9 Chat</h2>
                <p className="text-gray-700 mb-4">
                  {selectedAgent ? 'Select a conversation or create a new one to start chatting' : 'Select an agent to begin'}
                </p>
                {selectedAgent && (
                  <button onClick={createNewConversation} disabled={isLoading} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md font-medium">
                    Start New Conversation
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gradient Color Picker Dev Tool */}
      {process.env.NODE_ENV === 'development' && !showGradientPicker && (
        <button
          onClick={() => setShowGradientPicker(true)}
          className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          🎨 Gradient Picker
        </button>
      )}

      {showGradientPicker && (
        <GradientColorPicker onClose={() => setShowGradientPicker(false)} />
      )}
    </div>
  );
}