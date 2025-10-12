'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Settings, Brain, Database, Code, Zap, ArrowLeft, Save, FolderOpen } from 'lucide-react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import toast from 'react-hot-toast';
import ProtectedRoute, { protectionLevels } from '@/components/ProtectedRoute';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

// Import configuration components
import BasicInfoTab from '@/components/agent-settings/BasicInfoTab';
import AdvancedSettingsTab from '@/components/agent-settings/AdvancedSettingsTab';
import CodeStyleTab from '@/components/agent-settings/CodeStyleTab';
import AutomationTab from '@/components/agent-settings/AutomationTab';
import KnowledgeBaseTab from '@/components/agent-settings/KnowledgeBaseTab';
import MemorySettingsTab from '@/components/agent-settings/MemorySettingsTab';
import WorkspaceSettingsTab from '@/components/agent-settings/WorkspaceSettingsTab';

type TabType = 'basic' | 'advanced' | 'codeStyle' | 'automation' | 'workspace' | 'knowledge' | 'memory';

interface Agent {
  id: string;
  name: string;
  description?: string;
  configuration: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function AgentSettingsContent() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/agents/${agentId}`);
      const data = await response.json();
      
      if (data.success) {
        setAgent(data.data);
      } else {
        toast.error('Failed to load agent');
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
      toast.error('Failed to load agent');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!agent) return;

    try {
      setIsSaving(true);
      const response = await fetchWithAuth(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          configuration: agent.configuration,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Agent settings saved successfully');
        setHasChanges(false);
        await loadAgent();
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (updates: any) => {
    if (!agent) return;
    
    setAgent({
      ...agent,
      configuration: {
        ...agent.configuration,
        ...updates,
      },
    });
    setHasChanges(true);
  };

  const handleAgentChange = (updates: Partial<Agent>) => {
    if (!agent) return;
    
    setAgent({
      ...agent,
      ...updates,
    });
    setHasChanges(true);
  };

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info', icon: Settings },
    { id: 'advanced' as TabType, label: 'Advanced', icon: Zap },
    { id: 'codeStyle' as TabType, label: 'Code Style', icon: Code },
    { id: 'automation' as TabType, label: 'Automation', icon: Zap },
    { id: 'workspace' as TabType, label: 'Workspace', icon: FolderOpen },
    { id: 'knowledge' as TabType, label: 'Knowledge Base', icon: Database },
    { id: 'memory' as TabType, label: 'Memory', icon: Brain },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent settings...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 relative overflow-hidden">
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

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{agent.name}</h1>
                <p className="text-sm text-gray-500">Agent Settings</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-indigo-600 hover:border-indigo-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 border border-white/20">
          {activeTab === 'basic' && (
            <BasicInfoTab
              agent={agent}
              onChange={handleAgentChange}
            />
          )}
          {activeTab === 'advanced' && (
            <AdvancedSettingsTab
              configuration={agent.configuration}
              onChange={handleConfigChange}
            />
          )}
          {activeTab === 'codeStyle' && (
            <CodeStyleTab
              codeStyle={agent.configuration.codeStyle}
              onChange={(codeStyle) => handleConfigChange({ codeStyle })}
            />
          )}
          {activeTab === 'automation' && (
            <AutomationTab
              configuration={agent.configuration}
              onChange={handleConfigChange}
            />
          )}
          {activeTab === 'workspace' && (
            <WorkspaceSettingsTab
              configuration={agent.configuration}
              onChange={handleConfigChange}
            />
          )}
          {activeTab === 'knowledge' && (
            <KnowledgeBaseTab
              agentId={agent.id}
              configuration={agent.configuration.knowledgeBase}
              onChange={(knowledgeBase) => handleConfigChange({ knowledgeBase })}
            />
          )}
          {activeTab === 'memory' && (
            <MemorySettingsTab
              agentId={agent.id}
              configuration={agent.configuration.memory}
              onChange={(memory) => handleConfigChange({ memory })}
            />
          )}
        </div>
      </div>

      {/* Unsaved changes warning */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-50/90 backdrop-blur-xl border border-yellow-200 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50">
          <p className="text-sm text-yellow-800">
            You have unsaved changes. Don't forget to save!
          </p>
        </div>
      )}

      {/* Gradient Color Picker */}
      <GradientColorPicker 
        isVisible={showGradientPicker}
        onToggle={() => setShowGradientPicker(!showGradientPicker)}
      />

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
  );
}

export default function AgentSettingsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AgentSettingsContent />
    </ProtectedRoute>
  );
}
