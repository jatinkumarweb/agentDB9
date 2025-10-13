'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VSCodeContainer from '@/components/VSCodeContainer';
import CollaborationPanel from '@/components/CollaborationPanel';
import { AgentActivityProvider } from '@/contexts/AgentActivityContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

export default function WorkspacePage() {
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/workspace');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Show login redirect message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <AgentActivityProvider>
        <div className="h-screen w-full relative bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50">
          {/* Animated Liquid Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
            <div className="blob blob-4"></div>
          </div>

          {/* Noise Texture Overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />

          {/* User info header */}
          <div className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-xl rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-3 py-2 border border-white/20">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                {user?.username || user?.email}
              </span>
            </div>
          </div>

          <div className="relative z-10 h-full">
            <VSCodeContainer 
              className={`h-full transition-all duration-300 ${isCollaborationOpen ? 'mr-80' : ''}`}
              showHeader={true}
              allowPopout={true}
            />
            
            <CollaborationPanel
              isOpen={isCollaborationOpen}
              onToggle={() => setIsCollaborationOpen(!isCollaborationOpen)}
            />
          </div>

          {/* Gradient Color Picker */}
          {showGradientPicker && <GradientColorPicker />}

          {/* Animation Keyframes */}
          <style jsx global>{`
            @keyframes blob-float-1 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.9); }
            }
            @keyframes blob-float-2 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(-40px, 30px) scale(0.9); }
              66% { transform: translate(30px, -30px) scale(1.1); }
            }
            @keyframes blob-float-3 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(40px, 40px) scale(1.1); }
              66% { transform: translate(-30px, -20px) scale(0.9); }
            }
            @keyframes blob-float-4 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(-35px, -40px) scale(0.9); }
              66% { transform: translate(35px, 30px) scale(1.1); }
            }

            .blob {
              position: absolute;
              border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
              opacity: 0.15;
              filter: blur(40px);
              will-change: transform;
            }

            .blob-1 {
              width: 500px;
              height: 500px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              top: -10%;
              left: -10%;
              animation: blob-float-1 28s ease-in-out infinite;
            }

            .blob-2 {
              width: 400px;
              height: 400px;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              top: 40%;
              right: -5%;
              animation: blob-float-2 32s ease-in-out infinite;
            }

            .blob-3 {
              width: 450px;
              height: 450px;
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              bottom: -10%;
              left: 20%;
              animation: blob-float-3 30s ease-in-out infinite;
            }

            .blob-4 {
              width: 350px;
              height: 350px;
              background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
              bottom: 30%;
              right: 20%;
              animation: blob-float-4 25s ease-in-out infinite;
            }
          `}</style>
        </div>
      </AgentActivityProvider>
    </WorkspaceProvider>
  );
}