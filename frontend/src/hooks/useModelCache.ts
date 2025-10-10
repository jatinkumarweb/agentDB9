'use client';

import { useState, useCallback, useRef } from 'react';

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
}

interface ModelCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxRetries?: number;
  retryDelay?: number;
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

  const isExpired = useCallback((entry: ModelCacheEntry): boolean => {
    return Date.now() - entry.timestamp > entry.ttl;
  }, []);

  const fetchModels = useCallback(async (forceRefresh = false): Promise<ModelOption[]> => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cache.current && !isExpired(cache.current)) {
      console.log('Using cached models');
      return cache.current.models;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/models', {
        // Disable browser caching for fresh data
        cache: 'no-store',
        credentials: 'include', // Include cookies for authentication
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
        
        // Cache the result
        cache.current = {
          models,
          timestamp: Date.now(),
          ttl
        };

        retryCount.current = 0; // Reset retry count on success
        console.log(`Cached ${models.length} models for ${ttl}ms`);
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
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ttl, maxRetries, retryDelay, isExpired]);

  const getModels = useCallback(async (): Promise<ModelOption[]> => {
    return fetchModels(false);
  }, [fetchModels]);

  const refreshModels = useCallback(async (): Promise<ModelOption[]> => {
    return fetchModels(true);
  }, [fetchModels]);

  const getCachedModels = useCallback((): ModelOption[] | null => {
    if (cache.current && !isExpired(cache.current)) {
      return cache.current.models;
    }
    return null;
  }, [isExpired]);

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