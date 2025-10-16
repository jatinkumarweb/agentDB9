import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async findAll(userId?: string): Promise<Project[]> {
    const whereCondition = userId ? { userId } : {};
    return this.projectsRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async create(createProjectData: any, userId: string): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectData,
      userId: userId,
      status: 'active',
      language: createProjectData.language || 'typescript',
      agents: [],
    });
    const savedProject = await this.projectsRepository.save(project);
    return Array.isArray(savedProject) ? savedProject[0] : savedProject;
  }

  async update(id: string, updateData: any): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, updateData);
    const savedProject = await this.projectsRepository.save(project);
    return Array.isArray(savedProject) ? savedProject[0] : savedProject;
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    
    // Clean up workspace folder if it exists
    if (project.localPath) {
      try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // Only delete if it's within the workspace directory (safety check)
        const workspaceRoot = process.env.WORKSPACE_PATH || '/workspace';
        if (project.localPath.startsWith(workspaceRoot)) {
          await fs.rm(project.localPath, { recursive: true, force: true });
          console.log(`[ProjectsService] Deleted workspace folder: ${project.localPath}`);
        } else {
          console.warn(`[ProjectsService] Skipped deleting folder outside workspace: ${project.localPath}`);
        }
      } catch (error) {
        console.error(`[ProjectsService] Failed to delete workspace folder: ${error.message}`);
        // Continue with database deletion even if folder cleanup fails
      }
    }
    
    await this.projectsRepository.remove(project);
  }

  async initWorkspaceFolder(id: string): Promise<void> {
    const project = await this.findOne(id);
    
    // Create a safe folder name from project name
    // Convert to lowercase, replace spaces and special chars with hyphens
    const safeFolderName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    // Path to the shared workspace volume
    const workspaceBasePath = process.env.WORKSPACE_PATH || '/workspace';
    const projectFolderPath = path.join(workspaceBasePath, 'projects', safeFolderName);
    
    console.log(`[initWorkspaceFolder] Creating project folder at: ${projectFolderPath}`);
    console.log(`[initWorkspaceFolder] Workspace base path: ${workspaceBasePath}`);
    console.log(`[initWorkspaceFolder] Safe folder name: ${safeFolderName}`);
    
    try {
      // Create project folder if it doesn't exist
      await fs.mkdir(projectFolderPath, { recursive: true });
      console.log(`[initWorkspaceFolder] ✅ Project folder created successfully`);
      
      // Create a README for the project
      const readmePath = path.join(projectFolderPath, 'README.md');
      const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);
      
      if (!readmeExists) {
        const readmeContent = `# ${project.name}

${project.description || 'No description provided'}

## Project Details

- **Language**: ${project.language || 'Not specified'}
- **Framework**: ${project.framework || 'Not specified'}
- **Status**: ${project.status}
- **Created**: ${project.createdAt}

## Getting Started

Start coding in this project folder. All your files will be saved here.

## Structure

\`\`\`
${project.name}/
├── README.md          # This file
├── src/              # Source code
├── tests/            # Test files
└── package.json      # Dependencies (if applicable)
\`\`\`

Happy coding! 🚀
`;
        await fs.writeFile(readmePath, readmeContent);
      }
      
      // Create basic folder structure
      await fs.mkdir(path.join(projectFolderPath, 'src'), { recursive: true });
      await fs.mkdir(path.join(projectFolderPath, 'tests'), { recursive: true });
      
      // Create a .gitignore if it doesn't exist
      const gitignorePath = path.join(projectFolderPath, '.gitignore');
      const gitignoreExists = await fs.access(gitignorePath).then(() => true).catch(() => false);
      
      if (!gitignoreExists) {
        const gitignoreContent = `node_modules/
.env
.env.local
*.log
.DS_Store
dist/
build/
coverage/
.vscode/
.idea/
`;
        await fs.writeFile(gitignorePath, gitignoreContent);
      }
      
      // Create a .code-workspace file for VSCode
      const workspaceFilePath = path.join(projectFolderPath, `${safeFolderName}.code-workspace`);
      const workspaceFileExists = await fs.access(workspaceFilePath).then(() => true).catch(() => false);
      
      if (!workspaceFileExists) {
        const workspaceConfig = {
          folders: [
            {
              path: "."
            }
          ],
          settings: {}
        };
        await fs.writeFile(workspaceFilePath, JSON.stringify(workspaceConfig, null, 2));
      }
      
      // Update project with local path
      project.localPath = projectFolderPath;
      await this.projectsRepository.save(project);
      console.log(`[initWorkspaceFolder] ✅ Project localPath updated in database: ${projectFolderPath}`);
      
    } catch (error) {
      console.error(`[initWorkspaceFolder] ❌ Failed to initialize workspace folder for project ${id}:`, error);
      console.error(`[initWorkspaceFolder] Error details:`, error.message);
      console.error(`[initWorkspaceFolder] Stack:`, error.stack);
      throw error;
    }
  }
}