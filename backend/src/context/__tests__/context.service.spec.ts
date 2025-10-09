import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextService } from '../context.service';
import { ProjectContextEntity } from '../../entities/project-context.entity';
import { FilesystemScannerService } from '../scanner/filesystem-scanner.service';
import { FrameworkExtractorService } from '../extractors/framework-extractor.service';
import { LanguageExtractorService } from '../extractors/language-extractor.service';
import { StructureAnalyzerService } from '../analyzers/structure-analyzer.service';

describe('ContextService', () => {
  let service: ContextService;
  let contextRepository: Repository<ProjectContextEntity>;
  let scanner: FilesystemScannerService;
  let frameworkExtractor: FrameworkExtractorService;
  let languageExtractor: LanguageExtractorService;
  let structureAnalyzer: StructureAnalyzerService;

  const mockContextRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockScanner = {
    scanDirectory: jest.fn(),
    findFiles: jest.fn(),
    readFile: jest.fn(),
    fileExists: jest.fn(),
  };

  const mockFrameworkExtractor = {
    extractFrameworks: jest.fn(),
  };

  const mockLanguageExtractor = {
    extractLanguages: jest.fn(),
  };

  const mockStructureAnalyzer = {
    analyzeStructure: jest.fn(),
    analyzeDependencies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextService,
        {
          provide: getRepositoryToken(ProjectContextEntity),
          useValue: mockContextRepository,
        },
        {
          provide: FilesystemScannerService,
          useValue: mockScanner,
        },
        {
          provide: FrameworkExtractorService,
          useValue: mockFrameworkExtractor,
        },
        {
          provide: LanguageExtractorService,
          useValue: mockLanguageExtractor,
        },
        {
          provide: StructureAnalyzerService,
          useValue: mockStructureAnalyzer,
        },
      ],
    }).compile();

    service = module.get<ContextService>(ContextService);
    contextRepository = module.get<Repository<ProjectContextEntity>>(
      getRepositoryToken(ProjectContextEntity),
    );
    scanner = module.get<FilesystemScannerService>(FilesystemScannerService);
    frameworkExtractor = module.get<FrameworkExtractorService>(FrameworkExtractorService);
    languageExtractor = module.get<LanguageExtractorService>(LanguageExtractorService);
    structureAnalyzer = module.get<StructureAnalyzerService>(StructureAnalyzerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractContext', () => {
    it('should extract project context successfully', async () => {
      const request = {
        workspaceId: 'workspace-1',
        rootPath: '/test/project',
      };

      const mockFrameworks = [
        {
          name: 'Next.js',
          type: 'fullstack' as const,
          version: '13.0.0',
          configFiles: ['next.config.js'],
          detectedFrom: ['package.json'],
          confidence: 1.0,
          features: [],
          entryPoints: [],
        },
      ];

      const mockLanguages = [
        {
          name: 'TypeScript',
          fileCount: 50,
          percentage: 80,
          configFiles: ['tsconfig.json'],
          features: ['Static Typing'],
        },
      ];

      const mockStructure = {
        type: 'single-app' as const,
        layout: 'src-based' as const,
        directories: [],
        entryPoints: [],
        configFiles: [],
        totalFiles: 100,
        totalDirectories: 10,
      };

      const mockDependencies = {
        production: [],
        development: [],
        peer: [],
        optional: [],
        frameworks: [],
        libraries: [],
        tools: [],
        totalCount: 0,
      };

      mockFrameworkExtractor.extractFrameworks.mockResolvedValue(mockFrameworks);
      mockLanguageExtractor.extractLanguages.mockResolvedValue(mockLanguages);
      mockStructureAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);
      mockStructureAnalyzer.analyzeDependencies.mockResolvedValue(mockDependencies);
      mockScanner.fileExists.mockResolvedValue(true);
      mockScanner.readFile.mockResolvedValue(
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          description: 'Test project',
        }),
      );
      mockContextRepository.findOne.mockResolvedValue(null);
      mockContextRepository.create.mockReturnValue({});
      mockContextRepository.save.mockResolvedValue({});

      const result = await service.extractContext(request);

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.context.name).toBe('test-project');
      expect(result.context.frameworks).toEqual(mockFrameworks);
      expect(result.context.languages).toEqual(mockLanguages);
      expect(mockFrameworkExtractor.extractFrameworks).toHaveBeenCalled();
      expect(mockLanguageExtractor.extractLanguages).toHaveBeenCalled();
      expect(mockStructureAnalyzer.analyzeStructure).toHaveBeenCalled();
    });
  });

  describe('getProjectSummary', () => {
    it('should return project summary', async () => {
      const mockContext = {
        id: 'ctx-1',
        workspaceId: 'workspace-1',
        rootPath: '/test/project',
        name: 'Test Project',
        description: 'A test project',
        frameworks: [
          {
            name: 'Next.js',
            type: 'fullstack' as const,
            version: '13.0.0',
            configFiles: [],
            detectedFrom: [],
            confidence: 1.0,
            features: [],
            entryPoints: [],
          },
        ],
        languages: [
          {
            name: 'TypeScript',
            fileCount: 50,
            percentage: 80,
            configFiles: [],
            features: [],
          },
        ],
        structure: {
          type: 'single-app' as const,
          layout: 'src-based' as const,
          directories: [],
          entryPoints: [{ path: 'src/index.ts', type: 'main' as const }],
          configFiles: [],
          totalFiles: 100,
          totalDirectories: 10,
        },
        dependencies: {
          production: [],
          development: [],
          peer: [],
          optional: [],
          frameworks: [],
          libraries: [],
          tools: [],
          totalCount: 10,
        },
        componentMap: {
          components: [],
          pages: [],
          apis: [],
          services: [],
          utilities: [],
          types: [],
        },
        metadata: {
          scripts: { dev: 'next dev', build: 'next build' },
        },
        scannedAt: new Date(),
        updatedAt: new Date(),
      };

      mockContextRepository.findOne.mockResolvedValue({
        id: 'ctx-1',
        workspaceId: 'workspace-1',
        data: JSON.stringify(mockContext),
      });

      const summary = await service.getProjectSummary('workspace-1');

      expect(summary).toBeDefined();
      expect(summary?.name).toBe('Test Project');
      expect(summary?.primaryFramework?.name).toBe('Next.js');
      expect(summary?.primaryLanguage?.name).toBe('TypeScript');
      expect(summary?.availableScripts).toContain('dev');
      expect(summary?.availableScripts).toContain('build');
    });

    it('should return null for non-existent workspace', async () => {
      mockContextRepository.findOne.mockResolvedValue(null);

      const summary = await service.getProjectSummary('non-existent');

      expect(summary).toBeNull();
    });
  });

  describe('queryContext', () => {
    it('should find matches in context', async () => {
      const mockContext = {
        id: 'ctx-1',
        workspaceId: 'workspace-1',
        rootPath: '/test/project',
        name: 'Test Project',
        frameworks: [],
        languages: [],
        structure: {
          type: 'single-app' as const,
          layout: 'src-based' as const,
          directories: [
            {
              path: 'src/components',
              name: 'components',
              type: 'components' as const,
              fileCount: 10,
              purpose: 'UI components',
              frameworks: [],
            },
          ],
          entryPoints: [],
          configFiles: [],
          totalFiles: 100,
          totalDirectories: 10,
        },
        dependencies: {
          production: [],
          development: [],
          peer: [],
          optional: [],
          frameworks: [],
          libraries: [],
          tools: [],
          totalCount: 0,
        },
        componentMap: {
          components: [],
          pages: [],
          apis: [],
          services: [],
          utilities: [],
          types: [],
        },
        metadata: {},
        scannedAt: new Date(),
        updatedAt: new Date(),
      };

      mockContextRepository.findOne.mockResolvedValue({
        id: 'ctx-1',
        workspaceId: 'workspace-1',
        data: JSON.stringify(mockContext),
      });

      const result = await service.queryContext('workspace-1', {
        query: 'components',
      });

      expect(result).toBeDefined();
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].name).toBe('components');
    });
  });
});
