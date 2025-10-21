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
  Square,
  Bot,
  User
} from 'lucide-react';
import { cn } from '@/utils/cn';
import wsManager from '@/lib/websocket';
import { useAuthStore } from '@/stores/authStore';
import { CodingAgent, AgentConversation, ConversationMessage } from '@agentdb9/shared';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import MessageFeedback, { FeedbackType } from './MessageFeedback';
import ApprovalDialog from './ApprovalDialogSimple';
import TaskProgressBar from './TaskProgressBarSimple';
import ChainOfThoughtDisplay from './ChainOfThoughtDisplay';

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
  projectId?: string | null;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  className = '',
  isOpen,
  onToggle,
  projectId
}) => {
  const { isAuthenticated, token } = useAuthStore();
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'share'>('chat'); // Default to chat
  const [selectedAgent, setSelectedAgent] = useState<CodingAgent | null>(null);
  const [availableAgents, setAvailableAgents] = useState<CodingAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  
  // Conversation-based chat state - messages stored IN conversation like chat page
  const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  
  // Response time tracking
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // WebSocket integration
  const { isConnected: wsConnected, emit: wsEmit, on: wsOn, off: wsOff } = useWebSocket();
  
  // Approval workflow hook
  const {
    pendingApproval,
    taskProgress,
    currentTaskPlan,
    approveRequest,
    rejectRequest,
    isConnected: approvalConnected,
  } = useApprovalWorkflow(currentConversation?.id);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to sort messages by timestamp
  const sortMessagesByTimestamp = useCallback((messages: ConversationMessage[]) => {
    return [...messages].sort((a, b) => {
      const timestampA = new Date(a.timestamp as any).getTime();
      const timestampB = new Date(b.timestamp as any).getTime();
      return timestampA - timestampB;
    });
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  // Live timer update
  useEffect(() => {
    if (!isTimerRunning) return;
    
    const interval = setInterval(() => {
      // Force re-render to update timer display
      setResponseStartTime(prev => prev);
    }, 100); // Update every 100ms
    
    return () => clearInterval(interval);
  }, [isTimerRunning]);

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
      console.log('🔄 Received message update:', {
        messageId: data.messageId,
        streaming: data.streaming,
        contentLength: data.content?.length || 0,
        contentPreview: data.content?.substring(0, 100) || '(empty)',
        metadata: data.metadata
      });
      
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
          console.log('📋 Existing message IDs:', existingMessages.map(m => m.id));
          console.log('🔍 Looking for message ID:', data.messageId);
          
          // Check if message exists
          const messageExists = existingMessages.some(m => m.id === data.messageId);
          
          let updatedMessages: ConversationMessage[];
          if (!messageExists) {
            // Create new message if it doesn't exist
            console.log('⚠️ Message not found, creating new message');
            const newMessage: ConversationMessage = {
              id: data.messageId,
              conversationId: data.conversationId,
              role: 'agent',
              content: data.content || '',
              metadata: { ...data.metadata, streaming: data.streaming },
              timestamp: new Date(),
              _lastUpdated: Date.now(),
            };
            updatedMessages = [...existingMessages, newMessage];
          } else {
            // Update existing message
            updatedMessages = existingMessages.map((msg) =>
              msg.id === data.messageId
                ? {
                    ...msg,
                    content: data.content && data.content.length > 0 ? data.content : msg.content,
                    metadata: { ...msg.metadata, ...data.metadata, streaming: data.streaming },
                    _lastUpdated: Date.now(),
                  }
                : { ...msg } // Clone all messages
            );
          }

          const sortedMessages = sortMessagesByTimestamp(updatedMessages);
          const newConversation = { 
            ...prev, 
            messages: sortedMessages,
            _forceUpdate: Date.now() // Force React to detect change
          };
          
          // Log the updated message details
          const updatedMsg = sortedMessages.find(m => m.id === data.messageId);
          console.log('📝 Updated conversation with', sortedMessages.length, 'messages');
          console.log('📝 Updated message content:', {
            id: updatedMsg?.id,
            contentLength: updatedMsg?.content?.length || 0,
            contentPreview: updatedMsg?.content?.substring(0, 100) || '(empty)',
            streaming: updatedMsg?.metadata?.streaming
          });
          
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
    }, [sortMessagesByTimestamp]);

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
            const updatedMessages = existingMessages.map((m) =>
              m.id === data.message.id ? { ...data.message, _lastUpdated: Date.now() } : { ...m }
            );
            return {
              ...prev,
              messages: sortMessagesByTimestamp(updatedMessages),
              _forceUpdate: Date.now(),
            };
          }

          console.log('✅ Adding new message to conversation');
          const newMessages = [...existingMessages, { ...data.message, _lastUpdated: Date.now() }];
          return {
            ...prev,
            messages: sortMessagesByTimestamp(newMessages),
            _forceUpdate: Date.now(),
          };
        });
      });
    }, [sortMessagesByTimestamp]);

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
          const sortedMessages = sortMessagesByTimestamp(data.data);
          setCurrentConversation(prev => prev ? { ...prev, messages: sortedMessages, _forceUpdate: Date.now() } : null);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    // Only load if messages are not already present
    if (!currentConversation.messages || currentConversation.messages.length === 0) {
      loadMessages();
    }
  }, [currentConversation?.id, sortMessagesByTimestamp]);

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
    
    // Start response timer
    const startTime = Date.now();
    setResponseStartTime(startTime);
    setIsTimerRunning(true);
    setResponseTime(null);

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
      
      // Stop timer on error
      setIsTimerRunning(false);
      setResponseStartTime(null);
      
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
        const sortedMessages = sortMessagesByTimestamp(data.data);
        setCurrentConversation(prev => prev ? { ...prev, messages: sortedMessages, _forceUpdate: Date.now() } : null);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Failed to fetch conversation messages:', error);
      setIsGenerating(false);
    }
  };

  // Handle feedback changes
  const handleFeedbackChange = useCallback(async (messageId: string, feedback: FeedbackType) => {
    if (!currentConversation?.id) return;

    try {
      const response = await fetchWithAuth(
        `/api/conversations/${currentConversation.id}/messages/${messageId}/feedback`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedback }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update feedback');
      }

      const data = await response.json();
      if (data.success) {
        // Update local message with feedback
        setCurrentConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg =>
              msg.id === messageId
                ? { ...msg, metadata: { ...msg.metadata, feedback } }
                : msg
            ),
          };
        });
      }
    } catch (error) {
      console.error('Failed to update feedback:', error);
      throw error;
    }
  }, [currentConversation?.id]);

  // Create or get conversation for workspace chat
  const getOrCreateConversation = async () => {
    if (!selectedAgent) return null;

    try {
      // Check if we already have a conversation for this agent
      if (currentConversation && currentConversation.agentId === selectedAgent.id) {
        return currentConversation;
      }

      // Create a new conversation for workspace chat with projectId
      const response = await fetchWithAuth('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId: selectedAgent.id, 
          title: `Workspace Chat with ${selectedAgent.name}`,
          projectId: projectId || undefined // Use actual project ID if available
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
    <>
      {/* Glassmorphism styles */}
      <style>{`
        .glass-card-collab {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
          backdrop-filter: blur(60px) saturate(200%) brightness(110%);
          -webkit-backdrop-filter: blur(60px) saturate(200%) brightness(110%);
          box-shadow: 
            0 8px 32px 0 rgba(31, 38, 135, 0.15),
            inset 0 1px 2px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05);
        }
        
        .glass-input-collab {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
          backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          -webkit-backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          box-shadow: 
            0 2px 12px 0 rgba(31, 38, 135, 0.1),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.03);
        }

        .glass-input-collab:focus-within {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
          backdrop-filter: blur(40px) saturate(180%) brightness(110%);
          -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(110%);
          box-shadow: 
            0 4px 16px 0 rgba(99, 102, 241, 0.2),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.3);
        }

        .glass-button-collab {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
          backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          -webkit-backdrop-filter: blur(30px) saturate(180%) brightness(105%);
        }

        .glass-button-collab:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.12));
        }

        .thinking-dots span {
          animation: thinking 1.4s ease-in-out infinite;
        }
        .thinking-dots span:nth-child(1) {
          animation-delay: 0s;
        }
        .thinking-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .thinking-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes thinking {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.75;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed top-0 right-0 h-full w-96 glass-card-collab border-l border-white border-opacity-20 shadow-[-8px_0_32px_rgba(31,38,135,0.15)] z-40",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white border-opacity-30">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-md mr-3">
                <Bot className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedAgent?.name || 'Workspace Chat'}
                </h2>
                <p className="text-xs text-gray-700">
                  {selectedAgent?.configuration?.model || 'Select an agent'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded glass-button-collab border border-white border-opacity-50 hover:border-opacity-70 transition-all"
            >
              <X className="w-5 h-5 text-gray-800" />
            </button>
          </div>

        {/* Content - Chat Only */}
        <div className="flex-1 overflow-hidden">
          {(
            <div className="flex flex-col h-full">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {(!currentConversation?.messages || currentConversation.messages.length === 0) && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg mx-auto mb-4">
                        <Bot className="w-8 h-8 text-gray-700" />
                      </div>
                      <p className="text-gray-700 font-medium">
                        No messages yet. Start a conversation!
                      </p>
                    </div>
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
                      key={`${msg.id}-${msg._lastUpdated || 0}`}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                        isUser 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                          : 'glass-input-collab border border-white border-opacity-50 text-gray-900'
                      }`}>
                        <div className="flex items-center mb-2">
                          {isUser ? (
                            <div className="w-5 h-5 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-2">
                              <User className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center mr-2">
                              <Bot className="w-3 h-3 text-gray-700" />
                            </div>
                          )}
                          <span className="text-xs font-medium opacity-75 mr-2">{isUser ? 'You' : getSelectedAgentName()}</span>
                          <span className="text-xs opacity-75">{formatTime(new Date(msg.timestamp))}</span>
                        </div>
                        <div 
                          className="whitespace-pre-wrap text-sm"
                          key={`content-${msg.id}-${msg._lastUpdated || 0}`}
                        >
                          {msg.content || (msg.metadata?.streaming ? 'Thinking...' : '')}
                        </div>
                        
                        {/* Streaming indicator */}
                        {msg.metadata?.streaming && msg.content && (
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
                              <button 
                                onClick={stopGeneration} 
                                className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Stop
                              </button>
                            )}
                          </div>
                        )}

                        {/* Chain of Thought Display for ReAct steps */}
                        {isAgent && !msg.metadata?.streaming && msg.metadata?.steps && (
                          <ChainOfThoughtDisplay
                            steps={msg.metadata.steps}
                            toolsUsed={msg.metadata.toolsUsed}
                          />
                        )}

                        {/* Feedback component for agent messages */}
                        {isAgent && !msg.metadata?.streaming && (
                          <MessageFeedback
                            messageId={msg.id}
                            initialFeedback={msg.metadata?.feedback as FeedbackType}
                            onFeedbackChange={handleFeedbackChange}
                            disabled={isLoading || isGenerating}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing indicator - only show if generating and no agent message exists yet */}
                {(isLoading || (isGenerating && !currentConversation?.messages?.some(m => m.role === 'agent' && m.metadata?.streaming))) && (
                  <div className="flex justify-start">
                    <div className="glass-input-collab border border-white border-opacity-50 text-gray-900 max-w-[85%] px-4 py-3 rounded-2xl">
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
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Response Timer */}
              {(isTimerRunning || responseTime) && (
                <div className="px-4 py-2 glass-button-collab border-t border-white border-opacity-30">
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

              {/* Agent Selection */}
              <div className="p-4 border-t border-white border-opacity-20">
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-900 mb-1">
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
                    className="w-full px-3 py-2 text-sm glass-input-collab border border-white border-opacity-50 rounded-xl text-gray-900 outline-none font-medium disabled:opacity-50"
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
                            {agent.name} ({agent.configuration?.model || 'No model'})
                          </option>
                        ))}
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
                    className="flex-1 px-3 py-2 glass-input-collab border border-white border-opacity-50 rounded-xl text-gray-900 outline-none disabled:opacity-50"
                  />
                  {isGenerating ? (
                    <button
                      onClick={stopGeneration}
                      className="px-3 py-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all flex items-center space-x-1 shadow-md"
                    >
                      <Square className="w-4 h-4" />
                      <span className="text-xs">Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || !selectedAgent || isLoading}
                      className="px-3 py-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
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
        </div>
        </div>
      </motion.div>

      {/* Approval Dialog */}
      {pendingApproval && (
        <ApprovalDialog
          request={pendingApproval}
          onApprove={approveRequest}
          onReject={rejectRequest}
        />
      )}

      {/* Task Progress Bar */}
      {taskProgress && currentTaskPlan && (
        <TaskProgressBar
          taskPlan={currentTaskPlan}
          currentProgress={taskProgress}
        />
      )}
    </>
  );
};

export default CollaborationPanel;