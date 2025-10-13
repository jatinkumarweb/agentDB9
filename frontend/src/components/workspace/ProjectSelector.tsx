'use client';

import { useState, useEffect } from 'react';
import { WorkspaceType } from '@agentdb9/shared';

interface Project {
  id: string;
  name: string;
  description?: string;
  language: string;
  workspaceId?: string;
  workspaceType?: string;
  createdAt: string;
}

interface ProjectSelectorProps {
  workspaceId: string;
  workspaceType: WorkspaceType;
  onSelect: (project: Project) => void;
  onBack: () => void;
  currentProjectId?: string;
}

export function ProjectSelector({ 
  workspaceId, 
  workspaceType, 
  onSelect, 
  onBack,
  currentProjectId 
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchCompatibleProjects();
  }, [workspaceId]);

  const fetchCompatibleProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/workspaces/${workspaceId}/compatible-projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (project: Project) => {
    if (project.id === currentProjectId) {
      onSelect(project);
      return;
    }

    try {
      setSwitching(true);
      const token = localStorage.getItem('auth-token');
      
      // Switch project in workspace
      const response = await fetch(`/api/workspaces/${workspaceId}/switch-project`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch project');
      }

      onSelect(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch project');
    } finally {
      setSwitching(false);
    }
  };

  const getLanguageIcon = (language: string) => {
    const icons: Record<string, string> = {
      'typescript': '🔷',
      'javascript': '🟨',
      'python': '🐍',
      'go': '🔵',
      'rust': '🦀',
      'java': '☕',
      'cpp': '⚙️',
    };
    return icons[language.toLowerCase()] || '📄';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error && !switching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-center">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Error Loading Projects</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={fetchCompatibleProjects}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Workspaces
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Project</h1>
            <p className="text-gray-600">Choose a project for this workspace</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-md text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Compatible Projects</h3>
            <p className="text-gray-600 mb-6">
              Create a project compatible with {workspaceType} workspace
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => !switching && handleSelectProject(project)}
                className={`bg-white p-6 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                  currentProjectId === project.id ? 'ring-2 ring-blue-600' : ''
                } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{getLanguageIcon(project.language)}</div>
                  {currentProjectId === project.id && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 rounded">{project.language}</span>
                  {project.workspaceId && project.workspaceId !== workspaceId && (
                    <span className="text-orange-600">In use</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {switching && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Switching project...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
