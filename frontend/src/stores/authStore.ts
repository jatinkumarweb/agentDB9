import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

// Use relative URLs to go through Next.js API routes
// This allows the frontend to proxy requests to the backend
const API_BASE_URL = '';

// Configure axios to include credentials (cookies) in requests
axios.defaults.withCredentials = true;

// Configure axios defaults - use empty string for relative URLs
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          // Use fetch with credentials to ensure cookies are handled properly
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || 'Login failed');
          }

          const data = await response.json();
          // API route returns { user, accessToken } directly
          const { user, accessToken } = data;

          // Set authorization header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          // Set cookie manually for middleware compatibility
          if (typeof document !== 'undefined') {
            // Use different cookie settings for development vs production
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieSettings = isProduction 
              ? `auth-token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`
              : `auth-token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
            document.cookie = cookieSettings;
          }

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.message || 'Login failed. Please try again.');
        }
      },

      signup: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || 'Signup failed');
          }

          const data = await response.json();
          // API route returns { user, accessToken } directly
          const { user, accessToken } = data;

          // Set authorization header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          // Set cookie manually for middleware compatibility
          if (typeof document !== 'undefined') {
            // Use different cookie settings for development vs production
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieSettings = isProduction 
              ? `auth-token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`
              : `auth-token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
            document.cookie = cookieSettings;
          }

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.message || 'Signup failed. Please try again.');
        }
      },

      logout: async () => {
        // Remove authorization header
        delete axios.defaults.headers.common['Authorization'];
        
        // Clear auth cookie manually
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        
        // Call logout API to clear cookie
        try {
          await axios.post('/api/auth/logout');
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshToken: async () => {
        const { token } = get();
        
        if (!token) {
          throw new Error('No token available');
        }

        try {
          const response = await axios.post('/api/auth/refresh', {}, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const { token: newToken, user } = response.data.data;

          // Update authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

          set({
            token: newToken,
            user,
            isAuthenticated: true,
          });
        } catch (error: any) {
          // If refresh fails, logout the user
          get().logout();
          throw new Error('Session expired. Please login again.');
        }
      },

      checkAuth: async () => {
        const { token } = get();
        
        console.log('checkAuth: Starting auth check, token present:', !!token);
        
        // Set loading state to prevent premature redirects
        set({ isLoading: true });
        
        if (!token) {
          console.log('checkAuth: No token found, setting unauthenticated');
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          // Set the authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify the token is still valid using fetchWithAuth (includes Authorization header)
          console.log('checkAuth: Calling /api/auth/profile with auth token');
          const response = await fetchWithAuth('/api/auth/profile');
          
          console.log('checkAuth: Profile response status:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('checkAuth: Profile request failed:', errorData);
            throw new Error(`Profile request failed with status ${response.status}`);
          }
          
          const data = await response.json();
          console.log('checkAuth: Profile data received:', { hasData: !!data.data, hasUser: !!data.data?.user });
          
          if (!data.data || !data.data.email) {
            console.error('checkAuth: Invalid profile data structure:', data);
            throw new Error('Invalid profile data structure');
          }
          
          const user = data.data;

          console.log('checkAuth: Token valid, user authenticated:', user.email);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('checkAuth: Error occurred:', error.message, error);
          console.log('checkAuth: Token invalid, logging out');
          // Token is invalid, logout the user
          set({ isLoading: false });
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1, // Increment to clear old storage format
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set up axios header when store is rehydrated
        if (state?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
          
          // Set cookie for middleware compatibility
          if (typeof document !== 'undefined') {
            // Use different cookie settings for development vs production
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieSettings = isProduction 
              ? `auth-token=${state.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`
              : `auth-token=${state.token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
            document.cookie = cookieSettings;
          }
          
          // Check if the token is still valid
          state.checkAuth?.();
        }
      },
    }
  )
);

// Axios interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await useAuthStore.getState().refreshToken();
        // Retry the original request with the new token
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);