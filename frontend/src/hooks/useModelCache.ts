'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  status: 'available' | 'disabled' | 'error' | 'unknown';
  reason?: string;
  requiresApiKey: boolean;
  apiKeyConfigured: boolean;
}

interface ModelCacheEntry {
  models: ModelOption[];
  timestamp: number;
  ttl: number;
  userId: string | null; // Track which user's data this is
}

interface ModelCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxRetries?: number;
  retryDelay?: number;
}

// Get current user ID from auth token cookie
function getCurrentUserId(): string | null {
  if (typeof document === 'undefined') return null;
  
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];
  
  if (!token) return null;
  
  try {
    // Decode JWT to get user ID (JWT format: header.payload.signature)
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id || decoded.sub || null;
  } catch (e) {
    console.warn('Failed to decode auth token:', e);
    return null;
  }
}

export function useModelCache(options: ModelCacheOptions = {}) {
  const {
    ttl = 300000, // 5 minutes default
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const cache = useRef<ModelCacheEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const currentUserId = useRef<string | null>(null);

  // Update current user ID on mount and when auth changes
  useEffect(() => {
    currentUserId.current = getCurrentUserId();
  }, []);

  const isExpired = useCallback((entry: ModelCacheEntry): boolean => {
    return Date.now() - entry.timestamp > entry.ttl;
  }, []);

  const isCacheValidForCurrentUser = useCallback((entry: ModelCacheEntry): boolean => {
    const userId = getCurrentUserId();
    // Cache is invalid if user has changed
    if (entry.userId !== userId) {
      console.log('Cache invalid: user changed from', entry.userId, 'to', userId);
      return false;
    }
    // Cache is invalid if expired
    if (isExpired(entry)) {
      console.log('Cache invalid: expired');
      return false;
    }
    return true;
  }, [isExpired]);

  const fetchModels = useCallback(async (forceRefresh = false): Promise<ModelOption[]> => {
    // Update current user ID before checking cache
    currentUserId.current = getCurrentUserId();
    
    // Return cached data if valid for current user and not forcing refresh
    if (!forceRefresh && cache.current && isCacheValidForCurrentUser(cache.current)) {
      console.log('Using cached models for user:', cache.current.userId);
      return cache.current.models;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/models', {
        // Disable browser caching for fresh data
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle double-wrapped response from backend
      const modelsData = data.data?.data?.models || data.data?.models;
      
      if (data.success && modelsData) {
        const models = modelsData;
        const userId = getCurrentUserId();
        
        // Cache the result with user context
        cache.current = {
          models,
          timestamp: Date.now(),
          ttl,
          userId
        };

        retryCount.current = 0; // Reset retry count on success
        console.log(`Cached ${models.length} models for user ${userId} (TTL: ${ttl}ms)`);
        return models;
      } else {
        throw new Error(data.error || 'Failed to fetch models');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch models:', errorMessage);
      
      // Retry logic
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`Retrying model fetch (${retryCount.current}/${maxRetries}) in ${retryDelay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount.current));
        return fetchModels(forceRefresh);
      }
      
      setError(errorMessage);
      
      // Return cached data if available, even if expired
      if (cache.current) {
        console.log('Using stale cached models due to fetch error');
        return cache.current.models;
      }
      
      // Return empty array instead of throwing to prevent page crashes
      console.warn('No cached models available, returning empty array');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [ttl, maxRetries, retryDelay, isCacheValidForCurrentUser]);

  const getModels = useCallback(async (): Promise<ModelOption[]> => {
    return fetchModels(false);
  }, [fetchModels]);

  const refreshModels = useCallback(async (): Promise<ModelOption[]> => {
    return fetchModels(true);
  }, [fetchModels]);

  const getCachedModels = useCallback((): ModelOption[] | null => {
    if (cache.current && isCacheValidForCurrentUser(cache.current)) {
      return cache.current.models;
    }
    return null;
  }, [isCacheValidForCurrentUser]);

  const invalidateCache = useCallback(() => {
    cache.current = null;
    retryCount.current = 0;
    setError(null);
  }, []);

  const getCacheInfo = useCallback(() => {
    if (!cache.current) {
      return { cached: false, age: 0, expired: true };
    }

    const age = Date.now() - cache.current.timestamp;
    const expired = isExpired(cache.current);

    return {
      cached: true,
      age,
      expired,
      modelsCount: cache.current.models.length,
      ttl: cache.current.ttl
    };
  }, [isExpired]);

  return {
    getModels,
    refreshModels,
    getCachedModels,
    invalidateCache,
    getCacheInfo,
    isLoading,
    error
  };
}