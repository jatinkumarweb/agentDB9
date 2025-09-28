'use client';

import React, { useState, useEffect } from 'react';
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
  Dot
} from 'lucide-react';
import { cn } from '@/utils/cn';
import wsManager from '@/lib/websocket';

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
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'share'>('users');

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
      
      addSystemMessage(`${userData.name} joined the workspace`);
    });

    wsManager.on('user_left', (userId: string) => {
      setActiveUsers(prev => {
        const user = prev.find(u => u.id === userId);
        if (user) {
          addSystemMessage(`${user.name} left the workspace`);
        }
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

    wsManager.on('chat_message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
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
      setChatMessages(prev => [...prev, agentMessage]);
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
      wsManager.off('chat_message');
      wsManager.off('agent_message');
    };
  }, []);

  const addSystemMessage = (message: string) => {
    const systemMessage: ChatMessage = {
      id: 'sys_' + Date.now(),
      userId: 'system',
      userName: 'System',
      message,
      timestamp: new Date(),
      type: 'system'
    };
    setChatMessages(prev => [...prev, systemMessage]);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;

    const message: ChatMessage = {
      id: 'msg_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'user'
    };

    setChatMessages(prev => [...prev, message]);
    wsManager.emit('chat_message', message);
    setNewMessage('');
  };

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
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex space-x-2",
                      message.type === 'system' && "justify-center"
                    )}
                  >
                    {message.type !== 'system' && (
                      <div className="flex-shrink-0">
                        <UserCircle className={cn(
                          "w-6 h-6",
                          message.type === 'agent' ? "text-blue-500" : "text-gray-400"
                        )} />
                      </div>
                    )}
                    
                    <div className={cn(
                      "flex-1",
                      message.type === 'system' && "text-center"
                    )}>
                      {message.type === 'system' ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          {message.message}
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "text-xs font-medium",
                              message.type === 'agent' ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                            )}>
                              {message.userName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                            {message.message}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
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
                    VS Code URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={process.env.NEXT_PUBLIC_VSCODE_URL || 'http://localhost:8080'}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(process.env.NEXT_PUBLIC_VSCODE_URL || 'http://localhost:8080')}
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