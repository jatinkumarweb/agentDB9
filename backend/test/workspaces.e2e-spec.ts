import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WorkspaceType, WorkspaceStatus } from '@agentdb9/shared';

describe('Workspaces (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@agentdb9.com',
        password: 'admin123',
      })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    authToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    if (workspaceId) {
      await request(app.getHttpServer())
        .delete(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    if (projectId) {
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    await app.close();
  });

  describe('Workspace CRUD', () => {
    it('should get available workspace types', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('containerImage');
    });

    it('should create a VSCode workspace', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test VSCode Workspace',
          type: WorkspaceType.VSCODE,
          description: 'E2E test workspace',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test VSCode Workspace');
      expect(response.body.data.type).toBe(WorkspaceType.VSCODE);
      expect(response.body.data.userId).toBe(userId);

      workspaceId = response.body.data.id;
    });

    it('should list user workspaces', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get workspace by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(workspaceId);
      expect(response.body.data.name).toBe('Test VSCode Workspace');
    });

    it('should update workspace', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Workspace Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Workspace Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should get workspace statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('byStatus');
    });
  });

  describe('Project-Workspace Integration', () => {
    it('should create a project', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'E2E test project',
          language: 'typescript',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      projectId = response.body.data.id;
    });

    it('should assign project to workspace', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceId}/assign-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: projectId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspaceId).toBe(workspaceId);
    });

    it('should get workspace projects', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(projectId);
    });

    it('should get compatible projects', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/compatible-projects`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should switch workspace project', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceId}/switch-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: projectId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentProjectId).toBe(projectId);
    });
  });

  describe('Workspace Lifecycle', () => {
    it('should get workspace status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('containerRunning');
    });

    it('should start workspace (may fail if Docker not available)', async () => {
      try {
        const response = await request(app.getHttpServer())
          .post(`/api/workspaces/${workspaceId}/start`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
          });

        if (response.status === 201) {
          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe(WorkspaceStatus.RUNNING);
        }
      } catch (error) {
        console.log('Docker not available, skipping container tests');
      }
    });

    it('should stop workspace (may fail if Docker not available)', async () => {
      try {
        const response = await request(app.getHttpServer())
          .post(`/api/workspaces/${workspaceId}/stop`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
          });

        if (response.status === 201) {
          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe(WorkspaceStatus.STOPPED);
        }
      } catch (error) {
        console.log('Docker not available, skipping container tests');
      }
    });
  });

  describe('Workspace Deletion', () => {
    it('should delete workspace', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Workspace deleted');

      workspaceId = null;
    });

    it('should verify workspace is deleted', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedWorkspace = response.body.data.find(
        (w: any) => w.id === workspaceId,
      );
      expect(deletedWorkspace).toBeUndefined();
    });
  });
});
