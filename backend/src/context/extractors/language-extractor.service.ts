import { Injectable, Logger } from '@nestjs/common';
import { LanguageInfo } from '@agentdb9/shared';
import { FilesystemScannerService } from '../scanner/filesystem-scanner.service';
import * as path from 'path';

@Injectable()
export class LanguageExtractorService {
  private readonly logger = new Logger(LanguageExtractorService.name);

  constructor(private readonly scanner: FilesystemScannerService) {}

  private readonly LANGUAGE_EXTENSIONS: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.dart': 'Dart',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
  };

  /**
   * Extract language information from project
   */
  async extractLanguages(rootPath: string): Promise<LanguageInfo[]> {
    try {
      // Count files by extension
      const extensionCounts = await this.countFilesByExtension(rootPath);
      
      // Convert to language info
      const languages = this.convertToLanguageInfo(extensionCounts);
      
      // Get language versions from config files
      await this.enrichWithVersions(rootPath, languages);
      
      // Get language features
      await this.enrichWithFeatures(rootPath, languages);
      
      return languages.sort((a, b) => b.percentage - a.percentage);
    } catch (error) {
      this.logger.error(`Failed to extract languages: ${error.message}`);
      return [];
    }
  }

  /**
   * Count files by extension
   */
  private async countFilesByExtension(rootPath: string): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    
    const scanDir = async (dirPath: string, depth: number = 0) => {
      if (depth > 10) return;
      
      try {
        const entries = await this.scanner.findFiles(rootPath, /.*/, {
          maxDepth: 10,
        });
        
        for (const entry of entries) {
          const ext = path.extname(entry).toLowerCase();
          if (this.LANGUAGE_EXTENSIONS[ext]) {
            counts.set(ext, (counts.get(ext) || 0) + 1);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to scan ${dirPath}: ${error.message}`);
      }
    };
    
    await scanDir(rootPath);
    return counts;
  }

  /**
   * Convert extension counts to language info
   */
  private convertToLanguageInfo(extensionCounts: Map<string, number>): LanguageInfo[] {
    const languageCounts = new Map<string, number>();
    let totalFiles = 0;

    // Aggregate by language
    for (const [ext, count] of extensionCounts) {
      const language = this.LANGUAGE_EXTENSIONS[ext];
      if (language) {
        languageCounts.set(language, (languageCounts.get(language) || 0) + count);
        totalFiles += count;
      }
    }

    // Convert to LanguageInfo
    const languages: LanguageInfo[] = [];
    for (const [name, count] of languageCounts) {
      languages.push({
        name,
        fileCount: count,
        percentage: totalFiles > 0 ? (count / totalFiles) * 100 : 0,
        configFiles: [],
        features: [],
      });
    }

    return languages;
  }

  /**
   * Enrich with version information from config files
   */
  private async enrichWithVersions(rootPath: string, languages: LanguageInfo[]): Promise<void> {
    for (const language of languages) {
      switch (language.name) {
        case 'TypeScript':
        case 'JavaScript':
          await this.enrichJavaScriptVersion(rootPath, language);
          break;
        case 'Python':
          await this.enrichPythonVersion(rootPath, language);
          break;
        case 'Java':
          await this.enrichJavaVersion(rootPath, language);
          break;
        case 'Go':
          await this.enrichGoVersion(rootPath, language);
          break;
      }
    }
  }

  /**
   * Enrich JavaScript/TypeScript version
   */
  private async enrichJavaScriptVersion(rootPath: string, language: LanguageInfo): Promise<void> {
    // Check package.json
    const packageJsonPath = path.join(rootPath, 'package.json');
    if (await this.scanner.fileExists(packageJsonPath)) {
      try {
        const content = await this.scanner.readFile(packageJsonPath);
        const packageJson = JSON.parse(content);
        
        language.configFiles.push('package.json');
        
        if (language.name === 'TypeScript' && packageJson.devDependencies?.typescript) {
          language.version = packageJson.devDependencies.typescript;
        }
        
        if (packageJson.engines?.node) {
          language.version = packageJson.engines.node;
        }
      } catch (error) {
        this.logger.warn(`Failed to parse package.json: ${error.message}`);
      }
    }

    // Check tsconfig.json for TypeScript
    if (language.name === 'TypeScript') {
      const tsconfigPath = path.join(rootPath, 'tsconfig.json');
      if (await this.scanner.fileExists(tsconfigPath)) {
        language.configFiles.push('tsconfig.json');
      }
    }
  }

  /**
   * Enrich Python version
   */
  private async enrichPythonVersion(rootPath: string, language: LanguageInfo): Promise<void> {
    const files = ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py'];
    
    for (const file of files) {
      if (await this.scanner.fileExists(path.join(rootPath, file))) {
        language.configFiles.push(file);
      }
    }
  }

  /**
   * Enrich Java version
   */
  private async enrichJavaVersion(rootPath: string, language: LanguageInfo): Promise<void> {
    const files = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
    
    for (const file of files) {
      if (await this.scanner.fileExists(path.join(rootPath, file))) {
        language.configFiles.push(file);
      }
    }
  }

  /**
   * Enrich Go version
   */
  private async enrichGoVersion(rootPath: string, language: LanguageInfo): Promise<void> {
    const goModPath = path.join(rootPath, 'go.mod');
    if (await this.scanner.fileExists(goModPath)) {
      language.configFiles.push('go.mod');
      
      try {
        const content = await this.scanner.readFile(goModPath);
        const match = content.match(/go\s+(\d+\.\d+)/);
        if (match) {
          language.version = match[1];
        }
      } catch (error) {
        this.logger.warn(`Failed to parse go.mod: ${error.message}`);
      }
    }
  }

  /**
   * Enrich with language features
   */
  private async enrichWithFeatures(rootPath: string, languages: LanguageInfo[]): Promise<void> {
    for (const language of languages) {
      switch (language.name) {
        case 'TypeScript':
          language.features = await this.detectTypeScriptFeatures(rootPath);
          break;
        case 'JavaScript':
          language.features = await this.detectJavaScriptFeatures(rootPath);
          break;
      }
    }
  }

  /**
   * Detect TypeScript features
   */
  private async detectTypeScriptFeatures(rootPath: string): Promise<string[]> {
    const features: string[] = ['Static Typing'];
    
    const tsconfigPath = path.join(rootPath, 'tsconfig.json');
    if (await this.scanner.fileExists(tsconfigPath)) {
      try {
        const content = await this.scanner.readFile(tsconfigPath);
        const tsconfig = JSON.parse(content);
        
        if (tsconfig.compilerOptions?.strict) features.push('Strict Mode');
        if (tsconfig.compilerOptions?.esModuleInterop) features.push('ES Module Interop');
        if (tsconfig.compilerOptions?.jsx) features.push('JSX Support');
        if (tsconfig.compilerOptions?.experimentalDecorators) features.push('Decorators');
      } catch (error) {
        this.logger.warn(`Failed to parse tsconfig.json: ${error.message}`);
      }
    }
    
    return features;
  }

  /**
   * Detect JavaScript features
   */
  private async detectJavaScriptFeatures(rootPath: string): Promise<string[]> {
    const features: string[] = [];
    
    const packageJsonPath = path.join(rootPath, 'package.json');
    if (await this.scanner.fileExists(packageJsonPath)) {
      try {
        const content = await this.scanner.readFile(packageJsonPath);
        const packageJson = JSON.parse(content);
        
        if (packageJson.type === 'module') features.push('ES Modules');
        if (packageJson.dependencies?.['@babel/core']) features.push('Babel');
      } catch (error) {
        this.logger.warn(`Failed to parse package.json: ${error.message}`);
      }
    }
    
    return features;
  }
}
