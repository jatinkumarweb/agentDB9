'use client';

import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface AuthContextType {
  user: any;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Initialize auth check on app start
    authStore.checkAuth();
  }, [authStore]);

  const contextValue: AuthContextType = {
    user: authStore.user,
    token: authStore.token,
    isLoading: authStore.isLoading,
    isAuthenticated: authStore.isAuthenticated,
    login: authStore.login,
    signup: authStore.signup,
    logout: authStore.logout,
    checkAuth: authStore.checkAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {isClient ? children : (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please log in to access this page.
            </p>
            <a
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}