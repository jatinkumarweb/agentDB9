'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { permissionUtils } from '@/utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallbackComponent?: React.ComponentType;
  redirectTo?: string;
  allowedPaths?: string[];
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackComponent: FallbackComponent,
  redirectTo = '/auth/login',
  allowedPaths = [],
}: ProtectedRouteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthorization = () => {
      setIsChecking(true);

      // If still loading, wait
      if (isLoading) {
        return;
      }

      // If authentication is required but user is not authenticated
      if (requireAuth && !isAuthenticated) {
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        router.push(`${redirectTo}?returnUrl=${returnUrl}`);
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // If authentication is not required and user is not authenticated
      if (!requireAuth && !isAuthenticated) {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      // If user is authenticated, check roles and permissions
      if (isAuthenticated && user) {
        const userRoles = user.role ? [user.role] : [];

        // Check required roles
        if (requiredRoles.length > 0) {
          const hasRequiredRole = permissionUtils.hasAnyRole(userRoles, requiredRoles);
          if (!hasRequiredRole) {
            setIsAuthorized(false);
            setIsChecking(false);
            return;
          }
        }

        // Check required permissions
        if (requiredPermissions.length > 0) {
          const hasRequiredPermissions = requiredPermissions.every(permission => 
            permissionUtils.hasPermission(userRoles, permission)
          );
          if (!hasRequiredPermissions) {
            setIsAuthorized(false);
            setIsChecking(false);
            return;
          }
        }

        setIsAuthorized(true);
      } else {
        setIsAuthorized(!requireAuth);
      }

      setIsChecking(false);
    };

    checkAuthorization();
  }, [
    isAuthenticated,
    isLoading,
    user,
    requireAuth,
    requiredRoles,
    requiredPermissions,
    redirectTo,
    router,
  ]);

  // Show loading state
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!isAuthorized) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to access this page.
          </p>
          <div className="space-y-2">
            {!isAuthenticated && (
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Predefined protection levels
export const protectionLevels = {
  // Basic authentication required
  authenticated: {
    requireAuth: true,
  },
  
  // Admin only
  admin: {
    requireAuth: true,
    requiredRoles: ['admin'],
  },
  
  // Moderator or admin
  moderator: {
    requireAuth: true,
    requiredRoles: ['admin', 'moderator'],
  },
  
  // User with specific permissions
  userWithPermissions: (permissions: string[]) => ({
    requireAuth: true,
    requiredPermissions: permissions,
  }),
  
  // Public access (no authentication required)
  public: {
    requireAuth: false,
  },
};