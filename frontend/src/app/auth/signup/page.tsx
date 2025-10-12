'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthRedirect, authRedirectConfigs } from '@/hooks/useAuthRedirect';
import toast from 'react-hot-toast';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuthStore();
  
  // Redirect authenticated users to dashboard
  useAuthRedirect(authRedirectConfigs.authPages);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGradientPicker, setShowGradientPicker] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await signup(formData.username, formData.email, formData.password);
      toast.success('Account created successfully!');
      router.push('/chat');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative font-['Inter',sans-serif]" data-gradient-bg>
      {/* Animated liquid blobs */}
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

      {/* Noise texture overlay */}
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

      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
            <div className="transform -rotate-12">
              <UserPlus className="h-8 w-8 text-gray-900" />
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join AgentDB9 and start building AI agents
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-900">
                Username
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-3 bg-white/50 backdrop-blur-sm rounded-xl border ${
                    errors.username ? 'border-red-300' : 'border-white/80'
                  } placeholder-gray-400 text-gray-900 outline-none focus:bg-white/60 focus:border-indigo-200 transition-all duration-300`}
                  placeholder="Choose a username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-3 bg-white/50 backdrop-blur-sm rounded-xl border ${
                    errors.email ? 'border-red-300' : 'border-white/80'
                  } placeholder-gray-400 text-gray-900 outline-none focus:bg-white/60 focus:border-indigo-200 transition-all duration-300`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`appearance-none block w-full pl-10 pr-10 py-3 bg-white/50 backdrop-blur-sm rounded-xl border ${
                    errors.password ? 'border-red-300' : 'border-white/80'
                  } placeholder-gray-400 text-gray-900 outline-none focus:bg-white/60 focus:border-indigo-200 transition-all duration-300`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-600" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          strengthColors[Math.min(passwordStrength - 1, 4)]
                        }`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {strengthLabels[Math.min(passwordStrength - 1, 4)]}
                    </span>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`appearance-none block w-full pl-10 pr-10 py-3 bg-white/50 backdrop-blur-sm rounded-xl border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-white/80'
                  } placeholder-gray-400 text-gray-900 outline-none focus:bg-white/60 focus:border-indigo-200 transition-all duration-300`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create account
                  </>
                )}
              </button>
            </div>

            {/* Sign in link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Gradient Picker Button */}
        {process.env.NODE_ENV === 'development' && !showGradientPicker && (
          <button
            onClick={() => setShowGradientPicker(true)}
            className="mt-4 w-full bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/50 transition-all duration-300 text-sm font-medium text-gray-900"
          >
            🎨 Open Gradient Color Picker
          </button>
        )}
      </div>

      {/* Gradient Color Picker */}
      {showGradientPicker && (
        <GradientColorPicker onClose={() => setShowGradientPicker(false)} />
      )}
    </div>
  );
}