'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { tailwindTokens } from '@/styles/design-tokens';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, checkAuth } = useAuthStore();
  
  // Check auth on mount to see if user is already authenticated
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // Redirect authenticated users to chat page (only after checkAuth completes)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('User already authenticated, redirecting to /chat');
      router.push('/chat');
    }
  }, [isAuthenticated, isLoading, router]);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
      toast.success('Login successful!');
      
      // Wait a brief moment for state to update, then redirect
      setTimeout(() => {
        router.push('/chat');
      }, 100);
    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials. Please try again.');
      
      // Clear password field on error
      setPassword('');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  return (
    <div className={`min-h-screen ${tailwindTokens.gradientPrimary} flex items-center justify-center p-4 overflow-hidden relative`}>
      {/* Animated liquid blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }
      `}</style>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        <div className={`${tailwindTokens.glassmorphicCard} p-8 shadow-2xl`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
                <div className="w-12 h-12 bg-white rounded-xl transform -rotate-12"></div>
              </div>
            </div>
            <h1 className={`text-4xl font-bold ${tailwindTokens.textPrimary} mb-2`}>Welcome Back</h1>
            <p className={`${tailwindTokens.textSecondary} text-sm`}>Sign in to continue your journey</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email input */}
            <div className="relative group">
              <div className={`absolute inset-0 ${tailwindTokens.gradientHover} rounded-2xl opacity-0 group-hover:opacity-100 ${tailwindTokens.transitionAll} blur`}></div>
              <div className={`relative ${tailwindTokens.glassmorphicInput} ${tailwindTokens.transitionAll} hover:bg-opacity-15`}>
                <div className="flex items-center px-4 py-4">
                  <Mail className={`w-5 h-5 ${tailwindTokens.textAccent} mr-3`} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Email address"
                    className={`flex-1 bg-transparent ${tailwindTokens.textPrimary} placeholder-purple-300 outline-none`}
                    aria-label="Email address"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                </div>
              </div>
              {errors.email && (
                <p id="email-error" className="mt-2 text-sm text-pink-300" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password input */}
            <div className="relative group">
              <div className={`absolute inset-0 ${tailwindTokens.gradientHover} rounded-2xl opacity-0 group-hover:opacity-100 ${tailwindTokens.transitionAll} blur`}></div>
              <div className={`relative ${tailwindTokens.glassmorphicInput} ${tailwindTokens.transitionAll} hover:bg-opacity-15`}>
                <div className="flex items-center px-4 py-4">
                  <Lock className={`w-5 h-5 ${tailwindTokens.textAccent} mr-3`} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Password"
                    className={`flex-1 bg-transparent ${tailwindTokens.textPrimary} placeholder-purple-300 outline-none`}
                    aria-label="Password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`${tailwindTokens.textAccent} hover:text-white ${tailwindTokens.transitionColors}`}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-2 text-sm text-pink-300" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className={`flex items-center ${tailwindTokens.textSecondary} cursor-pointer group`}>
                <input 
                  id="remember-me"
                  name="remember-me"
                  type="checkbox" 
                  className="mr-2 accent-purple-500" 
                  aria-label="Remember me"
                />
                <span className={`group-hover:text-white ${tailwindTokens.transitionColors}`}>Remember me</span>
              </label>
              <Link 
                href="/auth/forgot-password" 
                className={`${tailwindTokens.textAccent} hover:text-white ${tailwindTokens.transitionColors}`}
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`w-full ${tailwindTokens.gradientButton} ${tailwindTokens.textPrimary} font-semibold py-4 rounded-2xl shadow-lg ${tailwindTokens.hoverGlow} transform ${tailwindTokens.hoverScale} ${tailwindTokens.transitionAll} flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              aria-label="Sign in"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className={`ml-2 w-5 h-5 ${tailwindTokens.transitionTransform} ${isHovered ? 'translate-x-1' : ''}`} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white bg-opacity-20"></div>
            <span className={`px-4 ${tailwindTokens.textSecondary} text-sm`}>or</span>
            <div className="flex-1 h-px bg-white bg-opacity-20"></div>
          </div>

          {/* Social login - Placeholder for future implementation */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              disabled
              className={`${tailwindTokens.glassmorphicInput} py-3 ${tailwindTokens.textPrimary} hover:bg-opacity-20 ${tailwindTokens.transitionAll} transform ${tailwindTokens.hoverScale} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              aria-label="Sign in with Google (coming soon)"
            >
              Google
            </button>
            <button 
              type="button"
              disabled
              className={`${tailwindTokens.glassmorphicInput} py-3 ${tailwindTokens.textPrimary} hover:bg-opacity-20 ${tailwindTokens.transitionAll} transform ${tailwindTokens.hoverScale} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              aria-label="Sign in with Apple (coming soon)"
            >
              Apple
            </button>
          </div>

          {/* Sign up link */}
          <p className={`text-center ${tailwindTokens.textSecondary} text-sm mt-6`}>
            Don&apos;t have an account?{' '}
            <Link 
              href="/auth/signup" 
              className={`${tailwindTokens.textPrimary} font-semibold hover:underline`}
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className={`mt-6 ${tailwindTokens.glassmorphicCard} p-4`}>
          <h3 className={`text-sm font-medium ${tailwindTokens.textSecondary} mb-2`}>Demo Credentials</h3>
          <p className={`text-xs ${tailwindTokens.textAccent}`}>
            Email: demo@agentdb9.com<br />
            Password: demo123
          </p>
        </div>
      </div>
    </div>
  );
}