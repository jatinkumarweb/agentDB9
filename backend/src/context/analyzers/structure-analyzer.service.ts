import { Injectable, Logger } from '@nestjs/common';
import {
  ProjectStructureInfo,
  ProjectType,
  ProjectLayout,
  EntryPoint,
  ConfigFile,
  DependencyInfo,
  PackageDependency,
  DependencyType,
  DependencyCategory,
} from '@agentdb9/shared';
import { FilesystemScannerService } from '../scanner/filesystem-scanner.service';
import * as path from 'path';

@Injectable()
export class StructureAnalyzerService {
  private readonly logger = new Logger(StructureAnalyzerService.name);

  constructor(private readonly scanner: FilesystemScannerService) {}

  /**
   * Analyze project structure
   */
  async analyzeStructure(rootPath: string): Promise<ProjectStructureInfo> {
    try {
      // Scan directory structure
      const scanResult = await this.scanner.scanDirectory(rootPath, {
        maxDepth: 10,
        maxFiles: 10000,
      });

      // Determine project type
      const projectType = await this.determineProjectType(rootPath, scanResult.directories);

      // Determine project layout
      const projectLayout = this.determineProjectLayout(scanResult.directories);

      // Find entry points
      const entryPoints = await this.findEntryPoints(rootPath);

      // Find config files
      const configFiles = await this.findConfigFiles(rootPath);

      return {
        type: projectType,
        layout: projectLayout,
        directories: scanResult.directories,
        entryPoints,
        configFiles,
        totalFiles: scanResult.totalFiles,
        totalDirectories: scanResult.totalDirectories,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze structure: ${error.message}`);
      throw error;
    }
  }

  /**
   * Determine project type
   */
  private async determineProjectType(
    rootPath: string,
    directories: any[],
  ): Promise<ProjectType> {
    // Check for monorepo indicators
    const hasWorkspaces = await this.hasWorkspaces(rootPath);
    const hasLerna = await this.scanner.fileExists(path.join(rootPath, 'lerna.json'));
    const hasNx = await this.scanner.fileExists(path.join(rootPath, 'nx.json'));
    const hasPnpmWorkspace = await this.scanner.fileExists(
      path.join(rootPath, 'pnpm-workspace.yaml'),
    );

    if (hasWorkspaces || hasLerna || hasNx || hasPnpmWorkspace) {
      return 'monorepo';
    }

    // Check for library indicators
    const packageJsonPath = path.join(rootPath, 'package.json');
    if (await this.scanner.fileExists(packageJsonPath)) {
      try {
        const content = await this.scanner.readFile(packageJsonPath);
        const packageJson = JSON.parse(content);

        if (packageJson.main || packageJson.module || packageJson.exports) {
          if (!packageJson.dependencies?.react && !packageJson.dependencies?.vue) {
            return 'library';
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to parse package.json: ${error.message}`);
      }
    }

    // Check for multiple packages
    const packagesDir = directories.find(d => d.name === 'packages');
    if (packagesDir && packagesDir.fileCount > 0) {
      return 'multi-package';
    }

    return 'single-app';
  }

  /**
   * Check if project has workspaces
   */
  private async hasWorkspaces(rootPath: string): Promise<boolean> {
    const packageJsonPath = path.join(rootPath, 'package.json');
    if (await this.scanner.fileExists(packageJsonPath)) {
      try {
        const content = await this.scanner.readFile(packageJsonPath);
        const packageJson = JSON.parse(content);
        return !!packageJson.workspaces;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Determine project layout
   */
  private determineProjectLayout(directories: any[]): ProjectLayout {
    const dirNames = directories.map(d => d.name.toLowerCase());

    // Check for Next.js app directory
    if (dirNames.includes('app') && directories.some(d => d.name === 'app' && d.type === 'pages')) {
      return 'app-based';
    }

    // Check for pages directory
    if (dirNames.includes('pages')) {
      return 'pages-based';
    }

    // Check for src directory
    if (dirNames.includes('src')) {
      return 'src-based';
    }

    // Check for feature-based structure
    const hasFeatures = directories.some(
      d => d.name.toLowerCase().includes('feature') || d.name.toLowerCase().includes('module'),
    );
    if (hasFeatures) {
      return 'feature-based';
    }

    // Check for domain-based structure
    const hasDomains = directories.some(d => d.name.toLowerCase().includes('domain'));
    if (hasDomains) {
      return 'domain-based';
    }

    // Check if flat structure
    if (directories.length < 5) {
      return 'flat';
    }

    return 'custom';
  }

  /**
   * Find entry points
   */
  private async findEntryPoints(rootPath: string): Promise<EntryPoint[]> {
    const entryPoints: EntryPoint[] = [];

    const commonEntryPoints = [
      { path: 'src/main.ts', type: 'main' as const },
      { path: 'src/index.ts', type: 'main' as const },
      { path: 'src/index.tsx', type: 'main' as const },
      { path: 'src/server.ts', type: 'server' as const },
      { path: 'src/app.ts', type: 'main' as const },
      { path: 'index.ts', type: 'main' as const },
      { path: 'index.js', type: 'main' as const },
      { path: 'main.ts', type: 'main' as const },
      { path: 'server.ts', type: 'server' as const },
      { path: 'pages/_app.tsx', type: 'client' as const, framework: 'Next.js' },
      { path: 'pages/_app.js', type: 'client' as const, framework: 'Next.js' },
      { path: 'app/layout.tsx', type: 'client' as const, framework: 'Next.js' },
      { path: 'app/page.tsx', type: 'client' as const, framework: 'Next.js' },
    ];

    for (const entry of commonEntryPoints) {
      const fullPath = path.join(rootPath, entry.path);
      if (await this.scanner.fileExists(fullPath)) {
        entryPoints.push({
          path: entry.path,
          type: entry.type,
          framework: entry.framework,
        });
      }
    }

    return entryPoints;
  }

  /**
   * Find configuration files
   */
  private async findConfigFiles(rootPath: string): Promise<ConfigFile[]> {
    const configFiles: ConfigFile[] = [];

    const commonConfigs: Array<{ path: string; type: any; framework?: string }> = [
      { path: 'package.json', type: 'package' },
      { path: 'tsconfig.json', type: 'typescript' },
      { path: '.babelrc', type: 'babel' },
      { path: 'babel.config.js', type: 'babel' },
      { path: 'webpack.config.js', type: 'webpack' },
      { path: 'vite.config.ts', type: 'vite' },
      { path: 'vite.config.js', type: 'vite' },
      { path: 'next.config.js', type: 'next', framework: 'Next.js' },
      { path: 'next.config.mjs', type: 'next', framework: 'Next.js' },
      { path: 'nest-cli.json', type: 'nest', framework: 'NestJS' },
      { path: '.eslintrc.js', type: 'eslint' },
      { path: '.eslintrc.json', type: 'eslint' },
      { path: '.prettierrc', type: 'prettier' },
      { path: 'prettier.config.js', type: 'prettier' },
      { path: 'jest.config.js', type: 'jest' },
      { path: 'jest.config.ts', type: 'jest' },
      { path: 'Dockerfile', type: 'docker' },
      { path: 'docker-compose.yml', type: 'docker' },
      { path: '.env', type: 'env' },
      { path: '.env.local', type: 'env' },
    ];

    for (const config of commonConfigs) {
      const fullPath = path.join(rootPath, config.path);
      if (await this.scanner.fileExists(fullPath)) {
        configFiles.push({
          path: config.path,
          type: config.type,
          framework: config.framework,
        });
      }
    }

    return configFiles;
  }

  /**
   * Analyze dependencies
   */
  async analyzeDependencies(rootPath: string): Promise<DependencyInfo> {
    const packageJsonPath = path.join(rootPath, 'package.json');
    
    if (!(await this.scanner.fileExists(packageJsonPath))) {
      return this.getEmptyDependencyInfo();
    }

    try {
      const content = await this.scanner.readFile(packageJsonPath);
      const packageJson = JSON.parse(content);

      const production = this.parseDependencies(
        packageJson.dependencies || {},
        'production',
      );
      const development = this.parseDependencies(
        packageJson.devDependencies || {},
        'development',
      );
      const peer = this.parseDependencies(packageJson.peerDependencies || {}, 'peer');
      const optional = this.parseDependencies(
        packageJson.optionalDependencies || {},
        'optional',
      );

      const allDeps = [...production, ...development, ...peer, ...optional];

      return {
        production,
        development,
        peer,
        optional,
        frameworks: allDeps.filter(d => d.category === 'framework'),
        libraries: allDeps.filter(d => d.category && d.category !== 'framework'),
        tools: development.filter(d => d.category === 'build-tool' || d.category === 'linting'),
        totalCount: allDeps.length,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze dependencies: ${error.message}`);
      return this.getEmptyDependencyInfo();
    }
  }

  /**
   * Parse dependencies
   */
  private parseDependencies(
    deps: Record<string, string>,
    type: DependencyType,
  ): PackageDependency[] {
    return Object.entries(deps).map(([name, version]) => ({
      name,
      version,
      type,
      category: this.categorizeDependency(name),
    }));
  }

  /**
   * Categorize dependency
   */
  private categorizeDependency(name: string): DependencyCategory {
    // Frameworks
    if (
      name.includes('react') ||
      name.includes('vue') ||
      name.includes('angular') ||
      name.includes('next') ||
      name.includes('@nestjs') ||
      name.includes('express') ||
      name.includes('fastify')
    ) {
      return 'framework';
    }

    // UI libraries
    if (
      name.includes('ui') ||
      name.includes('component') ||
      name.includes('material') ||
      name.includes('antd') ||
      name.includes('chakra')
    ) {
      return 'ui';
    }

    // State management
    if (
      name.includes('redux') ||
      name.includes('zustand') ||
      name.includes('mobx') ||
      name.includes('recoil')
    ) {
      return 'state-management';
    }

    // Routing
    if (name.includes('router')) {
      return 'routing';
    }

    // HTTP clients
    if (name.includes('axios') || name.includes('fetch') || name === 'got') {
      return 'http';
    }

    // Database
    if (
      name.includes('typeorm') ||
      name.includes('prisma') ||
      name.includes('mongoose') ||
      name.includes('sequelize')
    ) {
      return 'orm';
    }

    // Testing
    if (
      name.includes('jest') ||
      name.includes('vitest') ||
      name.includes('mocha') ||
      name.includes('chai') ||
      name.includes('testing-library')
    ) {
      return 'testing';
    }

    // Build tools
    if (
      name.includes('webpack') ||
      name.includes('vite') ||
      name.includes('rollup') ||
      name.includes('esbuild')
    ) {
      return 'build-tool';
    }

    // Linting
    if (name.includes('eslint') || name.includes('prettier')) {
      return 'linting';
    }

    // Validation
    if (name.includes('zod') || name.includes('yup') || name.includes('joi')) {
      return 'validation';
    }

    return 'other';
  }

  /**
   * Get empty dependency info
   */
  private getEmptyDependencyInfo(): DependencyInfo {
    return {
      production: [],
      development: [],
      peer: [],
      optional: [],
      frameworks: [],
      libraries: [],
      tools: [],
      totalCount: 0,
    };
  }
}
