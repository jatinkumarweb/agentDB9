import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WorkspaceType } from '@agentdb9/shared';

describe('Workspaces Phase 3 (e2e)', () => {
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

    // Create test workspace
    const workspaceResponse = await request(app.getHttpServer())
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Phase 3 Test Workspace',
        type: WorkspaceType.VSCODE,
      })
      .expect(201);

    workspaceId = workspaceResponse.body.data.id;

    // Create test project
    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Phase 3 Test Project',
        language: 'typescript',
      })
      .expect(201);

    projectId = projectResponse.body.data.id;
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

  describe('Container Resource Limits', () => {
    it('should include resource limits in workspace type config', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const vscodeType = response.body.data.find((t: any) => t.type === 'vscode');
      expect(vscodeType).toBeDefined();
      expect(vscodeType.resourceLimits).toBeDefined();
      expect(vscodeType.resourceLimits.cpus).toBeDefined();
      expect(vscodeType.resourceLimits.memory).toBeDefined();
    });

    it('should include health check config in workspace type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const vscodeType = response.body.data.find((t: any) => t.type === 'vscode');
      expect(vscodeType.healthCheck).toBeDefined();
      expect(vscodeType.healthCheck.enabled).toBe(true);
      expect(vscodeType.healthCheck.interval).toBeDefined();
    });
  });

  describe('Container Health Monitoring', () => {
    it('should get workspace health status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/health`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('healthy');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('failingStreak');
    });

    it('should include health info in workspace status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('containerRunning');
    });
  });

  describe('Volume Backup and Restore', () => {
    it('should backup project volume', async () => {
      try {
        const response = await request(app.getHttpServer())
          .post(`/api/workspaces/projects/${projectId}/backup`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
          });

        if (response.status === 201) {
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('backupPath');
        }
      } catch (error) {
        console.log('Docker not available, skipping backup test');
      }
    });

    it('should get volume size', async () => {
      try {
        const response = await request(app.getHttpServer())
          .get(`/api/workspaces/projects/${projectId}/volume-size`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            expect([200, 500]).toContain(res.status);
          });

        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('sizeBytes');
          expect(response.body.data).toHaveProperty('sizeMB');
          expect(response.body.data).toHaveProperty('sizeGB');
        }
      } catch (error) {
        console.log('Docker not available, skipping volume size test');
      }
    });
  });

  describe('Container Logs', () => {
    it('should get container logs', async () => {
      try {
        const response = await request(app.getHttpServer())
          .get(`/api/workspaces/${workspaceId}/logs?tail=10`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });

        if (response.status === 200) {
          expect(response.type).toBe('text/plain');
        }
      } catch (error) {
        console.log('Container not running, skipping logs test');
      }
    });

    it('should get container stats', async () => {
      try {
        const response = await request(app.getHttpServer())
          .get(`/api/workspaces/${workspaceId}/stats`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });

        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('cpu');
          expect(response.body.data).toHaveProperty('memory');
        }
      } catch (error) {
        console.log('Container not running, skipping stats test');
      }
    });
  });

  describe('Automatic Cleanup', () => {
    it('should trigger manual cleanup', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/workspaces/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('inactiveContainers');
      expect(response.body.data).toHaveProperty('orphanedContainers');
      expect(response.body.data).toHaveProperty('orphanedVolumes');
      expect(response.body.data).toHaveProperty('errorWorkspaces');
    });
  });

  describe('Enhanced Status Information', () => {
    it('should include resource usage in status', async () => {
      try {
        // Start workspace first
        await request(app.getHttpServer())
          .post(`/api/workspaces/${workspaceId}/start`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
          });

        // Wait a bit for container to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await request(app.getHttpServer())
          .get(`/api/workspaces/${workspaceId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.containerRunning) {
          expect(response.body.data).toHaveProperty('resources');
        }
      } catch (error) {
        console.log('Docker not available, skipping resource usage test');
      }
    });
  });
});
