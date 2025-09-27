'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  enabled?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const connect = () => {
      try {
        const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000', {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          forceNew: true,
        });

        socket.on('connect', () => {
          console.log('✅ WebSocket connected to:', process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
          console.log('Socket ID:', socket.id);
          setIsConnected(true);
          setError(null);
          reconnectCountRef.current = 0;
        });

        socket.on('disconnect', (reason) => {
          console.log('❌ WebSocket disconnected:', reason);
          setIsConnected(false);
          
          // Auto-reconnect for certain disconnect reasons
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, don't reconnect automatically
            return;
          }
          
          if (reconnectCountRef.current < reconnectAttempts) {
            setTimeout(() => {
              reconnectCountRef.current++;
              console.log(`Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts})`);
              socket.connect();
            }, reconnectDelay * Math.pow(2, reconnectCountRef.current)); // Exponential backoff
          }
        });

        socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          setError(error.message);
          setIsConnected(false);
        });

        // Add debugging for all events
        socket.onAny((eventName, ...args) => {
          console.log('🔔 WebSocket event received:', eventName, args);
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [enabled, reconnectAttempts, reconnectDelay]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      console.log('Emitting WebSocket event:', event, data);
      socketRef.current.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      console.log('Adding WebSocket listener for:', event);
      // Remove any existing listeners for this event first to prevent duplicates
      socketRef.current.off(event);
      socketRef.current.on(event, callback);
    } else {
      console.warn('Cannot add WebSocket listener, socket not available:', event);
    }
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      console.log('Removing WebSocket listener for:', event);
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off,
  };
}