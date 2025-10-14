import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: Repository<Project>;

  const mockProject = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'Test Description',
    userId: 'test-user-id',
    language: 'typescript',
    framework: 'nestjs',
    status: 'active',
    repositoryUrl: null,
    localPath: null,
    workspaceId: null,
    workspaceType: null,
    volumePath: null,
    volumeName: null,
    agents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repository = module.get<Repository<Project>>(getRepositoryToken(Project));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createDto = {
        name: 'Test Project',
        description: 'Test Description',
        language: 'typescript',
        framework: 'nestjs',
      };

      mockRepository.create.mockReturnValue(mockProject);
      mockRepository.save.mockResolvedValue(mockProject);

      const result = await service.create(createDto, 'test-user-id');

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        userId: 'test-user-id',
        status: 'active',
        language: 'typescript',
        agents: [],
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });

    it('should create project with minimal data', async () => {
      const createDto = {
        name: 'Minimal Project',
        language: 'javascript',
      };

      const minimalProject = {
        ...mockProject,
        name: 'Minimal Project',
        language: 'javascript',
        description: null,
        framework: null,
      };

      mockRepository.create.mockReturnValue(minimalProject);
      mockRepository.save.mockResolvedValue(minimalProject);

      const result = await service.create(createDto, 'test-user-id');

      expect(result.name).toBe('Minimal Project');
      expect(result.language).toBe('javascript');
    });

    it('should handle creation errors', async () => {
      const createDto = {
        name: 'Test Project',
        language: 'typescript',
      };

      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto, 'test-user-id')).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return all projects for a user', async () => {
      const projects = [mockProject];
      mockRepository.find.mockResolvedValue(projects);

      const result = await service.findAll('test-user-id');

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(projects);
    });

    it('should return all projects when no userId provided', async () => {
      const projects = [mockProject];
      mockRepository.find.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(projects);
    });

    it('should return empty array if no projects found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll('test-user-id');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find a project by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne('test-project-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-project-id' },
      });
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      const updatedProject = { ...mockProject, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await service.update('test-project-id', updateDto);

      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Project');
      expect(result.description).toBe('Updated Description');
    });

    it('should update project status', async () => {
      const updateDto = { status: 'archived' as const };
      const updatedProject = { ...mockProject, status: 'archived' };

      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await service.update('test-project-id', updateDto);

      expect(result.status).toBe('archived');
    });

    it('should throw NotFoundException if project not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle update errors', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update('test-project-id', { name: 'Updated' })
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove a project', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.remove.mockResolvedValue(mockProject);

      await service.remove('test-project-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-project-id' },
      });
      expect(repository.remove).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle removal errors', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.remove.mockRejectedValue(new Error('Database error'));

      await expect(service.remove('test-project-id')).rejects.toThrow();
    });
  });

});
