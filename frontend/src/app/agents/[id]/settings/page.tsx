'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Settings, Brain, Database, Code, Zap, ArrowLeft, Save } from 'lucide-react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import toast from 'react-hot-toast';
import ProtectedRoute, { protectionLevels } from '@/components/ProtectedRoute';

// Import configuration components
import BasicInfoTab from '@/components/agent-settings/BasicInfoTab';
import AdvancedSettingsTab from '@/components/agent-settings/AdvancedSettingsTab';
import CodeStyleTab from '@/components/agent-settings/CodeStyleTab';
import AutomationTab from '@/components/agent-settings/AutomationTab';
import KnowledgeBaseTab from '@/components/agent-settings/KnowledgeBaseTab';
import MemorySettingsTab from '@/components/agent-settings/MemorySettingsTab';

type TabType = 'basic' | 'advanced' | 'codeStyle' | 'automation' | 'knowledge' | 'memory';

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
    { id: 'knowledge' as TabType, label: 'Knowledge Base', icon: Database },
    { id: 'memory' as TabType, label: 'Memory', icon: Brain },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent settings...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
                <p className="text-sm text-gray-500">Agent Settings</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
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
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-yellow-800">
            You have unsaved changes. Don't forget to save!
          </p>
        </div>
      )}
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
