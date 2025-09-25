'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface UseAuthRedirectOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedPaths?: string[];
}

export function useAuthRedirect({
  requireAuth = true,
  redirectTo,
  allowedPaths = [],
}: UseAuthRedirectOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Check if current path is in allowed paths
    const isAllowedPath = allowedPaths.some(path => 
      pathname.startsWith(path)
    );

    if (requireAuth && !isAuthenticated && !isAllowedPath) {
      // User needs to be authenticated but isn't
      const loginUrl = redirectTo || '/auth/login';
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${loginUrl}?returnUrl=${returnUrl}`);
    } else if (!requireAuth && isAuthenticated) {
      // User is authenticated but shouldn't be (e.g., on login page)
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, requireAuth, redirectTo, allowedPaths, router]);

  useEffect(() => {
    // Check auth status on mount
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    isLoading,
  };
}

// Predefined configurations for common use cases
export const authRedirectConfigs = {
  // For pages that require authentication
  protected: {
    requireAuth: true,
    redirectTo: '/auth/login',
  },
  
  // For auth pages (login, signup) that should redirect if already authenticated
  authPages: {
    requireAuth: false,
  },
  
  // For public pages that allow both authenticated and unauthenticated users
  public: {
    requireAuth: false,
    allowedPaths: ['/'],
  },
  
  // For admin pages
  admin: {
    requireAuth: true,
    redirectTo: '/auth/login',
    allowedPaths: ['/admin'],
  },
};