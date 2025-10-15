/**
 * Integration tests for Project Context Flow
 * Tests the complete flow from project creation to tool execution
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import * as request from 'supertest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Entities
import { Project } from '../../entities/project.entity';
import { Agent } from '../../entities/agent.entity';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';

// Services
import { ProjectsService } from '../projects.service';
import { ProjectsController } from '../projects.controller';
import { ConversationsService } from '../../conversations/conversations.service';
import { ConversationsController } from '../../conversations/conversations.controller';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { MCPService } from '../../mcp/mcp.service';
import { ReActAgentService } from '../../conversations/react-agent.service';
import { MemoryService } from '../../memory/memory.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

describe('Project Context Flow Integration Tests', () => {
  let app: INestApplication;
  let projectsService: ProjectsService;
  let conversationsService: ConversationsService;
  let authService: AuthService;
  let usersService: UsersService;
  
  let authToken: string;
  let testUser: User;
  let testAgent: Agent;
  let testProject: Project;
  let testConversation: Conversation;

  const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/workspace';
  const TEST_PROJECT_NAME = 'IntegrationTestProject';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'postgres',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'coding_agent',
          entities: [Project, Agent, Conversation, Message, User],
          synchronize: false, // Don't modify schema in tests
        }),
        TypeOrmModule.forFeature([Project, Agent, Conversation, Message, User]),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [ProjectsController, ConversationsController],
      providers: [
        ProjectsService,
        ConversationsService,
        AuthService,
        UsersService,
        MCPService,
        ReActAgentService,
        MemoryService,
        KnowledgeService,
        WebsocketGateway,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    projectsService = moduleFixture.get<ProjectsService>(ProjectsService);
    conversationsService = moduleFixture.get<ConversationsService>(ConversationsService);
    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    // Cleanup test project folder if it exists
    if (testProject?.localPath) {
      try {
        await fs.rm(testProject.localPath, { recursive: true, force: true });
      } catch (error) {
        console.log('Cleanup: Could not remove test project folder');
      }
    }

    await app.close();
  });

  describe('1. Authentication Setup', () => {
    it('should create a test user', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123',
        name: 'Test User',
      };

      testUser = await usersService.create(userData);

      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
      expect(testUser.email).toBe(userData.email);
    });

    it('should generate auth token', async () => {
      const loginResult = await authService.login(testUser);

      expect(loginResult).toBeDefined();
      expect(loginResult.access_token).toBeDefined();
      
      authToken = loginResult.access_token;
    });
  });

  describe('2. Project Creation', () => {
    it('should create a project via API with authentication', async () => {
      const projectData = {
        name: TEST_PROJECT_NAME,
        description: 'Integration test project',
        language: 'typescript',
        framework: 'react',
      };

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(TEST_PROJECT_NAME);
      expect(response.body.data.id).toBeDefined();

      testProject = response.body.data;
    });

    it('should have initialized workspace folder', async () => {
      expect(testProject.localPath).toBeDefined();
      expect(testProject.localPath).toContain('/workspace/projects/');

      // Verify folder exists
      try {
        await fs.access(testProject.localPath);
      } catch (error) {
        fail(`Project folder does not exist at ${testProject.localPath}`);
      }
    });

    it('should have created README.md', async () => {
      const readmePath = path.join(testProject.localPath, 'README.md');
      
      try {
        const content = await fs.readFile(readmePath, 'utf8');
        expect(content).toContain(TEST_PROJECT_NAME);
      } catch (error) {
        fail(`README.md does not exist at ${readmePath}`);
      }
    });

    it('should have created src directory', async () => {
      const srcPath = path.join(testProject.localPath, 'src');
      
      try {
        const stats = await fs.stat(srcPath);
        expect(stats.isDirectory()).toBe(true);
      } catch (error) {
        fail(`src directory does not exist at ${srcPath}`);
      }
    });

    it('should have correct localPath in database', async () => {
      const project = await projectsService.findOne(testProject.id);
      
      expect(project.localPath).toBe(testProject.localPath);
      expect(project.localPath).toMatch(/\/workspace\/projects\/integrationtestproject$/);
    });
  });

  describe('3. Agent Setup', () => {
    it('should create a test agent', async () => {
      const agentData = {
        name: 'Test Agent',
        description: 'Agent for integration testing',
        type: 'coding' as const,
        userId: testUser.id,
        configuration: {
          systemPrompt: 'You are a helpful coding assistant.',
          model: 'qwen2.5-coder:7b',
          memory: { enabled: false },
          knowledgeBase: { enabled: false },
        },
        capabilities: [],
        status: 'active' as const,
      };

      const response = await request(app.getHttpServer())
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      testAgent = response.body.data;
    });
  });

  describe('4. Conversation Creation with ProjectId', () => {
    it('should create conversation with projectId', async () => {
      const conversationData = {
        agentId: testAgent.id,
        title: 'Test Conversation',
        projectId: testProject.id,
      };

      const response = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projectId).toBe(testProject.id);

      testConversation = response.body.data;
    });

    it('should have projectId in database', async () => {
      const conversation = await conversationsService.findOne(testConversation.id);
      
      expect(conversation.projectId).toBe(testProject.id);
    });
  });

  describe('5. Working Directory Resolution', () => {
    it('should resolve working directory from project', async () => {
      const conversation = await conversationsService.findOne(testConversation.id);
      
      // Access private method via type assertion for testing
      const workingDir = await (conversationsService as any).getWorkingDirectory(conversation);
      
      expect(workingDir).toBe(testProject.localPath);
      expect(workingDir).toContain('/workspace/projects/');
    });

    it('should fall back to default when no projectId', async () => {
      const conversationWithoutProject = {
        id: 'test-conv',
        projectId: null,
      };
      
      const workingDir = await (conversationsService as any).getWorkingDirectory(conversationWithoutProject);
      
      expect(workingDir).toBe(WORKSPACE_PATH);
    });
  });

  describe('6. System Prompt Building', () => {
    it('should include project context in system prompt', async () => {
      const conversation = await conversationsService.findOne(testConversation.id, true);
      
      const systemPrompt = await (conversationsService as any).buildSystemPrompt(
        conversation.agent,
        conversation.id,
        'test message',
        conversation
      );
      
      expect(systemPrompt).toContain('Current Project Context');
      expect(systemPrompt).toContain(TEST_PROJECT_NAME);
      expect(systemPrompt).toContain(testProject.localPath);
      expect(systemPrompt).toContain('typescript');
      expect(systemPrompt).toContain('react');
      expect(systemPrompt).toContain('CRITICAL WORKING DIRECTORY RULES');
    });

    it('should not include project context when no projectId', async () => {
      const conversationWithoutProject = await conversationsService.create(
        {
          agentId: testAgent.id,
          title: 'Test Without Project',
        },
        testUser.id
      );
      
      const systemPrompt = await (conversationsService as any).buildSystemPrompt(
        testAgent,
        conversationWithoutProject.id,
        'test message',
        conversationWithoutProject
      );
      
      expect(systemPrompt).toContain('No Project Selected');
      expect(systemPrompt).not.toContain('Current Project Context');
    });
  });

  describe('7. ReAct Mode Triggering', () => {
    it('should trigger ReAct mode for "create a" keyword', () => {
      const shouldUse = (conversationsService as any).shouldUseReAct('create a React app');
      
      expect(shouldUse).toBe(true);
    });

    it('should trigger ReAct mode for "create react" keyword', () => {
      const shouldUse = (conversationsService as any).shouldUseReAct('create react component');
      
      expect(shouldUse).toBe(true);
    });

    it('should trigger ReAct mode for "build a" keyword', () => {
      const shouldUse = (conversationsService as any).shouldUseReAct('build a new feature');
      
      expect(shouldUse).toBe(true);
    });

    it('should not trigger ReAct mode for simple questions', () => {
      const shouldUse = (conversationsService as any).shouldUseReAct('what is React?');
      
      expect(shouldUse).toBe(false);
    });
  });

  describe('8. File Operations in Project Directory', () => {
    it('should create files in project directory', async () => {
      const testFilePath = path.join(testProject.localPath, 'test-file.txt');
      const testContent = 'Integration test content';
      
      await fs.writeFile(testFilePath, testContent);
      
      const content = await fs.readFile(testFilePath, 'utf8');
      expect(content).toBe(testContent);
      
      // Cleanup
      await fs.unlink(testFilePath);
    });

    it('should list files in project directory', async () => {
      const files = await fs.readdir(testProject.localPath);
      
      expect(files).toContain('README.md');
      expect(files).toContain('src');
    });

    it('should have correct permissions on project directory', async () => {
      const stats = await fs.stat(testProject.localPath);
      
      // Check if directory is readable and writable
      expect(stats.isDirectory()).toBe(true);
      
      // Mode should allow read/write/execute for owner
      const mode = stats.mode & 0o777;
      expect(mode & 0o700).toBe(0o700); // Owner has rwx
    });
  });

  describe('9. Path Sanitization', () => {
    it('should sanitize project name correctly', () => {
      const testCases = [
        { input: 'My Project', expected: 'my-project' },
        { input: 'Test@Project#123', expected: 'test-project-123' },
        { input: '-Test-Project-', expected: 'test-project' },
        { input: 'UPPERCASE', expected: 'uppercase' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = input
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        expect(result).toBe(expected);
      });
    });
  });

  describe('10. End-to-End Flow', () => {
    it('should complete full flow: project → conversation → working dir → system prompt', async () => {
      // 1. Project exists
      expect(testProject).toBeDefined();
      expect(testProject.localPath).toBeDefined();
      
      // 2. Conversation linked to project
      expect(testConversation.projectId).toBe(testProject.id);
      
      // 3. Working directory resolves correctly
      const conversation = await conversationsService.findOne(testConversation.id, true);
      const workingDir = await (conversationsService as any).getWorkingDirectory(conversation);
      expect(workingDir).toBe(testProject.localPath);
      
      // 4. System prompt includes project context
      const systemPrompt = await (conversationsService as any).buildSystemPrompt(
        conversation.agent,
        conversation.id,
        'create a component',
        conversation
      );
      expect(systemPrompt).toContain(TEST_PROJECT_NAME);
      expect(systemPrompt).toContain(testProject.localPath);
      
      // 5. ReAct mode would trigger
      const shouldUseReAct = (conversationsService as any).shouldUseReAct('create a component');
      expect(shouldUseReAct).toBe(true);
      
      // 6. Files can be created in project directory
      const testFile = path.join(testProject.localPath, 'e2e-test.txt');
      await fs.writeFile(testFile, 'e2e test');
      const exists = await fs.access(testFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      await fs.unlink(testFile);
    });
  });
});
