'use client';

import { useState, useCallback, useRef } from 'react';
import { AgentConversation, ConversationMessage } from '@agentdb9/shared';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface ConversationCacheOptions {
  conversationTTL?: number;
  messageTTL?: number;
  maxCacheSize?: number;
}

export function useConversationCache(options: ConversationCacheOptions = {}) {
  const {
    conversationTTL = 300000, // 5 minutes
    messageTTL = 60000, // 1 minute
    maxCacheSize = 50
  } = options;

  const conversationCache = useRef(new Map<string, CacheEntry<AgentConversation[]>>());
  const messageCache = useRef(new Map<string, CacheEntry<ConversationMessage[]>>());
  const [cacheStats, setCacheStats] = useState({
    conversationHits: 0,
    conversationMisses: 0,
    messageHits: 0,
    messageMisses: 0
  });

  const isExpired = useCallback((entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp > entry.ttl;
  }, []);

  const cleanupCache = useCallback((cache: Map<string, CacheEntry<any>>) => {
    const now = Date.now();
    const entries = Array.from(cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
      }
    });

    // If still over limit, remove oldest entries
    if (cache.size > maxCacheSize) {
      const sortedEntries = entries
        .filter(([key]) => cache.has(key))
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = cache.size - maxCacheSize;
      for (let i = 0; i < toRemove; i++) {
        cache.delete(sortedEntries[i][0]);
      }
    }
  }, [maxCacheSize]);

  const getConversation = useCallback((agentId: string): AgentConversation[] | null => {
    const entry = conversationCache.current.get(agentId);
    
    if (!entry || isExpired(entry)) {
      setCacheStats(prev => ({ ...prev, conversationMisses: prev.conversationMisses + 1 }));
      return null;
    }
    
    setCacheStats(prev => ({ ...prev, conversationHits: prev.conversationHits + 1 }));
    return entry.data;
  }, [isExpired]);

  const setConversation = useCallback((agentId: string, conversations: AgentConversation[]) => {
    conversationCache.current.set(agentId, {
      data: conversations,
      timestamp: Date.now(),
      ttl: conversationTTL
    });
    
    cleanupCache(conversationCache.current);
  }, [conversationTTL, cleanupCache]);

  const getMessages = useCallback((conversationId: string): ConversationMessage[] | null => {
    const entry = messageCache.current.get(conversationId);
    
    if (!entry || isExpired(entry)) {
      setCacheStats(prev => ({ ...prev, messageMisses: prev.messageMisses + 1 }));
      return null;
    }
    
    setCacheStats(prev => ({ ...prev, messageHits: prev.messageHits + 1 }));
    return entry.data;
  }, [isExpired]);

  const setMessages = useCallback((conversationId: string, messages: ConversationMessage[]) => {
    messageCache.current.set(conversationId, {
      data: messages,
      timestamp: Date.now(),
      ttl: messageTTL
    });
    
    cleanupCache(messageCache.current);
  }, [messageTTL, cleanupCache]);

  const updateMessage = useCallback((conversationId: string, messageId: string, updates: Partial<ConversationMessage>) => {
    const entry = messageCache.current.get(conversationId);
    if (!entry || isExpired(entry)) return;

    const updatedMessages = entry.data.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    );

    messageCache.current.set(conversationId, {
      ...entry,
      data: updatedMessages,
      timestamp: Date.now()
    });
  }, [isExpired]);

  const addMessage = useCallback((conversationId: string, message: ConversationMessage) => {
    const entry = messageCache.current.get(conversationId);
    if (!entry || isExpired(entry)) return;

    const updatedMessages = [...entry.data, message];
    messageCache.current.set(conversationId, {
      ...entry,
      data: updatedMessages,
      timestamp: Date.now()
    });
  }, [isExpired]);

  const invalidateConversation = useCallback((agentId: string) => {
    conversationCache.current.delete(agentId);
  }, []);

  const invalidateMessages = useCallback((conversationId: string) => {
    messageCache.current.delete(conversationId);
  }, []);

  const clearCache = useCallback(() => {
    conversationCache.current.clear();
    messageCache.current.clear();
    setCacheStats({
      conversationHits: 0,
      conversationMisses: 0,
      messageHits: 0,
      messageMisses: 0
    });
  }, []);

  const getCacheStats = useCallback(() => {
    const conversationTotal = cacheStats.conversationHits + cacheStats.conversationMisses;
    const messageTotal = cacheStats.messageHits + cacheStats.messageMisses;
    
    return {
      ...cacheStats,
      conversationHitRate: conversationTotal > 0 ? (cacheStats.conversationHits / conversationTotal) * 100 : 0,
      messageHitRate: messageTotal > 0 ? (cacheStats.messageHits / messageTotal) * 100 : 0,
      conversationCacheSize: conversationCache.current.size,
      messageCacheSize: messageCache.current.size
    };
  }, [cacheStats]);

  return {
    getConversation,
    setConversation,
    getMessages,
    setMessages,
    updateMessage,
    addMessage,
    invalidateConversation,
    invalidateMessages,
    clearCache,
    getCacheStats
  };
}