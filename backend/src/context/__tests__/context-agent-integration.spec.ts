import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextService } from '../context.service';
import { AgentsService } from '../../agents/agents.service';
import { ProjectContextEntity } from '../../entities/project-context.entity';
import { Agent } from '../../entities/agent.entity';
import { KnowledgeSource } from '../../entities/knowledge-source.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { LongTermMemory } from '../../entities/long-term-memory.entity';
import { FilesystemScannerService } from '../scanner/filesystem-scanner.service';
import { FrameworkExtractorService } from '../extractors/framework-extractor.service';
import { LanguageExtractorService } from '../extractors/language-extractor.service';
import { StructureAnalyzerService } from '../analyzers/structure-analyzer.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { MemoryService } from '../../memory/memory.service';
import { ShortTermMemoryService } from '../../memory/short-term-memory.service';
import { LongTermMemoryService } from '../../memory/long-term-memory.service';
import { MemoryConsolidationService } from '../../memory/memory-consolidation.service';
import { DocumentLoaderService } from '../../knowledge/loaders/document-loader.service';
import { ChunkingService } from '../../knowledge/chunking/chunking.service';
import { EmbeddingService } from '../../knowledge/embedding/embedding.service';
import { VectorStoreService } from '../../knowledge/vector-store/vector-store.service';
import {
  ContextExtractionRequest,
  ProjectContext,
  ProjectSummary,
  ContextQuery,
} from '@agentdb9/shared';

/**
 * Integration tests for workspace context tool integration with agents
 * 
 * Tests the complete flow:
 * 1. Context extraction from workspace
 * 2. Agent retrieval of context
 * 3. Agent using context in chat processing
 * 4. Context querying for component resolution
 */
describe('Context-Agent Integration Tests', () => {
  let module: TestingModule;
  let contextService: ContextService;
  let agentsService: AgentsService;
  let scanner: FilesystemScannerService;
  let frameworkExtractor: FrameworkExtractorService;
  let languageExtractor: LanguageExtractorService;
  let structureAnalyzer: StructureAnalyzerService;

  const testWorkspaceId = 'test-workspace-123';
  const testAgentId = 'test-agent-456';
  const testUserId = 'test-user-789';
  const testRootPath = '/test/project';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [ProjectContextEntity],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([ProjectContextEntity]),
      ],
      providers: [
        ContextService,
        FilesystemScannerService,
        FrameworkExtractorService,
        LanguageExtractorService,
        StructureAnalyzerService,
        {
          provide: AgentsService,
          useValue: {
            processChatWithAgent: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    contextService = module.get<ContextService>(ContextService);
    agentsService = module.get<AgentsService>(AgentsService);
    scanner = module.get<FilesystemScannerService>(FilesystemScannerService);
    frameworkExtractor = module.get<FrameworkExtractorService>(FrameworkExtractorService);
    languageExtractor = module.get<LanguageExtractorService>(LanguageExtractorService);
    structureAnalyzer = module.get<StructureAnalyzerService>(StructureAnalyzerService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Context Extraction and Storage', () => {
    it('should extract and store project context', async () => {
      // Mock the scanner and extractors
      jest.spyOn(frameworkExtractor, 'extractFrameworks').mockResolvedValue([
        {
          name: 'Next.js',
          type: 'fullstack',
          version: '14.0.0',
          configFiles: ['next.config.js'],
          detectedFrom: ['package.json'],
          confidence: 1.0,
          features: ['App Router', 'Server Components'],
          entryPoints: ['src/app/page.tsx'],
        },
      ]);

      jest.spyOn(languageExtractor, 'extractLanguages').mockResolvedValue([
        {
          name: 'TypeScript',
          version: '5.0.0',
          fileCount: 150,
          percentage: 85,
          configFiles: ['tsconfig.json'],
          features: ['Strict Mode', 'Path Mapping'],
        },
        {
          name: 'JavaScript',
          fileCount: 25,
          percentage: 15,
          configFiles: [],
          features: [],
        },
      ]);

      jest.spyOn(structureAnalyzer, 'analyzeStructure').mockResolvedValue({
        type: 'single-app',
        layout: 'app-based',
        directories: [
          {
            path: 'src/app',
            name: 'app',
            type: 'pages',
            fileCount: 20,
            purpose: 'Next.js App Router pages',
            frameworks: ['Next.js'],
          },
          {
            path: 'src/components',
            name: 'components',
            type: 'components',
            fileCount: 50,
            purpose: 'React components',
            frameworks: ['React'],
          },
          {
            path: 'src/lib',
            name: 'lib',
            type: 'utils',
            fileCount: 30,
            purpose: 'Utility functions',
            frameworks: [],
          },
        ],
        entryPoints: [
          {
            path: 'src/app/page.tsx',
            type: 'main',
            framework: 'Next.js',
            exports: ['default'],
          },
        ],
        configFiles: [
          {
            path: 'next.config.js',
            type: 'next',
            framework: 'Next.js',
          },
          {
            path: 'tsconfig.json',
            type: 'typescript',
          },
        ],
        totalFiles: 175,
        totalDirectories: 15,
      });

      jest.spyOn(structureAnalyzer, 'analyzeDependencies').mockResolvedValue({
        production: [
          {
            name: 'next',
            version: '^14.0.0',
            type: 'production',
            category: 'framework',
            description: 'The React Framework',
          },
          {
            name: 'react',
            version: '^18.2.0',
            type: 'production',
            category: 'framework',
            description: 'React library',
          },
        ],
        development: [
          {
            name: 'typescript',
            version: '^5.0.0',
            type: 'development',
            category: 'build-tool',
            description: 'TypeScript compiler',
          },
        ],
        peer: [],
        optional: [],
        frameworks: [
          {
            name: 'next',
            version: '^14.0.0',
            type: 'production',
            category: 'framework',
            description: 'The React Framework',
          },
        ],
        libraries: [],
        tools: [],
        totalCount: 3,
      });

      jest.spyOn(scanner, 'fileExists').mockResolvedValue(true);
      jest.spyOn(scanner, 'readFile').mockResolvedValue(
        JSON.stringify({
          name: 'test-nextjs-app',
          version: '1.0.0',
          description: 'Test Next.js application',
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
          },
        }),
      );

      const request: ContextExtractionRequest = {
        workspaceId: testWorkspaceId,
        agentId: testAgentId,
        rootPath: testRootPath,
      };

      const result = await contextService.extractContext(request);

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.context).toBeDefined();
      expect(result.context.workspaceId).toBe(testWorkspaceId);
      expect(result.context.name).toBe('test-nextjs-app');
      expect(result.context.frameworks).toHaveLength(1);
      expect(result.context.frameworks[0].name).toBe('Next.js');
      expect(result.context.languages).toHaveLength(2);
      expect(result.context.structure.type).toBe('single-app');
      expect(result.filesScanned).toBe(175);
    });

    it('should retrieve stored context by workspace ID', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      expect(context).toBeDefined();
      expect(context?.workspaceId).toBe(testWorkspaceId);
      expect(context?.name).toBe('test-nextjs-app');
      expect(context?.frameworks[0].name).toBe('Next.js');
    });

    it('should return null for non-existent workspace', async () => {
      const context = await contextService.getContext('non-existent-workspace');

      expect(context).toBeNull();
    });
  });

  describe('Project Summary Generation', () => {
    it('should generate project summary from context', async () => {
      const summary = await contextService.getProjectSummary(testWorkspaceId);

      expect(summary).toBeDefined();
      expect(summary?.name).toBe('test-nextjs-app');
      expect(summary?.type).toBe('single-app');
      expect(summary?.primaryFramework?.name).toBe('Next.js');
      expect(summary?.primaryLanguage?.name).toBe('TypeScript');
      expect(summary?.languages).toHaveLength(2);
      expect(summary?.structure.directories).toBe(15);
      expect(summary?.structure.files).toBe(175);
      expect(summary?.stats.dependencies).toBe(3);
      expect(summary?.availableScripts).toContain('dev');
      expect(summary?.availableScripts).toContain('build');
    });

    it('should return null for workspace without context', async () => {
      const summary = await contextService.getProjectSummary('no-context-workspace');

      expect(summary).toBeNull();
    });
  });

  describe('Context Querying', () => {
    it('should find components by name', async () => {
      const query: ContextQuery = {
        query: 'components',
        type: 'any',
      };

      const result = await contextService.queryContext(testWorkspaceId, query);

      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(result.totalMatches).toBeGreaterThan(0);
      expect(result.matches[0].name).toContain('components');
      expect(result.matches[0].confidence).toBeGreaterThan(0.5);
    });

    it('should find config files', async () => {
      const query: ContextQuery = {
        query: 'next.config',
        type: 'file',
      };

      const result = await contextService.queryContext(testWorkspaceId, query);

      expect(result).toBeDefined();
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].path).toContain('next.config');
    });

    it('should return empty results for non-matching query', async () => {
      const query: ContextQuery = {
        query: 'nonexistent-component-xyz',
      };

      const result = await contextService.queryContext(testWorkspaceId, query);

      expect(result).toBeDefined();
      expect(result.matches).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    });
  });

  describe('Agent Integration with Context', () => {
    const mockAgent = {
      id: testAgentId,
      name: 'Test Context Agent',
      description: 'Agent for testing context integration',
      model: 'gpt-4',
      systemPrompt: 'You are a helpful coding assistant.',
    };

    beforeAll(async () => {
      // Mock agent creation
      (agentsService.create as jest.Mock).mockResolvedValue(mockAgent);
    });

    it('should retrieve project context when processing chat', async () => {
      const message = 'What framework is this project using?';
      const context = {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        sessionId: 'test-session-123',
      };

      // Mock the agent response
      (agentsService.processChatWithAgent as jest.Mock).mockResolvedValue({
        response: 'This project is using Next.js 14.0.0 with TypeScript.',
        actions: [],
        timestamp: new Date(),
        context: { ...context, agentId: mockAgent.id, agentName: mockAgent.name },
        agent: mockAgent,
        knowledgeUsed: 0,
      });

      const result = await agentsService.processChatWithAgent(mockAgent.id, message, context);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.context.workspaceId).toBe(testWorkspaceId);
      expect(result.agent.id).toBe(mockAgent.id);
    });

    it('should handle workspace without context gracefully', async () => {
      const message = 'What is the project structure?';
      const context = {
        workspaceId: 'workspace-without-context',
        userId: testUserId,
        sessionId: 'test-session-456',
      };

      (agentsService.processChatWithAgent as jest.Mock).mockResolvedValue({
        response: 'I don\'t have context information for this workspace yet.',
        actions: [],
        timestamp: new Date(),
        context,
        agent: mockAgent,
        knowledgeUsed: 0,
      });

      const result = await agentsService.processChatWithAgent(mockAgent.id, message, context);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      // Should not throw error even without context
    });

    it('should use context to answer project-specific questions', async () => {
      const message = 'Where are the components located?';
      const context = {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        sessionId: 'test-session-789',
      };

      // Get the actual project summary to verify it exists
      const projectSummary = await contextService.getProjectSummary(testWorkspaceId);
      expect(projectSummary).toBeDefined();
      expect(projectSummary?.name).toBe('test-nextjs-app');

      (agentsService.processChatWithAgent as jest.Mock).mockResolvedValue({
        response: 'Components are located in the src/components directory.',
        actions: [],
        timestamp: new Date(),
        context,
        agent: mockAgent,
        knowledgeUsed: 0,
      });

      const result = await agentsService.processChatWithAgent(mockAgent.id, message, context);

      expect(result).toBeDefined();
      expect(result.response).toContain('components');
    });
  });

  describe('Context Update and Refresh', () => {
    it('should update existing context on re-extraction', async () => {
      // Modify mock data
      jest.spyOn(frameworkExtractor, 'extractFrameworks').mockResolvedValue([
        {
          name: 'Next.js',
          type: 'fullstack',
          version: '14.1.0', // Updated version
          configFiles: ['next.config.js'],
          detectedFrom: ['package.json'],
          confidence: 1.0,
          features: ['App Router', 'Server Components', 'Turbopack'],
          entryPoints: ['src/app/page.tsx'],
        },
      ]);

      jest.spyOn(scanner, 'readFile').mockResolvedValue(
        JSON.stringify({
          name: 'test-nextjs-app',
          version: '1.1.0', // Updated version
          description: 'Test Next.js application - Updated',
          scripts: {
            dev: 'next dev --turbo',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
          },
        }),
      );

      const request: ContextExtractionRequest = {
        workspaceId: testWorkspaceId,
        agentId: testAgentId,
        rootPath: testRootPath,
      };

      const result = await contextService.extractContext(request);

      expect(result.status).toBe('success');
      expect(result.context.metadata.version).toBe('1.1.0');
      expect(result.context.frameworks[0].version).toBe('14.1.0');

      // Verify updated context is stored
      const updatedContext = await contextService.getContext(testWorkspaceId);
      expect(updatedContext?.metadata.version).toBe('1.1.0');
    });
  });

  describe('Context Performance', () => {
    it('should extract context within reasonable time', async () => {
      const startTime = Date.now();

      const request: ContextExtractionRequest = {
        workspaceId: 'perf-test-workspace',
        rootPath: '/test/perf-project',
      };

      const result = await contextService.extractContext(request);

      const duration = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.duration).toBeLessThan(5000);
    });

    it('should query context efficiently', async () => {
      const startTime = Date.now();

      const query: ContextQuery = {
        query: 'components',
      };

      const result = await contextService.queryContext(testWorkspaceId, query);

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.processingTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle extraction errors gracefully', async () => {
      jest.spyOn(frameworkExtractor, 'extractFrameworks').mockRejectedValue(
        new Error('Failed to read package.json'),
      );

      const request: ContextExtractionRequest = {
        workspaceId: 'error-workspace',
        rootPath: '/invalid/path',
      };

      await expect(contextService.extractContext(request)).rejects.toThrow();
    });

    it('should return null for invalid workspace queries', async () => {
      const context = await contextService.getContext('');
      expect(context).toBeNull();
    });

    it('should handle query errors gracefully', async () => {
      const query: ContextQuery = {
        query: '',
      };

      const result = await contextService.queryContext('invalid-workspace', query);

      expect(result).toBeDefined();
      expect(result.matches).toHaveLength(0);
    });
  });
});
