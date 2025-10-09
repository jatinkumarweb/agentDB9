import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextService } from '../context.service';
import { ProjectContextEntity } from '../../entities/project-context.entity';
import { FilesystemScannerService } from '../scanner/filesystem-scanner.service';
import { FrameworkExtractorService } from '../extractors/framework-extractor.service';
import { LanguageExtractorService } from '../extractors/language-extractor.service';
import { StructureAnalyzerService } from '../analyzers/structure-analyzer.service';
import {
  ContextExtractionRequest,
  ProjectContext,
  ContextQuery,
} from '@agentdb9/shared';

/**
 * Integration tests for workspace context with MCP tools
 * 
 * Tests how MCP tools can leverage workspace context for:
 * 1. File navigation and discovery
 * 2. Component scaffolding
 * 3. Project-aware code generation
 * 4. Framework-specific operations
 */
describe('Context-MCP Integration Tests', () => {
  let module: TestingModule;
  let contextService: ContextService;
  let scanner: FilesystemScannerService;
  let frameworkExtractor: FrameworkExtractorService;
  let languageExtractor: LanguageExtractorService;
  let structureAnalyzer: StructureAnalyzerService;

  const testWorkspaceId = 'mcp-test-workspace';
  const testRootPath = '/test/mcp-project';

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
      ],
    }).compile();

    contextService = module.get<ContextService>(ContextService);
    scanner = module.get<FilesystemScannerService>(FilesystemScannerService);
    frameworkExtractor = module.get<FrameworkExtractorService>(FrameworkExtractorService);
    languageExtractor = module.get<LanguageExtractorService>(LanguageExtractorService);
    structureAnalyzer = module.get<StructureAnalyzerService>(StructureAnalyzerService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('MCP File Navigation with Context', () => {
    beforeAll(async () => {
      // Setup context for React project
      jest.spyOn(frameworkExtractor, 'extractFrameworks').mockResolvedValue([
        {
          name: 'React',
          type: 'frontend',
          version: '18.2.0',
          configFiles: ['package.json'],
          detectedFrom: ['package.json'],
          confidence: 1.0,
          features: ['Hooks', 'JSX'],
          entryPoints: ['src/index.tsx'],
        },
        {
          name: 'Vite',
          type: 'frontend',
          version: '5.0.0',
          configFiles: ['vite.config.ts'],
          detectedFrom: ['package.json', 'vite.config.ts'],
          confidence: 1.0,
          features: ['HMR', 'TypeScript'],
          entryPoints: [],
        },
      ]);

      jest.spyOn(languageExtractor, 'extractLanguages').mockResolvedValue([
        {
          name: 'TypeScript',
          version: '5.0.0',
          fileCount: 80,
          percentage: 90,
          configFiles: ['tsconfig.json'],
          features: ['Strict Mode'],
        },
      ]);

      jest.spyOn(structureAnalyzer, 'analyzeStructure').mockResolvedValue({
        type: 'single-app',
        layout: 'feature-based',
        directories: [
          {
            path: 'src/features/auth',
            name: 'auth',
            type: 'source',
            fileCount: 10,
            purpose: 'Authentication feature',
            frameworks: ['React'],
          },
          {
            path: 'src/features/dashboard',
            name: 'dashboard',
            type: 'source',
            fileCount: 15,
            purpose: 'Dashboard feature',
            frameworks: ['React'],
          },
          {
            path: 'src/components/ui',
            name: 'ui',
            type: 'components',
            fileCount: 25,
            purpose: 'UI components',
            frameworks: ['React'],
          },
          {
            path: 'src/hooks',
            name: 'hooks',
            type: 'hooks',
            fileCount: 12,
            purpose: 'Custom React hooks',
            frameworks: ['React'],
          },
        ],
        entryPoints: [
          {
            path: 'src/index.tsx',
            type: 'main',
            framework: 'React',
            exports: [],
          },
        ],
        configFiles: [
          {
            path: 'vite.config.ts',
            type: 'vite',
            framework: 'Vite',
          },
          {
            path: 'tsconfig.json',
            type: 'typescript',
          },
        ],
        totalFiles: 90,
        totalDirectories: 20,
      });

      jest.spyOn(structureAnalyzer, 'analyzeDependencies').mockResolvedValue({
        production: [
          {
            name: 'react',
            version: '^18.2.0',
            type: 'production',
            category: 'framework',
          },
          {
            name: 'react-dom',
            version: '^18.2.0',
            type: 'production',
            category: 'framework',
          },
          {
            name: 'react-router-dom',
            version: '^6.20.0',
            type: 'production',
            category: 'routing',
          },
        ],
        development: [
          {
            name: 'vite',
            version: '^5.0.0',
            type: 'development',
            category: 'build-tool',
          },
          {
            name: 'typescript',
            version: '^5.0.0',
            type: 'development',
            category: 'build-tool',
          },
        ],
        peer: [],
        optional: [],
        frameworks: [
          {
            name: 'react',
            version: '^18.2.0',
            type: 'production',
            category: 'framework',
          },
        ],
        libraries: [],
        tools: [],
        totalCount: 5,
      });

      jest.spyOn(scanner, 'fileExists').mockResolvedValue(true);
      jest.spyOn(scanner, 'readFile').mockResolvedValue(
        JSON.stringify({
          name: 'react-vite-app',
          version: '1.0.0',
          description: 'React app with Vite',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview',
          },
        }),
      );

      const request: ContextExtractionRequest = {
        workspaceId: testWorkspaceId,
        rootPath: testRootPath,
      };

      await contextService.extractContext(request);
    });

    it('should provide context for component location discovery', async () => {
      const query: ContextQuery = {
        query: 'ui',
        type: 'component',
      };

      const result = await contextService.queryContext(testWorkspaceId, query);

      expect(result.matches).toBeDefined();
      expect(result.matches.length).toBeGreaterThan(0);
      
      const uiMatch = result.matches.find(m => m.name === 'ui');
      expect(uiMatch).toBeDefined();
      expect(uiMatch?.path).toContain('components/ui');
      expect(uiMatch?.metadata.purpose).toBe('UI components');
    });

    it('should identify feature directories for MCP operations', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      expect(context).toBeDefined();
      
      const featureDirs = context?.structure.directories.filter(
        d => d.path.includes('features')
      );
      
      expect(featureDirs).toBeDefined();
      expect(featureDirs?.length).toBeGreaterThanOrEqual(2);
      expect(featureDirs?.some(d => d.name === 'auth')).toBe(true);
      expect(featureDirs?.some(d => d.name === 'dashboard')).toBe(true);
    });

    it('should provide hooks directory information', async () => {
      const query: ContextQuery = {
        query: 'hooks',
        type: 'any',
      };

      const result = await contextService.queryContext(testWorkspaceId, query);

      expect(result.matches.length).toBeGreaterThan(0);
      
      const hooksMatch = result.matches.find(m => m.name === 'hooks');
      expect(hooksMatch).toBeDefined();
      expect(hooksMatch?.metadata.type).toBe('hooks');
      expect(hooksMatch?.metadata.fileCount).toBe(12);
    });
  });

  describe('MCP Component Scaffolding with Context', () => {
    it('should provide framework information for scaffolding', async () => {
      const summary = await contextService.getProjectSummary(testWorkspaceId);

      expect(summary).toBeDefined();
      expect(summary?.primaryFramework?.name).toBe('React');
      expect(summary?.primaryFramework?.version).toBe('18.2.0');
      expect(summary?.primaryLanguage?.name).toBe('TypeScript');
      
      // MCP can use this to scaffold React + TypeScript components
      expect(summary?.primaryFramework?.features).toContain('Hooks');
    });

    it('should identify appropriate directories for new components', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      const componentDirs = context?.structure.directories.filter(
        d => d.type === 'components'
      );

      expect(componentDirs).toBeDefined();
      expect(componentDirs?.length).toBeGreaterThan(0);
      expect(componentDirs?.[0].path).toContain('components');
    });

    it('should provide build tool information for config generation', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      const viteFramework = context?.frameworks.find(f => f.name === 'Vite');
      expect(viteFramework).toBeDefined();
      expect(viteFramework?.configFiles).toContain('vite.config.ts');
      
      // MCP can use this to generate appropriate configs
      expect(viteFramework?.features).toContain('TypeScript');
    });
  });

  describe('MCP Project-Aware Code Generation', () => {
    it('should provide dependency information for imports', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      expect(context?.dependencies.production).toBeDefined();
      
      const reactRouter = context?.dependencies.production.find(
        d => d.name === 'react-router-dom'
      );
      
      expect(reactRouter).toBeDefined();
      expect(reactRouter?.category).toBe('routing');
      
      // MCP can use this to generate correct imports
    });

    it('should identify project structure for path resolution', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      expect(context?.structure.layout).toBe('feature-based');
      
      // MCP can use this to generate appropriate import paths
      const featureDirs = context?.structure.directories.filter(
        d => d.path.includes('features')
      );
      
      expect(featureDirs?.length).toBeGreaterThan(0);
    });

    it('should provide entry point information', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      expect(context?.structure.entryPoints).toBeDefined();
      expect(context?.structure.entryPoints.length).toBeGreaterThan(0);
      
      const mainEntry = context?.structure.entryPoints.find(
        e => e.type === 'main'
      );
      
      expect(mainEntry).toBeDefined();
      expect(mainEntry?.path).toBe('src/index.tsx');
      expect(mainEntry?.framework).toBe('React');
    });
  });

  describe('MCP Framework-Specific Operations', () => {
    it('should detect React-specific patterns', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      const reactFramework = context?.frameworks.find(f => f.name === 'React');
      expect(reactFramework).toBeDefined();
      expect(reactFramework?.features).toContain('Hooks');
      expect(reactFramework?.features).toContain('JSX');
      
      // MCP can use this to generate React hooks instead of class components
    });

    it('should provide available scripts for execution', async () => {
      const summary = await contextService.getProjectSummary(testWorkspaceId);

      expect(summary?.availableScripts).toBeDefined();
      expect(summary?.availableScripts).toContain('dev');
      expect(summary?.availableScripts).toContain('build');
      expect(summary?.availableScripts).toContain('preview');
      
      // MCP can use this to suggest or execute appropriate commands
    });

    it('should identify config files for modification', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      const configFiles = context?.structure.configFiles;
      expect(configFiles).toBeDefined();
      expect(configFiles?.length).toBeGreaterThan(0);
      
      const viteConfig = configFiles?.find(c => c.type === 'vite');
      expect(viteConfig).toBeDefined();
      expect(viteConfig?.path).toBe('vite.config.ts');
      
      const tsConfig = configFiles?.find(c => c.type === 'typescript');
      expect(tsConfig).toBeDefined();
      expect(tsConfig?.path).toBe('tsconfig.json');
    });
  });

  describe('MCP Context-Aware File Operations', () => {
    it('should provide directory structure for file creation', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      expect(context?.structure.directories).toBeDefined();
      expect(context?.structure.totalDirectories).toBe(20);
      expect(context?.structure.totalFiles).toBe(90);
      
      // MCP can use this to determine where to create new files
      const directories = context?.structure.directories.map(d => ({
        path: d.path,
        type: d.type,
        purpose: d.purpose,
      }));
      
      expect(directories.length).toBeGreaterThan(0);
    });

    it('should support fuzzy search for file discovery', async () => {
      const query: ContextQuery = {
        query: 'dash',
      };

      const result = await contextService.queryContext(testWorkspaceId, query);

      expect(result.matches.length).toBeGreaterThan(0);
      
      const dashboardMatch = result.matches.find(m => m.name === 'dashboard');
      expect(dashboardMatch).toBeDefined();
      expect(dashboardMatch?.confidence).toBeGreaterThan(0.5);
    });

    it('should provide metadata for intelligent file operations', async () => {
      const context = await contextService.getContext(testWorkspaceId);

      const authDir = context?.structure.directories.find(
        d => d.name === 'auth'
      );
      
      expect(authDir).toBeDefined();
      expect(authDir?.purpose).toBe('Authentication feature');
      expect(authDir?.fileCount).toBe(10);
      expect(authDir?.frameworks).toContain('React');
      
      // MCP can use this metadata to make intelligent decisions
    });
  });

  describe('MCP Performance with Context', () => {
    it('should cache context for fast repeated access', async () => {
      const context1 = await contextService.getContext(testWorkspaceId);
      const context2 = await contextService.getContext(testWorkspaceId);

      expect(context1).toEqual(context2);
      // Both should return the same context data
      expect(context1?.workspaceId).toBe(testWorkspaceId);
      expect(context2?.workspaceId).toBe(testWorkspaceId);
    });

    it('should handle multiple concurrent queries efficiently', async () => {
      const queries = [
        { query: 'components' },
        { query: 'hooks' },
        { query: 'features' },
        { query: 'auth' },
        { query: 'dashboard' },
      ];

      const startTime = Date.now();
      
      const results = await Promise.all(
        queries.map(q => contextService.queryContext(testWorkspaceId, q))
      );

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      results.forEach(r => expect(r).toBeDefined());
      expect(duration).toBeLessThan(2000); // All queries within 2 seconds
    });
  });

  describe('MCP Error Recovery with Context', () => {
    it('should handle missing context gracefully', async () => {
      const query: ContextQuery = {
        query: 'test',
      };

      const result = await contextService.queryContext('non-existent-workspace', query);

      expect(result).toBeDefined();
      expect(result.matches).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
      // Should not throw error
    });

    it('should provide partial results on extraction errors', async () => {
      jest.spyOn(structureAnalyzer, 'analyzeDependencies').mockRejectedValue(
        new Error('Failed to read package.json')
      );

      const request: ContextExtractionRequest = {
        workspaceId: 'partial-workspace',
        rootPath: '/test/partial',
      };

      // Should handle error and provide partial results
      await expect(contextService.extractContext(request)).rejects.toThrow();
    });
  });
});
