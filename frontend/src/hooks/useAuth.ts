import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  });
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Get token from cookies
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false
        });
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          user: userData.user,
          isLoading: false,
          isAuthenticated: true
        });
      } else {
        // Token is invalid, clear it
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.accessToken) {
        // Token is automatically set as cookie by the API
        await checkAuthStatus(); // Refresh auth state
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state regardless of API response
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false
      });
      router.push('/auth/login');
    }
  };

  const requireAuth = () => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.push('/auth/login');
      return false;
    }
    return authState.isAuthenticated;
  };

  return {
    ...authState,
    login,
    logout,
    requireAuth,
    checkAuthStatus
  };
};