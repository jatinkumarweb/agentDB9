'use client';

import { FileText, Globe, Github, Trash2, RefreshCw } from 'lucide-react';

interface KnowledgeSource {
  id: string;
  type: 'pdf' | 'markdown' | 'website' | 'api' | 'github' | 'documentation';
  url?: string;
  content?: string;
  metadata: {
    title: string;
    description?: string;
    tags: string[];
    chunkCount?: number;
  };
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  lastIndexed?: Date;
  error?: string;
}

interface KnowledgeSourceCardProps {
  source: KnowledgeSource;
  onDelete: (id: string) => void;
  onReindex?: (id: string) => void;
}

export default function KnowledgeSourceCard({ 
  source, 
  onDelete,
  onReindex 
}: KnowledgeSourceCardProps) {
  const getIcon = () => {
    switch (source.type) {
      case 'pdf':
      case 'markdown':
        return <FileText className="w-5 h-5" />;
      case 'website':
      case 'documentation':
        return <Globe className="w-5 h-5" />;
      case 'github':
        return <Github className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (source.status) {
      case 'indexed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {source.metadata.title}
            </h4>
            {source.metadata.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {source.metadata.description}
              </p>
            )}
            {source.url && (
              <p className="text-xs text-blue-600 mt-1 truncate">
                {source.url}
              </p>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor()}`}>
                {source.status}
              </span>
              {source.metadata.chunkCount !== undefined && (
                <span className="text-xs text-gray-500">
                  {source.metadata.chunkCount} chunks
                </span>
              )}
            </div>
            {source.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {source.metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {source.error && (
              <p className="text-xs text-red-600 mt-2">
                Error: {source.error}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          {onReindex && source.status === 'indexed' && (
            <button
              onClick={() => onReindex(source.id)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Re-index"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            onClick={() => onDelete(source.id)}
            className="p-1 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
