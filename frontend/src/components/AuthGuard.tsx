'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isChecking && !isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.push(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        router.push('/chat');
      }
    }
  }, [isAuthenticated, requireAuth, redirectTo, router, isChecking, isLoading]);

  // Show loading spinner while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // If auth is not required but user is authenticated, don't render children (will redirect)
  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}