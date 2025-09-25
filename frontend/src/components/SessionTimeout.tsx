'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { sessionUtils, tokenUtils } from '@/utils/auth';
import toast from 'react-hot-toast';

interface SessionTimeoutProps {
  warningTime?: number; // Time in seconds before expiry to show warning
  autoRefresh?: boolean; // Whether to automatically refresh token
  showCountdown?: boolean; // Whether to show countdown timer
}

export default function SessionTimeout({
  warningTime = 300, // 5 minutes
  autoRefresh = true,
  showCountdown = true,
}: SessionTimeoutProps) {
  const { token, refreshToken, logout, isAuthenticated } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSessionExpiry = useCallback(() => {
    toast.error('Your session has expired. Please log in again.');
    logout();
  }, [logout]);

  const handleRefreshToken = useCallback(async () => {
    if (!token || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshToken();
      setShowWarning(false);
      toast.success('Session refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      toast.error('Failed to refresh session. Please log in again.');
      logout();
    } finally {
      setIsRefreshing(false);
    }
  }, [token, refreshToken, logout, isRefreshing]);

  const extendSession = useCallback(() => {
    handleRefreshToken();
  }, [handleRefreshToken]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setShowWarning(false);
      return;
    }

    const checkSessionStatus = () => {
      if (!token) return;

      const remaining = sessionUtils.getRemainingSessionTime(token);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        handleSessionExpiry();
        return;
      }

      if (remaining <= warningTime && !showWarning) {
        setShowWarning(true);
      }

      // Auto-refresh if enabled and token needs refresh
      if (autoRefresh && tokenUtils.needsRefresh(token) && !isRefreshing) {
        handleRefreshToken();
      }
    };

    // Check immediately
    checkSessionStatus();

    // Set up interval to check every 30 seconds
    const interval = setInterval(checkSessionStatus, 30000);

    return () => clearInterval(interval);
  }, [
    token,
    isAuthenticated,
    warningTime,
    showWarning,
    autoRefresh,
    isRefreshing,
    handleSessionExpiry,
    handleRefreshToken,
  ]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning || !isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Session Expiring Soon
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Your session will expire in:</p>
              {showCountdown && (
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="font-mono font-semibold">
                    {formatTime(remainingTime)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={extendSession}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Extend Session
                  </>
                )}
              </button>
              <button
                onClick={dismissWarning}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}