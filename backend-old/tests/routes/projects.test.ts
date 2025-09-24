import request from 'supertest';
import express from 'express';
import projectsRouter from '../../src/routes/projects';
import { Project, CreateProjectRequest } from '@agentdb9/shared';

const app = express();
app.use(express.json());
app.use('/api/projects', projectsRouter);

describe('Projects API', () => {
  let createdProjectId: string;

  describe('POST /api/projects', () => {
    it('should create a new project with valid data', async () => {
      const projectData: CreateProjectRequest = {
        name: 'Test Project',
        description: 'A test project for API testing',
        language: 'typescript',
        framework: 'next',
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: projectData.name,
        description: projectData.description,
        language: projectData.language,
        framework: projectData.framework,
        status: 'active',
        userId: 'default-user',
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.localPath).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
      expect(response.body.data.agents).toBeInstanceOf(Array);

      createdProjectId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        description: 'Missing name and language',
      };

      const response = await request(app)
        .post('/api/projects')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should create project with repository URL', async () => {
      const projectData = {
        name: 'GitHub Project',
        description: 'Project from GitHub',
        language: 'javascript',
        repositoryUrl: 'https://github.com/user/repo.git',
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositoryUrl).toBe(projectData.repositoryUrl);
    });
  });

  describe('GET /api/projects', () => {
    it('should return list of projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const project = response.body.data[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('language');
      expect(project).toHaveProperty('status');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return specific project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdProjectId);
      expect(response.body.data.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project with valid data', async () => {
      const updateData = {
        name: 'Updated Test Project',
        description: 'Updated description',
        framework: 'react',
      };

      const response = await request(app)
        .put(`/api/projects/${createdProjectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.framework).toBe(updateData.framework);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .put('/api/projects/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Project Files API', () => {
    describe('GET /api/projects/:id/files', () => {
      it('should return empty files list for new project', async () => {
        const response = await request(app)
          .get(`/api/projects/${createdProjectId}/files`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(0);
      });
    });

    describe('PUT /api/projects/:id/files/*', () => {
      it('should create a new file', async () => {
        const fileContent = {
          content: 'console.log("Hello, World!");',
        };

        const response = await request(app)
          .put(`/api/projects/${createdProjectId}/files/src/index.js`)
          .send(fileContent)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          path: 'src/index.js',
          content: fileContent.content,
          language: 'javascript',
          size: fileContent.content.length,
        });
        expect(response.body.data.lastModified).toBeDefined();
      });

      it('should update existing file', async () => {
        const updatedContent = {
          content: 'console.log("Hello, Updated World!");',
        };

        const response = await request(app)
          .put(`/api/projects/${createdProjectId}/files/src/index.js`)
          .send(updatedContent)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBe(updatedContent.content);
        expect(response.body.data.size).toBe(updatedContent.content.length);
      });

      it('should return 400 for missing content', async () => {
        const response = await request(app)
          .put(`/api/projects/${createdProjectId}/files/src/empty.js`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Content');
      });

      it('should return 404 for non-existent project', async () => {
        const response = await request(app)
          .put('/api/projects/non-existent-id/files/test.js')
          .send({ content: 'test' })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/projects/:id/files/*', () => {
      it('should return specific file content', async () => {
        const response = await request(app)
          .get(`/api/projects/${createdProjectId}/files/src/index.js`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.path).toBe('src/index.js');
        expect(response.body.data.content).toContain('Hello, Updated World!');
      });

      it('should return 404 for non-existent file', async () => {
        const response = await request(app)
          .get(`/api/projects/${createdProjectId}/files/non-existent.js`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not found');
      });
    });

    describe('DELETE /api/projects/:id/files/*', () => {
      it('should delete a file', async () => {
        const response = await request(app)
          .delete(`/api/projects/${createdProjectId}/files/src/index.js`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify file is deleted
        await request(app)
          .get(`/api/projects/${createdProjectId}/files/src/index.js`)
          .expect(404);
      });

      it('should return 404 for non-existent file', async () => {
        const response = await request(app)
          .delete(`/api/projects/${createdProjectId}/files/non-existent.js`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/projects/:id/files after operations', () => {
      it('should return updated files list', async () => {
        // Create a few files
        await request(app)
          .put(`/api/projects/${createdProjectId}/files/package.json`)
          .send({ content: '{"name": "test"}' });

        await request(app)
          .put(`/api/projects/${createdProjectId}/files/README.md`)
          .send({ content: '# Test Project' });

        const response = await request(app)
          .get(`/api/projects/${createdProjectId}/files`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(2);
        
        const filePaths = response.body.data.map((file: any) => file.path);
        expect(filePaths).toContain('package.json');
        expect(filePaths).toContain('README.md');
      });
    });
  });

  describe('Project Templates', () => {
    it('should create project from template', async () => {
      const projectData = {
        name: 'Next.js Template Project',
        description: 'Project from Next.js template',
        language: 'typescript',
        framework: 'next',
        template: 'next-typescript',
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      const projectId = response.body.data.id;
      
      // Check if template files were created
      const filesResponse = await request(app)
        .get(`/api/projects/${projectId}/files`)
        .expect(200);

      expect(filesResponse.body.data.length).toBeGreaterThan(0);
      
      const filePaths = filesResponse.body.data.map((file: any) => file.path);
      expect(filePaths).toContain('package.json');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${createdProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify project is deleted
      await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .expect(404);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .delete('/api/projects/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});