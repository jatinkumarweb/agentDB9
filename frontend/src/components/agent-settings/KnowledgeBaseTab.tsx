'use client';

import { useState, useEffect } from 'react';
import { Database, Plus, FileText, Globe, Github, Book, Trash2, RefreshCw, Upload, Link as LinkIcon } from 'lucide-react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import toast from 'react-hot-toast';
import FileUploader from '../knowledge/FileUploader';
import KnowledgeSourceCard from '../knowledge/KnowledgeSourceCard';
import AddSourceModal from '../knowledge/AddSourceModal';

interface KnowledgeBaseTabProps {
  agentId: string;
  configuration?: {
    enabled?: boolean;
    embeddingProvider?: string;
    embeddingModel?: string;
    vectorStore?: string;
    chunkSize?: number;
    chunkOverlap?: number;
    retrievalTopK?: number;
    autoUpdate?: boolean;
    updateFrequency?: string;
  };
  onChange: (config: any) => void;
}

interface KnowledgeSource {
  id: string;
  type: string;
  url?: string;
  metadata: {
    title: string;
    description?: string;
    tags: string[];
    chunkCount?: number;
    tokenCount?: number;
  };
  status: string;
  lastIndexed?: string;
  error?: string;
}

export default function KnowledgeBaseTab({ agentId, configuration = {}, onChange }: KnowledgeBaseTabProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const defaults = {
    enabled: false,
    embeddingProvider: 'ollama',
    embeddingModel: 'nomic-embed-text',
    vectorStore: 'qdrant',
    chunkSize: 1000,
    chunkOverlap: 200,
    retrievalTopK: 5,
    autoUpdate: false,
    updateFrequency: 'manual',
    ...configuration,
  };

  useEffect(() => {
    if (defaults.enabled) {
      loadSources();
    }
  }, [agentId, defaults.enabled]);

  const loadSources = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/knowledge/sources/${agentId}`);
      const data = await response.json();
      
      if (data.success) {
        setSources(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load knowledge sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    onChange({ ...defaults, enabled });
  };

  const handleConfigChange = (field: string, value: any) => {
    onChange({ ...defaults, [field]: value });
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge source?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/knowledge/sources/${sourceId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Knowledge source deleted');
        await loadSources();
      } else {
        toast.error('Failed to delete source');
      }
    } catch (error) {
      console.error('Failed to delete source:', error);
      toast.error('Failed to delete source');
    }
  };

  const handleReindex = async (sourceId: string) => {
    try {
      const response = await fetchWithAuth(`/api/knowledge/sources/${sourceId}/reindex`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Re-indexing started');
        await loadSources();
      } else {
        toast.error('Failed to start re-indexing');
      }
    } catch (error) {
      console.error('Failed to reindex:', error);
      toast.error('Failed to start re-indexing');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Knowledge Base</h3>
        <p className="text-sm text-gray-500 mb-6">
          Add documents, websites, and other sources to give your agent domain-specific knowledge.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Enable Knowledge Base</h4>
          <p className="text-xs text-gray-500 mt-1">
            Allow this agent to use external knowledge sources
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={defaults.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {defaults.enabled && (
        <>
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chunk Size
              </label>
              <input
                type="number"
                value={defaults.chunkSize}
                onChange={(e) => handleConfigChange('chunkSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="100"
                max="2000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chunk Overlap
              </label>
              <input
                type="number"
                value={defaults.chunkOverlap}
                onChange={(e) => handleConfigChange('chunkOverlap', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retrieval Top K
              </label>
              <input
                type="number"
                value={defaults.retrievalTopK}
                onChange={(e) => handleConfigChange('retrievalTopK', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vector Store
              </label>
              <select
                value={defaults.vectorStore}
                onChange={(e) => handleConfigChange('vectorStore', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="qdrant">Qdrant</option>
                <option value="chroma">Chroma</option>
                <option value="pinecone">Pinecone</option>
                <option value="weaviate">Weaviate</option>
              </select>
            </div>
          </div>

          {/* Knowledge Sources */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Knowledge Sources</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowUploader(true)}
                  className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Source
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading sources...</p>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">No knowledge sources yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first source
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sources.map((source) => (
                  <KnowledgeSourceCard
                    key={source.id}
                    source={source}
                    onDelete={() => handleDeleteSource(source.id)}
                    onReindex={() => handleReindex(source.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showUploader && (
        <FileUploader
          agentId={agentId}
          onClose={() => setShowUploader(false)}
          onSuccess={() => {
            setShowUploader(false);
            loadSources();
          }}
        />
      )}

      {showAddModal && (
        <AddSourceModal
          agentId={agentId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSources();
          }}
        />
      )}
    </div>
  );
}
