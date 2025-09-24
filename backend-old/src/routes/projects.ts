// Project management routes
import { Router } from 'express';
import { 
  Project, 
  CreateProjectRequest, 
  ProjectFile,
  APIResponse,
  ProjectStatus
} from '@agentdb9/shared';

const router = Router();

// In-memory storage for now (replace with database later)
const projects = new Map<string, Project>();
const projectFiles = new Map<string, ProjectFile[]>();

// Create a new project
router.post('/', async (req, res) => {
  try {
    const request: CreateProjectRequest = req.body;
    
    // Validate request
    if (!request.name || !request.language) {
      return res.status(400).json({
        success: false,
        error: 'Name and language are required'
      } as APIResponse);
    }

    const project: Project = {
      id: generateId(),
      name: request.name,
      description: request.description,
      userId: 'default-user', // TODO: Get from auth
      repositoryUrl: request.repositoryUrl,
      localPath: `/workspace/projects/${request.name.toLowerCase().replace(/\s+/g, '-')}`,
      framework: request.framework,
      language: request.language,
      status: 'active',
      agents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    projects.set(project.id, project);
    projectFiles.set(project.id, []);

    // Create initial project structure if template is specified
    if (request.template) {
      await createProjectFromTemplate(project, request.template);
    }

    res.status(201).json({
      success: true,
      data: project
    } as APIResponse<Project>);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get all projects for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default-user';
    const userProjects = Array.from(projects.values()).filter(project => project.userId === userId);
    
    res.json({
      success: true,
      data: userProjects
    } as APIResponse<Project[]>);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get a specific project
router.get('/:id', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as APIResponse);
    }

    res.json({
      success: true,
      data: project
    } as APIResponse<Project>);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as APIResponse);
    }

    const request: Partial<CreateProjectRequest> = req.body;
    
    const updatedProject: Project = {
      ...project,
      name: request.name || project.name,
      description: request.description !== undefined ? request.description : project.description,
      repositoryUrl: request.repositoryUrl !== undefined ? request.repositoryUrl : project.repositoryUrl,
      framework: request.framework !== undefined ? request.framework : project.framework,
      language: request.language || project.language,
      updatedAt: new Date()
    };

    projects.set(project.id, updatedProject);

    res.json({
      success: true,
      data: updatedProject
    } as APIResponse<Project>);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as APIResponse);
    }

    projects.delete(req.params.id);
    projectFiles.delete(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    } as APIResponse);
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get project files
router.get('/:id/files', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as APIResponse);
    }

    const files = projectFiles.get(req.params.id) || [];
    
    res.json({
      success: true,
      data: files
    } as APIResponse<ProjectFile[]>);
  } catch (error) {
    console.error('Get project files error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get a specific file
router.get('/:id/files/*', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as APIResponse);
    }

    const filePath = (req.params as any)['0']; // Get the wildcard path
    const files = projectFiles.get(req.params.id) || [];
    const file = files.find(f => f.path === filePath);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      } as APIResponse);
    }

    res.json({
      success: true,
      data: file
    } as APIResponse<ProjectFile>);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Create or update a file
router.put('/:id/files/*', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as APIResponse);
    }

    const filePath = (req.params as any)['0'];
    const { content } = req.body;
    
    if (typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content must be a string'
      } as APIResponse);
    }

    const files = projectFiles.get(req.params.id) || [];
    const existingFileIndex = files.findIndex(f => f.path === filePath);
    
    const language = getLanguageFromPath(filePath);
    
    if (existingFileIndex >= 0) {
      // Update existing file
      files[existingFileIndex] = {
        ...files[existingFileIndex],
        content,
        language,
        size: content.length,
        lastModified: new Date()
      };
    } else {
      // Create new file
      const newFile: ProjectFile = {
        path: filePath,
        content,
        language,
        size: content.length,
        lastModified: new Date()
      };
      files.push(newFile);
    }
    
    projectFiles.set(req.params.id, files);
    
    const file = files.find(f => f.path === filePath)!;
    
    res.json({
      success: true,
      data: file
    } as APIResponse<ProjectFile>);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Delete a file
router.delete('/:id/files/*', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as APIResponse);
    }

    const filePath = (req.params as any)['0'];
    const files = projectFiles.get(req.params.id) || [];
    const fileIndex = files.findIndex(f => f.path === filePath);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      } as APIResponse);
    }

    files.splice(fileIndex, 1);
    projectFiles.set(req.params.id, files);

    res.json({
      success: true,
      message: 'File deleted successfully'
    } as APIResponse);
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'zsh',
    'fish': 'fish'
  };
  
  return languageMap[extension || ''] || 'text';
}

async function createProjectFromTemplate(project: Project, template: string): Promise<void> {
  // Mock template creation - replace with actual template system
  const files: ProjectFile[] = [];
  
  if (template === 'next-typescript') {
    files.push(
      {
        path: 'package.json',
        content: JSON.stringify({
          name: project.name.toLowerCase().replace(/\s+/g, '-'),
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
          },
          dependencies: {
            next: '^14.0.0',
            react: '^18.0.0',
            'react-dom': '^18.0.0'
          },
          devDependencies: {
            '@types/node': '^20.0.0',
            '@types/react': '^18.0.0',
            '@types/react-dom': '^18.0.0',
            typescript: '^5.0.0'
          }
        }, null, 2),
        language: 'json',
        size: 0, // Will be calculated
        lastModified: new Date()
      },
      {
        path: 'src/app/page.tsx',
        content: `export default function Home() {
  return (
    <main>
      <h1>Welcome to ${project.name}</h1>
      <p>This is a Next.js TypeScript project created by AgentDB9.</p>
    </main>
  );
}`,
        language: 'typescript',
        size: 0, // Will be calculated
        lastModified: new Date()
      },
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${project.name}',
  description: '${project.description || 'Generated by AgentDB9'}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
        language: 'typescript',
        size: 0, // Will be calculated
        lastModified: new Date()
      }
    );
  }
  
  projectFiles.set(project.id, files);
}

export default router;