import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectWorkspaceService } from './project-workspace.service';
import { Project } from '../entities/project.entity';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceType } from '@agentdb9/shared';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProjectWorkspaceService', () => {
  let service: ProjectWorkspaceService;
  let projectRepository: Repository<Project>;
  let workspaceRepository: Repository<WorkspaceEntity>;

  const mockProjectRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockWorkspaceRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectWorkspaceService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: mockWorkspaceRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectWorkspaceService>(ProjectWorkspaceService);
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    workspaceRepository = module.get<Repository<WorkspaceEntity>>(
      getRepositoryToken(WorkspaceEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignProjectToWorkspace', () => {
    it('should assign project to workspace successfully', async () => {
      const projectId = 'project-1';
      const workspaceId = 'workspace-1';
      const userId = 'user-1';

      const mockProject = {
        id: projectId,
        userId,
        name: 'Test Project',
        language: 'typescript',
        status: 'active',
        agents: [],
        workspaceId: undefined,
        workspaceType: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Project;

      const mockWorkspace = {
        id: workspaceId,
        userId,
        type: WorkspaceType.VSCODE,
      } as WorkspaceEntity;

      mockProjectRepository.findOne.mockResolvedValueOnce(mockProject);
      mockWorkspaceRepository.findOne.mockResolvedValueOnce(mockWorkspace);
      mockProjectRepository.save.mockResolvedValueOnce({
        ...mockProject,
        workspaceId,
        workspaceType: WorkspaceType.VSCODE,
      });

      const result = await service.assignProjectToWorkspace(
        projectId,
        workspaceId,
      );

      expect(result.workspaceId).toBe(workspaceId);
      expect(result.workspaceType).toBe(WorkspaceType.VSCODE);
      expect(mockProjectRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if project not found', async () => {
      mockProjectRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.assignProjectToWorkspace('project-1', 'workspace-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if workspace not found', async () => {
      const mockProject = { id: 'project-1', userId: 'user-1' } as Project;
      mockProjectRepository.findOne.mockResolvedValueOnce(mockProject);
      mockWorkspaceRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.assignProjectToWorkspace('project-1', 'workspace-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user mismatch', async () => {
      const mockProject = { id: 'project-1', userId: 'user-1' } as Project;
      const mockWorkspace = {
        id: 'workspace-1',
        userId: 'user-2',
      } as WorkspaceEntity;

      mockProjectRepository.findOne.mockResolvedValueOnce(mockProject);
      mockWorkspaceRepository.findOne.mockResolvedValueOnce(mockWorkspace);

      await expect(
        service.assignProjectToWorkspace('project-1', 'workspace-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProjectsByWorkspace', () => {
    it('should return projects for workspace', async () => {
      const workspaceId = 'workspace-1';
      const mockProjects = [
        { id: 'project-1', workspaceId },
        { id: 'project-2', workspaceId },
      ] as Project[];

      mockProjectRepository.find.mockResolvedValueOnce(mockProjects);

      const result = await service.getProjectsByWorkspace(workspaceId);

      expect(result).toEqual(mockProjects);
      expect(mockProjectRepository.find).toHaveBeenCalledWith({
        where: { workspaceId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getCompatibleProjects', () => {
    it('should return compatible projects for workspace type', async () => {
      const userId = 'user-1';
      const workspaceType = WorkspaceType.VSCODE;

      const mockProjects = [
        { id: 'project-1', userId, workspaceType: WorkspaceType.VSCODE },
        { id: 'project-2', userId, workspaceType: null },
        { id: 'project-3', userId, workspaceType: WorkspaceType.SPREADSHEET },
      ] as Project[];

      mockProjectRepository.find.mockResolvedValueOnce(mockProjects);

      const result = await service.getCompatibleProjects(userId, workspaceType);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(['project-1', 'project-2']);
    });
  });

  describe('switchWorkspaceProject', () => {
    it('should switch workspace project successfully', async () => {
      const workspaceId = 'workspace-1';
      const projectId = 'project-1';
      const userId = 'user-1';

      const mockWorkspace = {
        id: workspaceId,
        userId,
        name: 'Test Workspace',
        type: WorkspaceType.VSCODE,
        status: 'active',
        config: {},
        isDefault: false,
        currentProjectId: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as WorkspaceEntity;

      const mockProject = {
        id: projectId,
        userId,
        workspaceType: WorkspaceType.VSCODE,
      } as Project;

      mockWorkspaceRepository.findOne.mockResolvedValueOnce(mockWorkspace);
      mockProjectRepository.findOne.mockResolvedValueOnce(mockProject);
      mockWorkspaceRepository.save.mockResolvedValueOnce({
        ...mockWorkspace,
        currentProjectId: projectId,
      });

      const result = await service.switchWorkspaceProject(
        workspaceId,
        projectId,
      );

      expect(result.currentProjectId).toBe(projectId);
      expect(mockWorkspaceRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if workspace type mismatch', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        userId: 'user-1',
        type: WorkspaceType.VSCODE,
      } as WorkspaceEntity;

      const mockProject = {
        id: 'project-1',
        userId: 'user-1',
        workspaceType: WorkspaceType.SPREADSHEET,
      } as Project;

      mockWorkspaceRepository.findOne.mockResolvedValueOnce(mockWorkspace);
      mockProjectRepository.findOne.mockResolvedValueOnce(mockProject);

      await expect(
        service.switchWorkspaceProject('workspace-1', 'project-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
