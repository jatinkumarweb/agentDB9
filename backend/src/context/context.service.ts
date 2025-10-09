import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectContext,
  ContextExtractionRequest,
  ContextExtractionResult,
  ContextQuery,
  ContextQueryResult,
  ContextMatch,
  ProjectSummary,
  ComponentMap,
} from '@agentdb9/shared';
import { ProjectContextEntity } from '../entities/project-context.entity';
import { FilesystemScannerService } from './scanner/filesystem-scanner.service';
import { FrameworkExtractorService } from './extractors/framework-extractor.service';
import { LanguageExtractorService } from './extractors/language-extractor.service';
import { StructureAnalyzerService } from './analyzers/structure-analyzer.service';
import { generateId } from '@agentdb9/shared';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(
    @InjectRepository(ProjectContextEntity)
    private contextRepository: Repository<ProjectContextEntity>,
    private scanner: FilesystemScannerService,
    private frameworkExtractor: FrameworkExtractorService,
    private languageExtractor: LanguageExtractorService,
    private structureAnalyzer: StructureAnalyzerService,
  ) {}

  /**
   * Extract project context
   */
  async extractContext(request: ContextExtractionRequest): Promise<ContextExtractionResult> {
    const startTime = Date.now();
    const errors: any[] = [];
    let filesScanned = 0;

    try {
      this.logger.log(`Extracting context for workspace: ${request.workspaceId}`);

      // Extract frameworks
      const frameworks = await this.frameworkExtractor.extractFrameworks(request.rootPath);

      // Extract languages
      const languages = await this.languageExtractor.extractLanguages(request.rootPath);

      // Analyze structure
      const structure = await this.structureAnalyzer.analyzeStructure(request.rootPath);
      filesScanned = structure.totalFiles;

      // Analyze dependencies
      const dependencies = await this.structureAnalyzer.analyzeDependencies(request.rootPath);

      // Extract metadata
      const metadata = await this.extractMetadata(request.rootPath);

      // Build component map (simplified for now)
      const componentMap: ComponentMap = {
        components: [],
        pages: [],
        apis: [],
        services: [],
        utilities: [],
        types: [],
      };

      // Create context
      const context: ProjectContext = {
        id: generateId(),
        workspaceId: request.workspaceId,
        agentId: request.agentId,
        rootPath: request.rootPath,
        name: metadata.name || 'Unknown Project',
        description: metadata.description,
        frameworks,
        languages,
        structure,
        dependencies,
        componentMap,
        metadata: {
          version: metadata.version,
          author: metadata.author,
          license: metadata.license,
          repository: metadata.repository,
          homepage: metadata.homepage,
          keywords: metadata.keywords,
          scripts: metadata.scripts,
          engines: metadata.engines,
        },
        scannedAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await this.saveContext(context);

      const duration = Date.now() - startTime;

      return {
        context,
        status: errors.length > 0 ? 'partial' : 'success',
        duration,
        filesScanned,
        errors,
        warnings: [],
      };
    } catch (error) {
      this.logger.error(`Failed to extract context: ${error.message}`);
      
      const duration = Date.now() - startTime;
      
      throw error;
    }
  }

  /**
   * Get context by workspace ID
   */
  async getContext(workspaceId: string): Promise<ProjectContext | null> {
    try {
      const entity = await this.contextRepository.findOne({
        where: { workspaceId },
      });

      if (!entity) {
        return null;
      }

      return this.entityToContext(entity);
    } catch (error) {
      this.logger.error(`Failed to get context: ${error.message}`);
      return null;
    }
  }

  /**
   * Query context for component/file resolution
   */
  async queryContext(
    workspaceId: string,
    query: ContextQuery,
  ): Promise<ContextQueryResult> {
    const startTime = Date.now();

    try {
      const context = await this.getContext(workspaceId);
      
      if (!context) {
        return {
          matches: [],
          totalMatches: 0,
          query: query.query,
          processingTime: Date.now() - startTime,
        };
      }

      const matches = this.searchContext(context, query);

      return {
        matches,
        totalMatches: matches.length,
        query: query.query,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to query context: ${error.message}`);
      return {
        matches: [],
        totalMatches: 0,
        query: query.query,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get project summary
   */
  async getProjectSummary(workspaceId: string): Promise<ProjectSummary | null> {
    try {
      const context = await this.getContext(workspaceId);
      
      if (!context) {
        return null;
      }

      const primaryFramework = context.frameworks[0];
      const primaryLanguage = context.languages[0];

      // Get major dependencies (top 10 by category)
      const majorDependencies = [
        ...context.dependencies.frameworks.slice(0, 5),
        ...context.dependencies.production
          .filter(d => d.category !== 'framework')
          .slice(0, 5),
      ];

      return {
        name: context.name,
        type: context.structure.type,
        description: context.description,
        primaryFramework,
        primaryLanguage,
        languages: context.languages,
        majorDependencies,
        structure: {
          type: context.structure.type,
          layout: context.structure.layout,
          directories: context.structure.totalDirectories,
          files: context.structure.totalFiles,
        },
        stats: {
          components: context.componentMap.components.length,
          pages: context.componentMap.pages.length,
          apis: context.componentMap.apis.length,
          services: context.componentMap.services.length,
          dependencies: context.dependencies.totalCount,
        },
        entryPoints: context.structure.entryPoints.map(e => e.path),
        availableScripts: Object.keys(context.metadata.scripts || {}),
      };
    } catch (error) {
      this.logger.error(`Failed to get project summary: ${error.message}`);
      return null;
    }
  }

  /**
   * Search context for matches
   */
  private searchContext(context: ProjectContext, query: ContextQuery): ContextMatch[] {
    const matches: ContextMatch[] = [];
    const searchTerm = query.query.toLowerCase();

    // Search in directories
    for (const dir of context.structure.directories) {
      if (dir.name.toLowerCase().includes(searchTerm)) {
        matches.push({
          type: 'file',
          name: dir.name,
          path: dir.path,
          confidence: this.calculateConfidence(dir.name, searchTerm),
          metadata: {
            type: dir.type,
            purpose: dir.purpose,
            fileCount: dir.fileCount,
          },
        });
      }
    }

    // Search in config files
    for (const config of context.structure.configFiles) {
      if (config.path.toLowerCase().includes(searchTerm)) {
        matches.push({
          type: 'file',
          name: config.path,
          path: config.path,
          confidence: this.calculateConfidence(config.path, searchTerm),
          metadata: {
            type: config.type,
            framework: config.framework,
          },
        });
      }
    }

    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate match confidence
   */
  private calculateConfidence(text: string, searchTerm: string): number {
    const lowerText = text.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();

    // Exact match
    if (lowerText === lowerSearch) {
      return 1.0;
    }

    // Starts with
    if (lowerText.startsWith(lowerSearch)) {
      return 0.9;
    }

    // Contains
    if (lowerText.includes(lowerSearch)) {
      return 0.7;
    }

    // Fuzzy match (simple)
    const distance = this.levenshteinDistance(lowerText, lowerSearch);
    const maxLength = Math.max(lowerText.length, lowerSearch.length);
    return Math.max(0, 1 - distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Extract metadata from package.json
   */
  private async extractMetadata(rootPath: string): Promise<any> {
    try {
      const packageJsonPath = `${rootPath}/package.json`;
      if (await this.scanner.fileExists(packageJsonPath)) {
        const content = await this.scanner.readFile(packageJsonPath);
        const packageJson = JSON.parse(content);

        return {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description,
          author: packageJson.author,
          license: packageJson.license,
          repository: packageJson.repository?.url || packageJson.repository,
          homepage: packageJson.homepage,
          keywords: packageJson.keywords,
          scripts: packageJson.scripts,
          engines: packageJson.engines,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to extract metadata: ${error.message}`);
    }

    return {};
  }

  /**
   * Save context to database
   */
  private async saveContext(context: ProjectContext): Promise<void> {
    try {
      // Check if context already exists
      const existing = await this.contextRepository.findOne({
        where: { workspaceId: context.workspaceId },
      });

      if (existing) {
        // Update existing
        await this.contextRepository.update(existing.id, this.contextToEntity(context));
      } else {
        // Create new
        const entity = this.contextRepository.create(this.contextToEntity(context));
        await this.contextRepository.save(entity);
      }
    } catch (error) {
      this.logger.error(`Failed to save context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert context to entity
   */
  private contextToEntity(context: ProjectContext): Partial<ProjectContextEntity> {
    return {
      id: context.id,
      workspaceId: context.workspaceId,
      agentId: context.agentId,
      rootPath: context.rootPath,
      name: context.name,
      description: context.description,
      data: JSON.stringify(context),
      scannedAt: context.scannedAt,
      updatedAt: context.updatedAt,
    };
  }

  /**
   * Convert entity to context
   */
  private entityToContext(entity: ProjectContextEntity): ProjectContext {
    return JSON.parse(entity.data);
  }
}
