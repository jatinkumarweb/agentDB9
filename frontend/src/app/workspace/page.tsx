'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VSCodeContainer from '@/components/VSCodeContainer';
import CollaborationPanel from '@/components/CollaborationPanel';
import { AgentActivityProvider } from '@/contexts/AgentActivityContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Code, Table, BookOpen, Database, Palette, Settings, BarChart3, FolderOpen, MessageSquare, X, Plus, FolderPlus } from 'lucide-react';
import GradientColorPicker from '@/components/dev/GradientColorPicker';
import { cn } from '@/utils/cn';

interface WorkspaceState {
  id: string | null;
  type: string | null;
  projectId: string | null;
}

export default function WorkspacePage() {
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    id: null,
    type: null,
    projectId: null,
  });
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(true);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/workspace');
    }
  }, [isLoading, isAuthenticated, router]);

  // Load workspace state and selected project from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('workspace-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setWorkspaceState(parsed);
        if (parsed.type) {
          setShowWorkspaceSelector(false);
        }
      } catch (e) {
        console.error('Failed to parse workspace state:', e);
      }
    }
  }, []);

  // Fetch projects and restore selected project when workspace state has projectId
  useEffect(() => {
    if (workspaceState.projectId && projects.length === 0) {
      fetchProjects();
    }
  }, [workspaceState.projectId]);

  // Set selected project when projects are loaded and projectId exists
  useEffect(() => {
    if (workspaceState.projectId && projects.length > 0 && !selectedProject) {
      const project = projects.find(p => p.id === workspaceState.projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projects, workspaceState.projectId, selectedProject]);

  // Save workspace state to localStorage
  useEffect(() => {
    if (workspaceState.type) {
      localStorage.setItem('workspace-state', JSON.stringify(workspaceState));
    }
  }, [workspaceState]);

  // Fetch projects when workspace type is selected
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      // Get token from auth-storage (zustand persist)
      const authState = localStorage.getItem('auth-storage');
      let token = null;
      if (authState) {
        const parsed = JSON.parse(authState);
        token = parsed.state?.token || null;
      }
      
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      } else {
        console.error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Reset workspace when switching types
  const handleWorkspaceTypeSelect = async (typeId: string) => {
    try {
      // Get token from auth-storage
      const authState = localStorage.getItem('auth-storage');
      let token = null;
      if (authState) {
        const parsed = JSON.parse(authState);
        token = parsed.state?.token || null;
      }
      
      // Create workspace in backend
      console.log('Creating workspace of type:', typeId);
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: typeId,
          projectId: null,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Workspace created:', data.data);
        
        const newState = {
          id: data.data.id, // Use actual backend workspace ID
          type: typeId,
          projectId: null,
        };
        setWorkspaceState(newState);
        setShowWorkspaceSelector(false);
        setShowProjectSelector(true);
        fetchProjects();
      } else {
        console.error('Failed to create workspace:', response.status);
        // Fallback to client-side ID for now
        const newState = {
          id: `${typeId}-${Date.now()}`,
          type: typeId,
          projectId: null,
        };
        setWorkspaceState(newState);
        setShowWorkspaceSelector(false);
        setShowProjectSelector(true);
        fetchProjects();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      // Fallback to client-side ID
      const newState = {
        id: `${typeId}-${Date.now()}`,
        type: typeId,
        projectId: null,
      };
      setWorkspaceState(newState);
      setShowWorkspaceSelector(false);
      setShowProjectSelector(true);
      fetchProjects();
    }
  };

  // Handle project selection
  const handleProjectSelect = async (projectId: string | null) => {
    const project = projectId ? projects.find(p => p.id === projectId) : null;
    setShowProjectSelector(false);
    
    // Initialize project folder in workspace if needed
    if (projectId && project) {
      try {
        console.log('Initializing project folder for:', project.name);
        
        // Get token from auth-storage
        const authState = localStorage.getItem('auth-storage');
        let token = null;
        if (authState) {
          const parsed = JSON.parse(authState);
          token = parsed.state?.token || null;
        }
        
        // Call backend API to initialize project folder
        const response = await fetch(`/api/projects/${projectId}/init-workspace`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          console.log('Project folder initialized successfully');
          // Small delay to ensure filesystem sync
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('Failed to initialize project folder:', response.status);
        }
      } catch (error) {
        console.error('Error initializing project folder:', error);
      }
    }
    
    // Update state after folder is initialized
    // This ensures VSCode opens the folder only after it exists
    setSelectedProject(project);
    setWorkspaceState(prev => ({
      ...prev,
      projectId,
    }));
  };

  // Handle create project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setCreatingProject(true);
    try {
      // Get token from auth-storage (zustand persist)
      const authState = localStorage.getItem('auth-storage');
      let token = null;
      if (authState) {
        const parsed = JSON.parse(authState);
        token = parsed.state?.token || null;
      }
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          language: 'typescript', // Default
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        await fetchProjects();
        setShowCreateProject(false);
        setNewProjectName('');
        setNewProjectDescription('');
        handleProjectSelect(data.data.id);
      } else {
        console.error(`Failed to create project: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
        alert(`Failed to create project: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setCreatingProject(false);
    }
  };

  // Handle workspace switch
  const handleWorkspaceSwitch = () => {
    setWorkspaceState({
      id: null,
      type: null,
      projectId: null,
    });
    setShowWorkspaceSelector(true);
    setIsCollaborationOpen(false);
    localStorage.removeItem('workspace-state');
  };

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

  const workspaceTypes = [
    { id: 'vscode', name: 'VS Code', icon: Code, color: 'from-blue-500 to-cyan-500', available: true },
    { id: 'spreadsheet', name: 'Spreadsheet', icon: Table, color: 'from-green-500 to-emerald-500', available: true },
    { id: 'notebook', name: 'Notebook', icon: BookOpen, color: 'from-orange-500 to-amber-500', available: false },
    { id: 'database', name: 'Database', icon: Database, color: 'from-purple-500 to-pink-500', available: false },
    { id: 'design', name: 'Design', icon: Palette, color: 'from-rose-500 to-red-500', available: false },
  ];

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

          {/* User info header - only show when workspace is active */}
          {!showWorkspaceSelector && !showProjectSelector && workspaceState.type && (
            <>
              <div className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-xl rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-3 py-2 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {user?.username || user?.email}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <button
                    onClick={handleWorkspaceSwitch}
                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    <span className="font-medium">
                      {workspaceTypes.find(w => w.id === workspaceState.type)?.name || 'Workspace'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>Switch</span>
                  </button>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <button
                    onClick={() => {
                      setShowProjectSelector(true);
                      fetchProjects();
                    }}
                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span className="font-medium">
                      {selectedProject ? selectedProject.name : 'No Project'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>Change</span>
                  </button>
                </div>
              </div>

              {/* Workspace Type Badge and Chat Toggle */}
              <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
                <button
                  onClick={() => setIsCollaborationOpen(!isCollaborationOpen)}
                  className={`bg-white/80 backdrop-blur-xl rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-3 py-2 border border-white/20 transition-all ${
                    isCollaborationOpen ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Chat</span>
                  </div>
                </button>
                
                <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-3 py-2 border border-white/20">
                  <div className="flex items-center space-x-2">
                    {workspaceState.type === 'vscode' && <Code className="w-4 h-4 text-blue-600" />}
                    {workspaceState.type === 'spreadsheet' && <Table className="w-4 h-4 text-green-600" />}
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {workspaceState.type}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Create Project Modal */}
          {showCreateProject && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/20 p-8 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Create Project
                  </h2>
                  <button
                    onClick={() => setShowCreateProject(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="My Awesome Project"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="What's this project about?"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowCreateProject(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim() || creatingProject}
                      className="flex-1 px-4 py-2 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingProject ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Create Project'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Selector Modal */}
          {showProjectSelector && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/20 p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Select Project
                    </h2>
                    <p className="text-gray-600 mt-1">Choose a project to work on</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowCreateProject(true)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Project</span>
                    </button>
                    <button
                      onClick={() => setShowProjectSelector(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {loadingProjects ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* No Project Option */}
                    <button
                      onClick={() => handleProjectSelect(null)}
                      className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all bg-white text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <Code className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">No Project</h3>
                          <p className="text-sm text-gray-600">Start with an empty workspace</p>
                        </div>
                      </div>
                    </button>

                    {/* Project List */}
                    {projects.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>No projects found</p>
                        <button
                          onClick={() => router.push('/projects')}
                          className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Create a project →
                        </button>
                      </div>
                    ) : (
                      projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project.id)}
                          className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all bg-white text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                              <FolderOpen className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{project.name}</h3>
                              <p className="text-sm text-gray-600">{project.description || 'No description'}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowProjectSelector(false);
                      handleWorkspaceSwitch();
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ← Back to Workspace Selection
                  </button>
                  <button
                    onClick={() => handleProjectSelect(null)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Skip for now →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Selector Overlay */}
          {showWorkspaceSelector && (
            <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/20 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Select Workspace Type
                    </h2>
                    <p className="text-gray-600 mt-1">Choose your development environment</p>
                  </div>
                  <button
                    onClick={() => router.push('/workspace/manage')}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Manage</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {workspaceTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          if (type.available) {
                            handleWorkspaceTypeSelect(type.id);
                          }
                        }}
                        disabled={!type.available}
                        className={`relative group p-6 rounded-xl border-2 transition-all duration-300 ${
                          type.available
                            ? 'border-gray-200 hover:border-indigo-300 hover:shadow-lg cursor-pointer bg-white'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 ${
                          type.available ? 'group-hover:scale-110' : ''
                        } transition-transform`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{type.name}</h3>
                        <p className="text-sm text-gray-600">
                          {type.available ? 'Ready to use' : 'Coming soon'}
                        </p>
                        {!type.available && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-gray-200 rounded text-xs font-medium text-gray-600">
                            Soon
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ← Back to Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/workspace/manage')}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>View Analytics</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Only render workspace container when a type is selected */}
          {!showWorkspaceSelector && workspaceState.type && (
            <div className="relative z-10 h-full">
              {workspaceState.type === 'vscode' && (
                <div className={cn(
                  "h-full transition-all duration-300 rounded-2xl overflow-hidden",
                  "bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/20",
                  "m-4",
                  isCollaborationOpen ? 'mr-[400px]' : 'mr-4'
                )}>
                  <VSCodeContainer 
                    key={`workspace-${workspaceState.id || 'new'}-${workspaceState.projectId || 'no-project'}`}
                    className="h-full"
                    showHeader={true}
                    allowPopout={true}
                    workspaceId={workspaceState.id}
                    projectId={workspaceState.projectId}
                    projectName={selectedProject?.name || null}
                  />
                </div>
              )}
              
              {workspaceState.type === 'spreadsheet' && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Table className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Spreadsheet Workspace</h3>
                    <p className="text-gray-600">Coming soon...</p>
                  </div>
                </div>
              )}
              
              <div className={cn(
                "fixed right-0 top-0 h-full transition-all duration-300 z-30",
                isCollaborationOpen ? "w-96" : "w-0"
              )}>
                <div className="h-full bg-white/90 backdrop-blur-xl border-l border-white/20 shadow-[-8px_0_32px_rgba(0,0,0,0.08)]">
                  <CollaborationPanel
                    isOpen={isCollaborationOpen}
                    onToggle={() => setIsCollaborationOpen(!isCollaborationOpen)}
                  />
                </div>
              </div>
            </div>
          )}

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