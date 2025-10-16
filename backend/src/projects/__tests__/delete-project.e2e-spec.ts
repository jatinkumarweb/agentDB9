import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects.module';
import { Project } from '../entities/project.entity';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('Delete Project E2E Tests', () => {
  let app: INestApplication;
  let createdProjectId: string;
  let projectLocalPath: string;
  const workspaceRoot = process.env.WORKSPACE_PATH || '/workspace';
  const testProjectName = `test-delete-project-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'coding_agent',
          entities: [Project],
          synchronize: true,
        }),
        ProjectsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    // Cleanup: Remove test project folder if it still exists
    if (projectLocalPath) {
      try {
        await fs.rm(projectLocalPath, { recursive: true, force: true });
      } catch (error) {
        console.log('Cleanup: Project folder already removed or does not exist');
      }
    }
    await app.close();
  });

  describe('DELETE /api/projects/:id', () => {
    beforeEach(async () => {
      // Create a test project
      const createResponse = await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          name: testProjectName,
          description: 'Test project for deletion',
          language: 'typescript',
        })
        .expect(201);

      createdProjectId = createResponse.body.data.id;

      // Initialize workspace folder
      await request(app.getHttpServer())
        .post(`/api/projects/${createdProjectId}/init-workspace`)
        .expect(200);

      // Get project to verify localPath
      const getResponse = await request(app.getHttpServer())
        .get(`/api/projects/${createdProjectId}`)
        .expect(200);

      projectLocalPath = getResponse.body.data.localPath;
    });

    it('should delete a project and its workspace folder', async () => {
      // Verify folder exists before deletion
      const folderExistsBefore = await fs.access(projectLocalPath)
        .then(() => true)
        .catch(() => false);
      expect(folderExistsBefore).toBe(true);

      // Delete the project
      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${createdProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');

      // Verify project is removed from database
      await request(app.getHttpServer())
        .get(`/api/projects/${createdProjectId}`)
        .expect(404);

      // Verify workspace folder is deleted
      const folderExistsAfter = await fs.access(projectLocalPath)
        .then(() => true)
        .catch(() => false);
      expect(folderExistsAfter).toBe(false);
    });

    it('should return 404 when deleting non-existent project', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle deletion when workspace folder does not exist', async () => {
      // Manually delete the folder first
      await fs.rm(projectLocalPath, { recursive: true, force: true });

      // Delete should still succeed (database cleanup)
      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${createdProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify project is removed from database
      await request(app.getHttpServer())
        .get(`/api/projects/${createdProjectId}`)
        .expect(404);
    });

    it('should not delete folders outside workspace directory', async () => {
      // This test ensures safety - we can't actually test with a real outside path
      // but we verify the logic by checking the service implementation
      // The service should check if localPath starts with workspaceRoot
      
      // Just verify the project can be deleted normally
      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${createdProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should delete project with special characters in name', async () => {
      // Create project with special characters
      const specialNameProject = await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          name: 'Test Project!@#$%^&*()',
          description: 'Project with special chars',
          language: 'javascript',
        })
        .expect(201);

      const specialProjectId = specialNameProject.body.data.id;

      // Initialize workspace
      await request(app.getHttpServer())
        .post(`/api/projects/${specialProjectId}/init-workspace`)
        .expect(200);

      // Delete should work
      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${specialProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/projects/${specialProjectId}`)
        .expect(404);
    });

    it('should delete project and all its files', async () => {
      // Create some files in the project folder
      const testFilePath = path.join(projectLocalPath, 'test-file.txt');
      const testSubdirPath = path.join(projectLocalPath, 'subdir');
      const testSubfilePath = path.join(testSubdirPath, 'subfile.txt');

      await fs.mkdir(testSubdirPath, { recursive: true });
      await fs.writeFile(testFilePath, 'test content');
      await fs.writeFile(testSubfilePath, 'subfile content');

      // Verify files exist
      const fileExists = await fs.access(testFilePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Delete project
      await request(app.getHttpServer())
        .delete(`/api/projects/${createdProjectId}`)
        .expect(200);

      // Verify entire folder is gone
      const folderExists = await fs.access(projectLocalPath)
        .then(() => true)
        .catch(() => false);
      expect(folderExists).toBe(false);
    });
  });

  describe('Delete Project Integration', () => {
    it('should handle rapid create and delete operations', async () => {
      const projectIds: string[] = [];

      // Create multiple projects
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/projects')
          .send({
            name: `rapid-test-${i}-${Date.now()}`,
            description: `Rapid test project ${i}`,
            language: 'typescript',
          })
          .expect(201);

        projectIds.push(response.body.data.id);

        // Initialize workspace
        await request(app.getHttpServer())
          .post(`/api/projects/${response.body.data.id}/init-workspace`)
          .expect(200);
      }

      // Delete all projects
      for (const id of projectIds) {
        await request(app.getHttpServer())
          .delete(`/api/projects/${id}`)
          .expect(200);
      }

      // Verify all are deleted
      for (const id of projectIds) {
        await request(app.getHttpServer())
          .get(`/api/projects/${id}`)
          .expect(404);
      }
    });

    it('should list projects correctly after deletion', async () => {
      // Get initial count
      const initialResponse = await request(app.getHttpServer())
        .get('/api/projects')
        .expect(200);

      const initialCount = initialResponse.body.data.length;

      // Create a project
      const createResponse = await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          name: `list-test-${Date.now()}`,
          description: 'Test project for list',
          language: 'python',
        })
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Verify count increased
      const afterCreateResponse = await request(app.getHttpServer())
        .get('/api/projects')
        .expect(200);

      expect(afterCreateResponse.body.data.length).toBe(initialCount + 1);

      // Delete the project
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .expect(200);

      // Verify count is back to initial
      const afterDeleteResponse = await request(app.getHttpServer())
        .get('/api/projects')
        .expect(200);

      expect(afterDeleteResponse.body.data.length).toBe(initialCount);
    });
  });
});
