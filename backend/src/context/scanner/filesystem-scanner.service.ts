import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DirectoryInfo, DirectoryType } from '@agentdb9/shared';

@Injectable()
export class FilesystemScannerService {
  private readonly logger = new Logger(FilesystemScannerService.name);

  private readonly DEFAULT_EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    '.next',
    '.nuxt',
    'dist',
    'build',
    'out',
    'coverage',
    '.cache',
    '.vscode',
    '.idea',
    '*.log',
    '.DS_Store',
    'tmp',
    'temp',
  ];

  /**
   * Scan directory structure
   */
  async scanDirectory(
    rootPath: string,
    options: {
      maxDepth?: number;
      maxFiles?: number;
      excludePatterns?: string[];
    } = {},
  ): Promise<{
    directories: DirectoryInfo[];
    totalFiles: number;
    totalDirectories: number;
  }> {
    const maxDepth = options.maxDepth || 10;
    const maxFiles = options.maxFiles || 10000;
    const excludePatterns = [
      ...this.DEFAULT_EXCLUDE_PATTERNS,
      ...(options.excludePatterns || []),
    ];

    const directories: DirectoryInfo[] = [];
    let totalFiles = 0;
    let totalDirectories = 0;

    try {
      await this.scanDirectoryRecursive(
        rootPath,
        rootPath,
        0,
        maxDepth,
        maxFiles,
        excludePatterns,
        directories,
        { files: totalFiles, dirs: totalDirectories },
      );

      return {
        directories,
        totalFiles: totalFiles,
        totalDirectories: totalDirectories,
      };
    } catch (error) {
      this.logger.error(`Failed to scan directory ${rootPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recursively scan directory
   */
  private async scanDirectoryRecursive(
    currentPath: string,
    rootPath: string,
    depth: number,
    maxDepth: number,
    maxFiles: number,
    excludePatterns: string[],
    directories: DirectoryInfo[],
    counters: { files: number; dirs: number },
  ): Promise<void> {
    if (depth > maxDepth || counters.files > maxFiles) {
      return;
    }

    const relativePath = path.relative(rootPath, currentPath);
    const dirName = path.basename(currentPath);

    // Check if should exclude
    if (this.shouldExclude(relativePath, dirName, excludePatterns)) {
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      let fileCount = 0;
      const subdirs: string[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          fileCount++;
          counters.files++;
        } else if (entry.isDirectory()) {
          subdirs.push(entry.name);
        }
      }

      // Determine directory type and purpose
      const dirType = this.determineDirectoryType(dirName, relativePath);
      const purpose = this.determineDirectoryPurpose(dirName, dirType);

      directories.push({
        path: relativePath || '.',
        name: dirName || path.basename(rootPath),
        type: dirType,
        fileCount,
        purpose,
        frameworks: this.detectFrameworksInDirectory(entries.map(e => e.name)),
      });

      counters.dirs++;

      // Scan subdirectories
      for (const subdir of subdirs) {
        const subdirPath = path.join(currentPath, subdir);
        await this.scanDirectoryRecursive(
          subdirPath,
          rootPath,
          depth + 1,
          maxDepth,
          maxFiles,
          excludePatterns,
          directories,
          counters,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to scan ${currentPath}: ${error.message}`);
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(
    relativePath: string,
    name: string,
    excludePatterns: string[],
  ): boolean {
    for (const pattern of excludePatterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        if (regex.test(name) || regex.test(relativePath)) {
          return true;
        }
      } else {
        if (name === pattern || relativePath.includes(pattern)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Determine directory type based on name and path
   */
  private determineDirectoryType(name: string, relativePath: string): DirectoryType {
    const lowerName = name.toLowerCase();
    const lowerPath = relativePath.toLowerCase();

    // Source directories
    if (lowerName === 'src' || lowerName === 'source' || lowerName === 'lib') {
      return 'source';
    }

    // Test directories
    if (
      lowerName === 'test' ||
      lowerName === 'tests' ||
      lowerName === '__tests__' ||
      lowerName === 'spec' ||
      lowerName.includes('test')
    ) {
      return 'test';
    }

    // Config directories
    if (lowerName === 'config' || lowerName === 'configuration') {
      return 'config';
    }

    // Build directories
    if (
      lowerName === 'build' ||
      lowerName === 'dist' ||
      lowerName === 'out' ||
      lowerName === '.next'
    ) {
      return 'build';
    }

    // Documentation
    if (lowerName === 'docs' || lowerName === 'documentation') {
      return 'docs';
    }

    // Assets
    if (
      lowerName === 'assets' ||
      lowerName === 'static' ||
      lowerName === 'images' ||
      lowerName === 'img'
    ) {
      return 'assets';
    }

    // Components
    if (lowerName === 'components' || lowerName === 'component') {
      return 'components';
    }

    // Pages
    if (lowerName === 'pages' || lowerName === 'page' || lowerName === 'views') {
      return 'pages';
    }

    // API
    if (lowerName === 'api' || lowerName === 'apis' || lowerName === 'routes') {
      return 'api';
    }

    // Services
    if (lowerName === 'services' || lowerName === 'service') {
      return 'services';
    }

    // Utils
    if (
      lowerName === 'utils' ||
      lowerName === 'utilities' ||
      lowerName === 'helpers' ||
      lowerName === 'lib'
    ) {
      return 'utils';
    }

    // Types
    if (lowerName === 'types' || lowerName === 'interfaces' || lowerName === 'models') {
      return 'types';
    }

    // Hooks
    if (lowerName === 'hooks' || lowerName === 'composables') {
      return 'hooks';
    }

    // Styles
    if (
      lowerName === 'styles' ||
      lowerName === 'css' ||
      lowerName === 'scss' ||
      lowerName === 'sass'
    ) {
      return 'styles';
    }

    // Public
    if (lowerName === 'public' || lowerName === 'static') {
      return 'public';
    }

    // Scripts
    if (lowerName === 'scripts' || lowerName === 'bin') {
      return 'scripts';
    }

    return 'other';
  }

  /**
   * Determine directory purpose
   */
  private determineDirectoryPurpose(name: string, type: DirectoryType): string | undefined {
    const purposes: Record<DirectoryType, string | undefined> = {
      source: 'Main source code',
      test: 'Test files and test utilities',
      config: 'Configuration files',
      build: 'Build output and artifacts',
      docs: 'Documentation',
      assets: 'Static assets (images, fonts, etc.)',
      components: 'Reusable UI components',
      pages: 'Page components or route handlers',
      api: 'API routes and endpoints',
      services: 'Business logic and data services',
      utils: 'Utility functions and helpers',
      types: 'Type definitions and interfaces',
      hooks: 'Custom hooks or composables',
      styles: 'Stylesheets and styling',
      public: 'Publicly accessible files',
      scripts: 'Build and utility scripts',
      other: undefined,
    };

    return purposes[type];
  }

  /**
   * Detect frameworks based on files in directory
   */
  private detectFrameworksInDirectory(files: string[]): string[] {
    const frameworks: string[] = [];

    for (const file of files) {
      const lower = file.toLowerCase();

      // Next.js
      if (lower === 'next.config.js' || lower === 'next.config.mjs') {
        frameworks.push('Next.js');
      }

      // NestJS
      if (lower.includes('.module.ts') || lower.includes('.controller.ts')) {
        frameworks.push('NestJS');
      }

      // React
      if (lower.includes('.jsx') || lower.includes('.tsx')) {
        frameworks.push('React');
      }

      // Vue
      if (lower.includes('.vue')) {
        frameworks.push('Vue');
      }

      // Angular
      if (lower.includes('.component.ts') || lower === 'angular.json') {
        frameworks.push('Angular');
      }
    }

    return [...new Set(frameworks)];
  }

  /**
   * Find files matching pattern
   */
  async findFiles(
    rootPath: string,
    pattern: string | RegExp,
    options: {
      maxDepth?: number;
      excludePatterns?: string[];
    } = {},
  ): Promise<string[]> {
    const maxDepth = options.maxDepth || 10;
    const excludePatterns = [
      ...this.DEFAULT_EXCLUDE_PATTERNS,
      ...(options.excludePatterns || []),
    ];

    const matches: string[] = [];

    await this.findFilesRecursive(
      rootPath,
      rootPath,
      pattern,
      0,
      maxDepth,
      excludePatterns,
      matches,
    );

    return matches;
  }

  /**
   * Recursively find files
   */
  private async findFilesRecursive(
    currentPath: string,
    rootPath: string,
    pattern: string | RegExp,
    depth: number,
    maxDepth: number,
    excludePatterns: string[],
    matches: string[],
  ): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    const relativePath = path.relative(rootPath, currentPath);
    const dirName = path.basename(currentPath);

    if (this.shouldExclude(relativePath, dirName, excludePatterns)) {
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        const relativeEntryPath = path.relative(rootPath, entryPath);

        if (entry.isFile()) {
          const matchesPattern =
            typeof pattern === 'string'
              ? entry.name === pattern
              : pattern.test(entry.name);

          if (matchesPattern) {
            matches.push(relativeEntryPath);
          }
        } else if (entry.isDirectory()) {
          await this.findFilesRecursive(
            entryPath,
            rootPath,
            pattern,
            depth + 1,
            maxDepth,
            excludePatterns,
            matches,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to search in ${currentPath}: ${error.message}`);
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
