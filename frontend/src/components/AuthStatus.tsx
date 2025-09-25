'use client';

import React from 'react';
import Link from 'next/link';
import { User, LogOut, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface AuthStatusProps {
  showUserMenu?: boolean;
  className?: string;
}

export default function AuthStatus({ 
  showUserMenu = true, 
  className = '' 
}: AuthStatusProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Link
          href="/auth/login"
          className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  if (!showUserMenu) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-700">{user?.username}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-4">
        {/* User Info */}
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user?.username}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-1">
          <Link
            href="/settings"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simplified version for mobile or compact layouts
export function AuthStatusCompact({ className = '' }: { className?: string }) {
  const { user, isAuthenticated, logout, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className={`text-blue-600 hover:text-blue-800 text-sm font-medium ${className}`}
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
        <User className="h-3 w-3 text-white" />
      </div>
      <span className="text-sm text-gray-700 truncate max-w-20">
        {user?.username}
      </span>
      <button
        onClick={logout}
        className="text-gray-400 hover:text-gray-600"
        title="Sign Out"
      >
        <LogOut className="h-3 w-3" />
      </button>
    </div>
  );
}

// Role badge component
export function RoleBadge({ 
  roles = [], 
  className = '' 
}: { 
  roles?: string[]; 
  className?: string; 
}) {
  if (!roles || roles.length === 0) {
    return null;
  }

  const getHighestRole = (userRoles: string[]) => {
    const roleHierarchy = ['admin', 'moderator', 'user', 'viewer'];
    return roleHierarchy.find(role => userRoles.includes(role)) || userRoles[0];
  };

  const highestRole = getHighestRole(roles);
  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    moderator: 'bg-yellow-100 text-yellow-800',
    user: 'bg-green-100 text-green-800',
    viewer: 'bg-gray-100 text-gray-800',
  };

  const roleColor = roleColors[highestRole as keyof typeof roleColors] || roleColors.user;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColor} ${className}`}>
      <Shield className="h-3 w-3 mr-1" />
      {highestRole}
    </span>
  );
}