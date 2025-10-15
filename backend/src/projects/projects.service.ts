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
    await this.projectsRepository.remove(project);
  }

  async initWorkspaceFolder(id: string): Promise<void> {
    const project = await this.findOne(id);
    
    // Path to the shared workspace volume
    const workspaceBasePath = process.env.WORKSPACE_PATH || '/workspace';
    const projectFolderPath = path.join(workspaceBasePath, 'projects', project.id);
    
    try {
      // Create project folder if it doesn't exist
      await fs.mkdir(projectFolderPath, { recursive: true });
      
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
      
      // Update project with local path
      project.localPath = projectFolderPath;
      await this.projectsRepository.save(project);
      
    } catch (error) {
      console.error(`Failed to initialize workspace folder for project ${id}:`, error);
      throw error;
    }
  }
}