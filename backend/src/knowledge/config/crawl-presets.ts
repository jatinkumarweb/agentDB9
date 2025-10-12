/**
 * Predefined crawl configurations for popular documentation sites
 */

export interface CrawlPreset {
  name: string;
  description: string;
  useJavaScript: boolean;
  waitForSelector?: string;
  maxDepth: number;
  maxPages: number;
  includePatterns?: RegExp[];
  excludePatterns?: RegExp[];
}

export const CRAWL_PRESETS: Record<string, CrawlPreset> = {
  // Generic documentation
  generic: {
    name: 'Generic Documentation',
    description: 'Default settings for most documentation sites',
    useJavaScript: false,
    maxDepth: 2,
    maxPages: 50,
    excludePatterns: [
      /\/(api|changelog|releases|blog|news)\//i,
      /\.(pdf|zip|tar|gz)$/i,
    ],
  },

  // React documentation
  react: {
    name: 'React Documentation',
    description: 'Optimized for React and React-based docs',
    useJavaScript: true,
    waitForSelector: 'main article',
    maxDepth: 3,
    maxPages: 100,
    includePatterns: [
      /\/docs\//,
      /\/learn\//,
      /\/reference\//,
    ],
  },

  // Next.js documentation
  nextjs: {
    name: 'Next.js Documentation',
    description: 'Optimized for Next.js docs',
    useJavaScript: true,
    waitForSelector: 'article',
    maxDepth: 3,
    maxPages: 150,
    includePatterns: [
      /\/docs\//,
    ],
  },

  // MDN Web Docs
  mdn: {
    name: 'MDN Web Docs',
    description: 'Optimized for MDN documentation',
    useJavaScript: false,
    maxDepth: 2,
    maxPages: 100,
    includePatterns: [
      /\/docs\/Web\//,
      /\/docs\/Learn\//,
    ],
    excludePatterns: [
      /\/docs\/Games\//,
      /\/docs\/Mozilla\//,
    ],
  },

  // TypeScript documentation
  typescript: {
    name: 'TypeScript Documentation',
    description: 'Optimized for TypeScript docs',
    useJavaScript: true,
    waitForSelector: '#handbook-content',
    maxDepth: 3,
    maxPages: 100,
    includePatterns: [
      /\/docs\//,
      /\/handbook\//,
    ],
  },

  // Python documentation
  python: {
    name: 'Python Documentation',
    description: 'Optimized for Python docs',
    useJavaScript: false,
    maxDepth: 3,
    maxPages: 200,
    includePatterns: [
      /\/library\//,
      /\/tutorial\//,
      /\/reference\//,
    ],
  },

  // Node.js documentation
  nodejs: {
    name: 'Node.js Documentation',
    description: 'Optimized for Node.js docs',
    useJavaScript: false,
    maxDepth: 2,
    maxPages: 100,
    includePatterns: [
      /\/api\//,
      /\/docs\//,
    ],
  },

  // Vue.js documentation
  vue: {
    name: 'Vue.js Documentation',
    description: 'Optimized for Vue.js docs',
    useJavaScript: true,
    waitForSelector: '.content',
    maxDepth: 3,
    maxPages: 100,
    includePatterns: [
      /\/guide\//,
      /\/api\//,
      /\/examples\//,
    ],
  },

  // Angular documentation
  angular: {
    name: 'Angular Documentation',
    description: 'Optimized for Angular docs',
    useJavaScript: true,
    waitForSelector: 'aio-doc-viewer',
    maxDepth: 3,
    maxPages: 150,
    includePatterns: [
      /\/guide\//,
      /\/api\//,
      /\/tutorial\//,
    ],
  },

  // Rust documentation
  rust: {
    name: 'Rust Documentation',
    description: 'Optimized for Rust docs',
    useJavaScript: false,
    maxDepth: 3,
    maxPages: 200,
    includePatterns: [
      /\/book\//,
      /\/reference\//,
      /\/std\//,
    ],
  },

  // Go documentation
  go: {
    name: 'Go Documentation',
    description: 'Optimized for Go docs',
    useJavaScript: false,
    maxDepth: 2,
    maxPages: 100,
    includePatterns: [
      /\/doc\//,
      /\/pkg\//,
    ],
  },

  // Comprehensive crawl
  comprehensive: {
    name: 'Comprehensive Crawl',
    description: 'Deep crawl for complete documentation coverage',
    useJavaScript: true,
    maxDepth: 4,
    maxPages: 500,
  },

  // Quick scan
  quick: {
    name: 'Quick Scan',
    description: 'Fast scan of main pages only',
    useJavaScript: false,
    maxDepth: 1,
    maxPages: 20,
  },
};

/**
 * Get crawl preset by name
 */
export function getCrawlPreset(name: string): CrawlPreset | undefined {
  return CRAWL_PRESETS[name.toLowerCase()];
}

/**
 * Detect preset from URL
 */
export function detectPresetFromUrl(url: string): CrawlPreset | undefined {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('react')) return CRAWL_PRESETS.react;
  if (urlLower.includes('nextjs') || urlLower.includes('next.js')) return CRAWL_PRESETS.nextjs;
  if (urlLower.includes('developer.mozilla.org')) return CRAWL_PRESETS.mdn;
  if (urlLower.includes('typescriptlang.org')) return CRAWL_PRESETS.typescript;
  if (urlLower.includes('python.org')) return CRAWL_PRESETS.python;
  if (urlLower.includes('nodejs.org')) return CRAWL_PRESETS.nodejs;
  if (urlLower.includes('vuejs.org')) return CRAWL_PRESETS.vue;
  if (urlLower.includes('angular.io')) return CRAWL_PRESETS.angular;
  if (urlLower.includes('rust-lang.org')) return CRAWL_PRESETS.rust;
  if (urlLower.includes('golang.org') || urlLower.includes('go.dev')) return CRAWL_PRESETS.go;

  return CRAWL_PRESETS.generic;
}

/**
 * Apply preset to metadata
 */
export function applyPreset(
  metadata: any,
  preset: CrawlPreset | string
): any {
  const presetConfig = typeof preset === 'string' 
    ? getCrawlPreset(preset) 
    : preset;

  if (!presetConfig) {
    return metadata;
  }

  return {
    ...metadata,
    useJavaScript: presetConfig.useJavaScript,
    waitForSelector: presetConfig.waitForSelector,
    maxDepth: presetConfig.maxDepth,
    maxPages: presetConfig.maxPages,
  };
}
