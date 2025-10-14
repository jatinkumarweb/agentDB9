import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspacesService } from './workspaces.service';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceContainerService } from './workspace-container.service';
import { DockerVolumeService } from './docker-volume.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let repository: Repository<Workspace>;
  let containerService: WorkspaceContainerService;
  let volumeService: DockerVolumeService;

  const mockWorkspace = {
    id: 'test-workspace-id',
    userId: 'test-user-id',
    projectId: 'test-project-id',
    type: 'vscode',
    status: 'running',
    containerId: 'test-container-id',
    port: 8080,
    volumeName: 'test-volume',
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

  const mockContainerService = {
    createContainer: jest.fn(),
    startContainer: jest.fn(),
    stopContainer: jest.fn(),
    removeContainer: jest.fn(),
    getContainerStatus: jest.fn(),
  };

  const mockVolumeService = {
    createVolume: jest.fn(),
    removeVolume: jest.fn(),
    volumeExists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: getRepositoryToken(Workspace),
          useValue: mockRepository,
        },
        {
          provide: WorkspaceContainerService,
          useValue: mockContainerService,
        },
        {
          provide: DockerVolumeService,
          useValue: mockVolumeService,
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    repository = module.get<Repository<Workspace>>(getRepositoryToken(Workspace));
    containerService = module.get<WorkspaceContainerService>(WorkspaceContainerService);
    volumeService = module.get<DockerVolumeService>(DockerVolumeService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new workspace', async () => {
      const createDto = {
        userId: 'test-user-id',
        projectId: 'test-project-id',
        type: 'vscode' as const,
      };

      mockVolumeService.createVolume.mockResolvedValue('test-volume');
      mockContainerService.createContainer.mockResolvedValue({
        containerId: 'test-container-id',
        port: 8080,
      });
      mockRepository.create.mockReturnValue(mockWorkspace);
      mockRepository.save.mockResolvedValue(mockWorkspace);

      const result = await service.create(createDto);

      expect(volumeService.createVolume).toHaveBeenCalled();
      expect(containerService.createContainer).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockWorkspace);
    });

    it('should handle creation errors', async () => {
      const createDto = {
        userId: 'test-user-id',
        projectId: 'test-project-id',
        type: 'vscode' as const,
      };

      mockVolumeService.createVolume.mockRejectedValue(new Error('Volume creation failed'));

      await expect(service.create(createDto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should find a workspace by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkspace);

      const result = await service.findOne('test-workspace-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-workspace-id' },
      });
      expect(result).toEqual(mockWorkspace);
    });

    it('should return null if workspace not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('should find all workspaces for a user', async () => {
      const workspaces = [mockWorkspace];
      mockRepository.find.mockResolvedValue(workspaces);

      const result = await service.findByUser('test-user-id');

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
      });
      expect(result).toEqual(workspaces);
    });
  });

  describe('update', () => {
    it('should update a workspace', async () => {
      const updateDto = { status: 'stopped' as const };
      const updatedWorkspace = { ...mockWorkspace, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockWorkspace);
      mockRepository.save.mockResolvedValue(updatedWorkspace);

      const result = await service.update('test-workspace-id', updateDto);

      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toBe('stopped');
    });

    it('should throw error if workspace not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { status: 'stopped' })
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove a workspace and cleanup resources', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkspace);
      mockContainerService.stopContainer.mockResolvedValue(undefined);
      mockContainerService.removeContainer.mockResolvedValue(undefined);
      mockVolumeService.removeVolume.mockResolvedValue(undefined);
      mockRepository.remove.mockResolvedValue(mockWorkspace);

      await service.remove('test-workspace-id');

      expect(containerService.stopContainer).toHaveBeenCalledWith('test-container-id');
      expect(containerService.removeContainer).toHaveBeenCalledWith('test-container-id');
      expect(volumeService.removeVolume).toHaveBeenCalledWith('test-volume');
      expect(repository.remove).toHaveBeenCalled();
    });

    it('should throw error if workspace not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkspace);
      mockContainerService.stopContainer.mockRejectedValue(new Error('Container not found'));
      mockRepository.remove.mockResolvedValue(mockWorkspace);

      // Should not throw, just log the error
      await service.remove('test-workspace-id');

      expect(repository.remove).toHaveBeenCalled();
    });
  });
});
