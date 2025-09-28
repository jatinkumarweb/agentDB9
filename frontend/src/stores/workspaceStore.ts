import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WorkspaceFile {
  path: string;
  name: string;
  type: 'file' | 'directory';
  content?: string;
  lastModified?: Date;
  size?: number;
}

interface Workspace {
  id: string;
  name: string;
  path: string;
  description?: string;
}

interface WorkspaceState {
  // Current workspace
  currentWorkspace: Workspace | null;
  
  // Files
  files: WorkspaceFile[];
  openFiles: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  modifiedFiles: Set<string>;
  
  // Actions
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setFiles: (files: WorkspaceFile[]) => void;
  addFile: (file: WorkspaceFile) => void;
  removeFile: (path: string) => void;
  updateFile: (path: string, updates: Partial<WorkspaceFile>) => void;
  
  // File operations
  openFile: (file: WorkspaceFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (file: WorkspaceFile | null) => void;
  updateFileContent: (path: string, content: string) => void;
  getFileContent: (path: string) => string | undefined;
  isFileModified: (path: string) => boolean;
  markFileAsModified: (path: string) => void;
  markFileAsSaved: (path: string) => void;
  
  // Workspace operations
  refreshWorkspace: () => Promise<void>;
  saveFile: (path: string) => Promise<void>;
  saveAllFiles: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentWorkspace: null,
      files: [],
      openFiles: [],
      activeFile: null,
      modifiedFiles: new Set(),

      // Workspace actions
      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace }, false, 'setCurrentWorkspace');
      },

      setFiles: (files) => {
        set({ files }, false, 'setFiles');
      },

      addFile: (file) => {
        set((state) => ({
          files: [...state.files, file]
        }), false, 'addFile');
      },

      removeFile: (path) => {
        set((state) => ({
          files: state.files.filter(f => f.path !== path),
          openFiles: state.openFiles.filter(f => f.path !== path),
          activeFile: state.activeFile?.path === path ? null : state.activeFile
        }), false, 'removeFile');
      },

      updateFile: (path, updates) => {
        set((state) => ({
          files: state.files.map(f => 
            f.path === path ? { ...f, ...updates } : f
          ),
          openFiles: state.openFiles.map(f => 
            f.path === path ? { ...f, ...updates } : f
          )
        }), false, 'updateFile');
      },

      // File operations
      openFile: (file) => {
        set((state) => {
          const isAlreadyOpen = state.openFiles.some(f => f.path === file.path);
          
          return {
            openFiles: isAlreadyOpen ? state.openFiles : [...state.openFiles, file],
            activeFile: file
          };
        }, false, 'openFile');
      },

      closeFile: (path) => {
        set((state) => {
          const newOpenFiles = state.openFiles.filter(f => f.path !== path);
          let newActiveFile = state.activeFile;
          
          // If closing the active file, switch to another open file
          if (state.activeFile?.path === path) {
            if (newOpenFiles.length > 0) {
              // Find the index of the closed file and select the next one
              const closedIndex = state.openFiles.findIndex(f => f.path === path);
              const nextIndex = closedIndex < newOpenFiles.length ? closedIndex : newOpenFiles.length - 1;
              newActiveFile = newOpenFiles[nextIndex] || null;
            } else {
              newActiveFile = null;
            }
          }
          
          return {
            openFiles: newOpenFiles,
            activeFile: newActiveFile
          };
        }, false, 'closeFile');
      },

      setActiveFile: (file) => {
        set({ activeFile: file }, false, 'setActiveFile');
      },

      updateFileContent: (path, content) => {
        set((state) => {
          const file = state.files.find(f => f.path === path);
          const originalContent = file?.content || '';
          
          // Mark as modified if content changed
          const newModifiedFiles = new Set(state.modifiedFiles);
          if (content !== originalContent) {
            newModifiedFiles.add(path);
          } else {
            newModifiedFiles.delete(path);
          }
          
          return {
            files: state.files.map(f => 
              f.path === path ? { ...f, content } : f
            ),
            openFiles: state.openFiles.map(f => 
              f.path === path ? { ...f, content } : f
            ),
            modifiedFiles: newModifiedFiles
          };
        }, false, 'updateFileContent');
      },

      getFileContent: (path) => {
        const state = get();
        const file = state.files.find(f => f.path === path) || 
                   state.openFiles.find(f => f.path === path);
        return file?.content;
      },

      isFileModified: (path) => {
        return get().modifiedFiles.has(path);
      },

      markFileAsModified: (path) => {
        set((state) => ({
          modifiedFiles: new Set([...state.modifiedFiles, path])
        }), false, 'markFileAsModified');
      },

      markFileAsSaved: (path) => {
        set((state) => {
          const newModifiedFiles = new Set(state.modifiedFiles);
          newModifiedFiles.delete(path);
          return { modifiedFiles: newModifiedFiles };
        }, false, 'markFileAsSaved');
      },

      // Async operations
      refreshWorkspace: async () => {
        const state = get();
        if (!state.currentWorkspace) return;

        try {
          // This would call the MCP server to get workspace files
          const response = await fetch('/api/workspace/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              path: state.currentWorkspace.path 
            })
          });
          
          if (response.ok) {
            const files = await response.json();
            set({ files }, false, 'refreshWorkspace');
          }
        } catch (error) {
          console.error('Failed to refresh workspace:', error);
        }
      },

      saveFile: async (path) => {
        const state = get();
        const file = state.files.find(f => f.path === path) || 
                    state.openFiles.find(f => f.path === path);
        
        if (!file || !file.content) return;

        try {
          // This would call the MCP server to save the file
          const response = await fetch('/api/workspace/save-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              path: file.path,
              content: file.content 
            })
          });
          
          if (response.ok) {
            get().markFileAsSaved(path);
          }
        } catch (error) {
          console.error('Failed to save file:', error);
        }
      },

      saveAllFiles: async () => {
        const state = get();
        const savePromises = Array.from(state.modifiedFiles).map(path => 
          get().saveFile(path)
        );
        
        await Promise.all(savePromises);
      }
    }),
    {
      name: 'workspace-store'
    }
  )
);