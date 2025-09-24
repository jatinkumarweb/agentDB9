import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectsRepository.find({
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

  async create(createProjectData: any): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectData,
      userId: 'default-user', // TODO: Get from authentication
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
}