import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

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
          const response = await axios.post('/api/auth/login', {
            email,
            password,
          });

          // Backend returns { user, accessToken } directly
          const { user, accessToken } = response.data;

          // Set authorization header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          
          // Handle different error response formats
          const errorMessage = error.response?.data?.message || 
                              error.response?.data?.error || 
                              error.message ||
                              'Login failed. Please try again.';
          throw new Error(errorMessage);
        }
      },

      signup: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await axios.post('/api/auth/register', {
            username,
            email,
            password,
          });

          // Backend returns { user, accessToken } directly
          const { user, accessToken } = response.data;

          // Set authorization header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          
          // Handle different error response formats
          const errorMessage = error.response?.data?.message || 
                              error.response?.data?.error || 
                              error.message ||
                              'Signup failed. Please try again.';
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        // Remove authorization header
        delete axios.defaults.headers.common['Authorization'];
        
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
        
        if (!token) {
          return;
        }

        try {
          // Set the authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify the token is still valid
          const response = await axios.get('/api/auth/profile');
          const { user } = response.data.data;

          set({
            user,
            isAuthenticated: true,
          });
        } catch (error: any) {
          // Token is invalid, logout the user
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set up axios header when store is rehydrated
        if (state?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
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