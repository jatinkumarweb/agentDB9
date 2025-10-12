'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGradientPicker, setShowGradientPicker] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call for password reset
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSubmitted(true);
      toast.success('Password reset instructions sent to your email');
    } catch (error: any) {
      toast.error('Failed to send reset instructions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative font-['Inter',sans-serif]" data-gradient-bg>
        {/* Animated liquid blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob1 25s ease-in-out infinite' }} data-blob="1"></div>
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob2 30s ease-in-out infinite' }} data-blob="2"></div>
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob3 28s ease-in-out infinite' }} data-blob="3"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob4 32s ease-in-out infinite' }} data-blob="4"></div>
        </div>

        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }}></div>

        <style>{`
          @keyframes blob1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
          @keyframes blob2 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-40px, 30px) scale(1.15); } 66% { transform: translate(30px, -30px) scale(0.95); } }
          @keyframes blob3 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(50px, 20px) scale(0.9); } 66% { transform: translate(-30px, -40px) scale(1.1); } }
          @keyframes blob4 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-25px, -35px) scale(1.05); } 66% { transform: translate(40px, 25px) scale(0.95); } }
        `}</style>

        <div className="relative z-10 max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
              <div className="transform -rotate-12">
                <Send className="h-8 w-8 text-gray-900" />
              </div>
            </div>
            <h2 className="mt-6 text-4xl font-bold text-gray-900">Check your email</h2>
            <p className="mt-2 text-sm text-gray-600">We&apos;ve sent password reset instructions to</p>
            <p className="text-sm font-medium text-gray-900">{email}</p>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">Didn&apos;t receive the email? Check your spam folder or try again.</p>
              
              <button onClick={() => { setIsSubmitted(false); setEmail(''); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors">
                Try a different email address
              </button>
              
              <div className="pt-4">
                <Link href="/auth/login" className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to login</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {showGradientPicker && <GradientColorPicker onClose={() => setShowGradientPicker(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative font-['Inter',sans-serif]" data-gradient-bg>
      {/* Animated liquid blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob1 25s ease-in-out infinite' }} data-blob="1"></div>
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob2 30s ease-in-out infinite' }} data-blob="2"></div>
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob3 28s ease-in-out infinite' }} data-blob="3"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob4 32s ease-in-out infinite' }} data-blob="4"></div>
      </div>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }}></div>

      <style>{`
        @keyframes blob1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
        @keyframes blob2 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-40px, 30px) scale(1.15); } 66% { transform: translate(30px, -30px) scale(0.95); } }
        @keyframes blob3 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(50px, 20px) scale(0.9); } 66% { transform: translate(-30px, -40px) scale(1.1); } }
        @keyframes blob4 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-25px, -35px) scale(1.05); } 66% { transform: translate(40px, 25px) scale(0.95); } }
      `}</style>

      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
            <div className="transform -rotate-12">
              <Mail className="h-8 w-8 text-gray-900" />
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-bold text-gray-900">Forgot your password?</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your email address and we&apos;ll send you instructions to reset your password.</p>
        </div>

        {/* Reset Form */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleInputChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-3 bg-white/50 backdrop-blur-sm rounded-xl border ${
                    errors.email ? 'border-red-300' : 'border-white/80'
                  } placeholder-gray-400 text-gray-900 outline-none focus:bg-white/60 focus:border-indigo-200 transition-all duration-300`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
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
                    Sending instructions...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send reset instructions
                  </>
                )}
              </button>
            </div>

            {/* Back to login */}
            <div className="text-center">
              <Link
                href="/auth/login"
                className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to login</span>
              </Link>
            </div>
          </form>
        </div>

        {/* Help text */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Need help?</h3>
          <p className="text-xs text-gray-900">
            If you&apos;re still having trouble accessing your account, please contact our support team.
          </p>
        </div>

        {/* Gradient Picker Button */}
        {process.env.NODE_ENV === 'development' && !showGradientPicker && (
          <button
            onClick={() => setShowGradientPicker(true)}
            className="w-full bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/50 transition-all duration-300 text-sm font-medium text-gray-900"
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