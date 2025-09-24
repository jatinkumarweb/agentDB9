'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Plus, Settings } from 'lucide-react';
import { CodingAgent, AgentConversation, ConversationMessage } from '@agentdb9/shared';
import AgentCreator from '@/components/AgentCreator';

interface ChatPageProps {}

export default function ChatPage({}: ChatPageProps) {
  const [agents, setAgents] = useState<CodingAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<CodingAgent | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Fetch conversations when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      fetchConversations(selectedAgent.id);
    }
  }, [selectedAgent]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  // Auto-refresh conversation for real-time updates
  useEffect(() => {
    if (!currentConversation) return;

    const interval = setInterval(() => {
      refreshConversation();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [currentConversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
        if (data.data.length > 0 && !selectedAgent) {
          setSelectedAgent(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setError('Failed to load agents');
    }
  };

  const fetchConversations = async (agentId: string) => {
    try {
      const response = await fetch(`/api/conversations/agent/${agentId}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const createNewConversation = async () => {
    if (!selectedAgent) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          title: 'New Conversation',
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newConversation = data.data;
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        setError(null);
      } else {
        setError(data.error || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentConversation || isLoading) return;

    const messageContent = message.trim();
    setMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Send user message
      const response = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh conversation to get updated messages including agent response
        await refreshConversation();
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConversation = async () => {
    if (!currentConversation) return;

    try {
      const response = await fetch(`/api/conversations/${currentConversation.id}`);
      const data = await response.json();
      if (data.success) {
        setCurrentConversation(data.data);
        // Update in conversations list
        setConversations(prev => 
          prev.map(conv => conv.id === data.data.id ? data.data : conv)
        );
      }
    } catch (error) {
      console.error('Failed to refresh conversation:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Agent Selection */}
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
              const agent = agents.find(a => a.id === e.target.value);
              setSelectedAgent(agent || null);
              setCurrentConversation(null);
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
                  onClick={() => setCurrentConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversation?.id === conversation.id
                      ? 'bg-blue-100 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {conversation.messages.length} messages
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(conversation.updatedAt.toString())}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center">
                <Bot className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {selectedAgent?.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {selectedAgent?.configuration.model} • {selectedAgent?.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 mr-2" />
                      ) : (
                        <Bot className="w-4 h-4 mr-2" />
                      )}
                      <span className="text-xs opacity-75">
                        {formatTimestamp(msg.timestamp.toString())}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.metadata && (
                      <div className="text-xs opacity-75 mt-2">
                        Execution time: {msg.metadata.executionTime}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="flex items-center">
                      <Bot className="w-4 h-4 mr-2" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 mx-4">
                {error}
              </div>
            )}

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Welcome to AgentDB9 Chat
              </h2>
              <p className="text-gray-500 mb-4">
                {selectedAgent 
                  ? 'Select a conversation or create a new one to start chatting'
                  : 'Select an agent to begin'
                }
              </p>
              {selectedAgent && (
                <button
                  onClick={createNewConversation}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
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