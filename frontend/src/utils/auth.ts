import { useAuthStore } from '@/stores/authStore';

// Token utilities
export const tokenUtils = {
  // Check if token is expired
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If we can't parse the token, consider it expired
    }
  },

  // Get token expiration time
  getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  },

  // Get user info from token
  getUserFromToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub || payload.userId,
        email: payload.email,
        username: payload.username,
        roles: payload.roles || [],
      };
    } catch (error) {
      return null;
    }
  },

  // Check if token needs refresh (expires in less than 5 minutes)
  needsRefresh(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const fiveMinutes = 5 * 60;
      return payload.exp - currentTime < fiveMinutes;
    } catch (error) {
      return true;
    }
  },
};

// Authentication error handling
export const authErrorHandler = {
  // Handle different types of authentication errors
  handleAuthError(error: any): string {
    if (error.response?.status === 401) {
      return 'Invalid credentials. Please check your email and password.';
    } else if (error.response?.status === 403) {
      return 'Access denied. You do not have permission to access this resource.';
    } else if (error.response?.status === 422) {
      return 'Invalid input. Please check your information and try again.';
    } else if (error.response?.status === 429) {
      return 'Too many attempts. Please wait a moment before trying again.';
    } else if (error.response?.status >= 500) {
      return 'Server error. Please try again later.';
    } else if (error.code === 'NETWORK_ERROR') {
      return 'Network error. Please check your internet connection.';
    } else {
      return error.message || 'An unexpected error occurred. Please try again.';
    }
  },

  // Handle token refresh errors
  handleRefreshError(error: any): void {
    console.error('Token refresh failed:', error);
    
    // Clear auth state and redirect to login
    const { logout } = useAuthStore.getState();
    logout();
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login?reason=session_expired';
    }
  },
};

// Role and permission utilities
export const permissionUtils = {
  // Check if user has required role
  hasRole(userRoles: string[], requiredRole: string): boolean {
    return userRoles.includes(requiredRole);
  },

  // Check if user has any of the required roles
  hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.some(role => userRoles.includes(role));
  },

  // Check if user has all required roles
  hasAllRoles(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.every(role => userRoles.includes(role));
  },

  // Check if user has permission for a specific action
  hasPermission(userRoles: string[], action: string, resource?: string): boolean {
    // Define role-based permissions
    const permissions: Record<string, string[]> = {
      admin: ['*'], // Admin can do everything
      user: ['read:own', 'write:own', 'delete:own'],
      viewer: ['read:own'],
    };

    // Check if user has admin role (can do everything)
    if (userRoles.includes('admin')) {
      return true;
    }

    // Check specific permissions
    const userPermissions = userRoles.flatMap(role => permissions[role] || []);
    const requiredPermission = resource ? `${action}:${resource}` : action;
    
    return userPermissions.includes(requiredPermission) || 
           userPermissions.includes(`${action}:own`) ||
           userPermissions.includes('*');
  },
};

// Session management utilities
export const sessionUtils = {
  // Set session timeout warning
  setSessionWarning(callback: () => void, warningTime: number = 5 * 60 * 1000): NodeJS.Timeout {
    return setTimeout(callback, warningTime);
  },

  // Clear session warning
  clearSessionWarning(timeoutId: NodeJS.Timeout): void {
    clearTimeout(timeoutId);
  },

  // Check if session is about to expire
  isSessionExpiring(token: string, warningTime: number = 5 * 60): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp - currentTime < warningTime;
    } catch (error) {
      return true;
    }
  },

  // Get remaining session time in seconds
  getRemainingSessionTime(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return Math.max(0, payload.exp - currentTime);
    } catch (error) {
      return 0;
    }
  },
};

// Local storage utilities for auth data
export const authStorageUtils = {
  // Keys for localStorage
  keys: {
    token: 'auth-token',
    user: 'auth-user',
    refreshToken: 'auth-refresh-token',
    lastActivity: 'auth-last-activity',
  },

  // Save auth data to localStorage
  saveAuthData(token: string, user: any, refreshToken?: string): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(this.keys.token, token);
    localStorage.setItem(this.keys.user, JSON.stringify(user));
    localStorage.setItem(this.keys.lastActivity, Date.now().toString());
    
    if (refreshToken) {
      localStorage.setItem(this.keys.refreshToken, refreshToken);
    }
  },

  // Load auth data from localStorage
  loadAuthData(): { token: string | null; user: any; refreshToken: string | null } {
    if (typeof window === 'undefined') {
      return { token: null, user: null, refreshToken: null };
    }

    const token = localStorage.getItem(this.keys.token);
    const userStr = localStorage.getItem(this.keys.user);
    const refreshToken = localStorage.getItem(this.keys.refreshToken);

    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
      }
    }

    return { token, user, refreshToken };
  },

  // Clear auth data from localStorage
  clearAuthData(): void {
    if (typeof window === 'undefined') return;

    Object.values(this.keys).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // Update last activity timestamp
  updateLastActivity(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.keys.lastActivity, Date.now().toString());
  },

  // Get last activity timestamp
  getLastActivity(): number {
    if (typeof window === 'undefined') return 0;
    const lastActivity = localStorage.getItem(this.keys.lastActivity);
    return lastActivity ? parseInt(lastActivity, 10) : 0;
  },
};