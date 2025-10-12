'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { tailwindTokens } from '@/styles/design-tokens';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

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
  const [showGradientPicker, setShowGradientPicker] = useState(false);

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
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative font-['Inter',sans-serif]"
      data-gradient-bg
    >
      {/* Animated liquid blobs - very slow animations */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          style={{ animation: 'blob1 25s ease-in-out infinite' }}
          data-blob="1"
        ></div>
        <div 
          className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          style={{ animation: 'blob2 30s ease-in-out infinite' }}
          data-blob="2"
        ></div>
        <div 
          className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          style={{ animation: 'blob3 28s ease-in-out infinite' }}
          data-blob="3"
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          style={{ animation: 'blob4 32s ease-in-out infinite' }}
          data-blob="4"
        ></div>
      </div>

      {/* Noise texture overlay for matte effect */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      ></div>

      <style>{`
        @keyframes blob1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes blob2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-40px, 30px) scale(1.15);
          }
          66% {
            transform: translate(30px, -30px) scale(0.95);
          }
        }
        @keyframes blob3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, 20px) scale(0.9);
          }
          66% {
            transform: translate(-30px, -40px) scale(1.1);
          }
        }
        @keyframes blob4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-25px, -35px) scale(1.05);
          }
          66% {
            transform: translate(40px, 25px) scale(0.95);
          }
        }
      `}</style>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
                <div className="w-12 h-12 bg-white rounded-xl transform -rotate-12"></div>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600 text-sm">Sign in to continue your journey</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email input */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-2xl opacity-0 group-hover:opacity-30 transition-all duration-300 blur"></div>
              <div className="relative bg-white/50 backdrop-blur-sm rounded-2xl border border-white/80 transition-all duration-300 hover:bg-white/60 hover:border-indigo-200">
                <div className="flex items-center px-4 py-4">
                  <Mail className="w-5 h-5 text-indigo-500 mr-3" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Email address"
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none"
                    aria-label="Email address"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                </div>
              </div>
              {errors.email && (
                <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password input */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-2xl opacity-0 group-hover:opacity-30 transition-all duration-300 blur"></div>
              <div className="relative bg-white/50 backdrop-blur-sm rounded-2xl border border-white/80 transition-all duration-300 hover:bg-white/60 hover:border-indigo-200">
                <div className="flex items-center px-4 py-4">
                  <Lock className="w-5 h-5 text-indigo-500 mr-3" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Password"
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none"
                    aria-label="Password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-indigo-500 hover:text-indigo-700 transition-colors duration-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-600 cursor-pointer group">
                <input 
                  id="remember-me"
                  name="remember-me"
                  type="checkbox" 
                  className="mr-2 accent-indigo-600" 
                  aria-label="Remember me"
                />
                <span className="group-hover:text-gray-900 transition-colors duration-300">Remember me</span>
              </label>
              <Link 
                href="/auth/forgot-password" 
                className="text-indigo-600 hover:text-indigo-800 transition-colors duration-300 font-medium"
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
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                  <ArrowRight className={`ml-2 w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Social login - Placeholder for future implementation */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              disabled
              className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/80 py-3 text-gray-700 hover:bg-white/60 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              aria-label="Sign in with Google (coming soon)"
            >
              Google
            </button>
            <button 
              type="button"
              disabled
              className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/80 py-3 text-gray-700 hover:bg-white/60 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              aria-label="Sign in with Apple (coming soon)"
            >
              Apple
            </button>
          </div>

          {/* Sign up link */}
          <p className="text-center text-gray-600 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="text-gray-900 font-semibold hover:text-indigo-600 transition-colors duration-300"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials</h3>
          <p className="text-xs text-gray-600">
            Email: demo@agentdb9.com<br />
            Password: demo123
          </p>
        </div>

        {/* Dev Tool Toggle Button */}
        {process.env.NODE_ENV === 'development' && !showGradientPicker && (
          <button
            onClick={() => setShowGradientPicker(true)}
            className="mt-4 w-full bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/50 transition-all duration-300 text-sm font-medium text-gray-700"
          >
            🎨 Open Gradient Color Picker
          </button>
        )}
      </div>

      {/* Gradient Color Picker Dev Tool */}
      {showGradientPicker && (
        <GradientColorPicker onClose={() => setShowGradientPicker(false)} />
      )}
    </div>
  );
}