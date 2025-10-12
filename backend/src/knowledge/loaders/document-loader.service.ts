import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { KnowledgeSource as KnowledgeSourceType, LoadedDocument, DocumentSection, CodeBlock } from '@agentdb9/shared';
import { load } from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { detectPresetFromUrl, applyPreset } from '../config/crawl-presets';

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  followLinks?: boolean;
  waitForSelector?: string;
  useJavaScript?: boolean;
  includePatterns?: RegExp[];
  excludePatterns?: RegExp[];
}

@Injectable()
export class DocumentLoaderService implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentLoaderService.name);
  private browser: Browser | null = null;

  /**
   * Load document from source
   */
  async loadDocument(source: KnowledgeSourceType): Promise<LoadedDocument> {
    this.logger.log(`Loading document from ${source.type}: ${source.url || 'inline content'}`);

    switch (source.type) {
      case 'markdown':
        return this.loadMarkdown(source);
      case 'website':
        return this.loadWebsite(source);
      case 'pdf':
        return this.loadPDF(source);
      case 'api':
        return this.loadAPI(source);
      case 'github':
        return this.loadGitHub(source);
      case 'documentation':
        return this.loadDocumentation(source);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Load markdown document
   */
  private async loadMarkdown(source: KnowledgeSourceType): Promise<LoadedDocument> {
    let content: string;

    if (source.content) {
      content = source.content;
    } else if (source.url) {
      content = await this.fetchContent(source.url);
    } else {
      throw new Error('Markdown source must have either content or URL');
    }

    const sections = this.extractMarkdownSections(content);
    const codeBlocks = this.extractCodeBlocks(content);

    return {
      content,
      metadata: source.metadata,
      sections,
      codeBlocks,
    };
  }

  /**
   * Load website content
   */
  private async loadWebsite(source: KnowledgeSourceType): Promise<LoadedDocument> {
    if (!source.url) {
      throw new Error('Website source must have a URL');
    }

    // Check if JavaScript rendering is needed
    const useJavaScript = (source.metadata as any)?.useJavaScript || false;
    
    if (useJavaScript) {
      return this.loadWebsiteWithPuppeteer(source);
    }

    try {
      const html = await this.fetchContent(source.url);
      return this.parseHTML(html, source);
    } catch (error) {
      this.logger.error(`Failed to load website ${source.url}: ${error.message}`);
      throw new Error(`Failed to load website: ${error.message}`);
    }
  }

  /**
   * Load website with Puppeteer for JavaScript-rendered content
   */
  private async loadWebsiteWithPuppeteer(source: KnowledgeSourceType): Promise<LoadedDocument> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      this.logger.log(`Loading ${source.url} with Puppeteer...`);
      
      await page.setUserAgent('AgentDB9-KnowledgeIngestion/1.0');
      await page.goto(source.url!, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for specific selector if provided
      const waitForSelector = (source.metadata as any)?.waitForSelector;
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      }

      // Get rendered HTML
      const html = await page.content();
      
      return this.parseHTML(html, source);
    } catch (error) {
      this.logger.error(`Puppeteer failed to load ${source.url}: ${error.message}`);
      throw new Error(`Failed to load website with JavaScript: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  /**
   * Parse HTML content with Cheerio
   */
  private parseHTML(html: string, source: KnowledgeSourceType): LoadedDocument {
    const $ = load(html);
    
    // Remove script and style tags
    $('script, style, nav, footer, header').remove();

    // Extract main content
    const mainContent = $('main, article, .content, #content').first();
    const content = mainContent.length > 0 
      ? mainContent.text().trim()
      : $('body').text().trim();

    // Clean up whitespace
    const cleanContent = content.replace(/\s+/g, ' ').trim();

    // Extract headings as sections
    const sections: DocumentSection[] = [];
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const $elem = $(elem);
      const tagName = (elem as any).tagName || (elem as any).name || 'h1';
      const level = parseInt(tagName[1]);
      const title = $elem.text().trim();
      
      sections.push({
        title,
        content: '',
        level,
        startOffset: 0,
        endOffset: 0,
      });
    });

    // Extract code blocks
    const codeBlocks: CodeBlock[] = [];
    $('pre code, code').each((i, elem) => {
      const $elem = $(elem);
      const code = $elem.text().trim();
      const language = $elem.attr('class')?.match(/language-(\w+)/)?.[1] || 'text';
      
      if (code.length > 10) {
        codeBlocks.push({
          language,
          code,
        });
      }
    });

    return {
      content: cleanContent,
      metadata: {
        ...source.metadata,
        title: source.metadata.title || $('title').text().trim() || 'Untitled',
      },
      sections,
      codeBlocks,
    };
  }

  /**
   * Load PDF document
   */
  private async loadPDF(source: KnowledgeSourceType): Promise<LoadedDocument> {
    // Note: PDF parsing requires additional libraries like pdf-parse
    // For now, return a placeholder implementation
    this.logger.warn('PDF loading not fully implemented yet');
    
    if (!source.url) {
      throw new Error('PDF source must have a URL');
    }

    // TODO: Implement PDF parsing with pdf-parse or similar library
    // const pdfBuffer = await this.fetchBinary(source.url);
    // const pdfData = await pdfParse(pdfBuffer);
    
    return {
      content: 'PDF content extraction not yet implemented',
      metadata: source.metadata,
      sections: [],
      codeBlocks: [],
    };
  }

  /**
   * Load from API
   */
  private async loadAPI(source: KnowledgeSourceType): Promise<LoadedDocument> {
    if (!source.url) {
      throw new Error('API source must have a URL');
    }

    const response = await fetch(source.url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgentDB9-KnowledgeIngestion/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = JSON.stringify(data, null, 2);

    return {
      content,
      metadata: source.metadata,
      sections: [],
      codeBlocks: [],
    };
  }

  /**
   * Load from GitHub
   */
  private async loadGitHub(source: KnowledgeSourceType): Promise<LoadedDocument> {
    if (!source.url) {
      throw new Error('GitHub source must have a URL');
    }

    // Convert GitHub URL to raw content URL
    const rawUrl = source.url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');

    const content = await this.fetchContent(rawUrl);
    const codeBlocks = this.extractCodeBlocks(content);

    return {
      content,
      metadata: source.metadata,
      sections: [],
      codeBlocks,
    };
  }

  /**
   * Load documentation with crawling support
   */
  private async loadDocumentation(source: KnowledgeSourceType): Promise<LoadedDocument> {
    if (!source.url) {
      throw new Error('Documentation source must have a URL');
    }

    // Auto-detect and apply preset if not explicitly configured
    if (!(source.metadata as any)?.maxDepth && !(source.metadata as any)?.preset) {
      const preset = detectPresetFromUrl(source.url);
      if (preset) {
        this.logger.log(`Auto-detected preset: ${preset.name}`);
        source.metadata = applyPreset(source.metadata, preset);
      }
    }

    const crawlOptions: CrawlOptions = {
      maxDepth: (source.metadata as any)?.maxDepth || 2,
      maxPages: (source.metadata as any)?.maxPages || 50,
      followLinks: (source.metadata as any)?.followLinks !== false,
      useJavaScript: (source.metadata as any)?.useJavaScript || false,
      waitForSelector: (source.metadata as any)?.waitForSelector,
    };

    // Check if we should crawl multiple pages
    if (crawlOptions.followLinks) {
      return this.crawlDocumentation(source, crawlOptions);
    }

    // Single page load
    return this.loadWebsite(source);
  }

  /**
   * Crawl documentation site
   */
  private async crawlDocumentation(
    source: KnowledgeSourceType,
    options: CrawlOptions
  ): Promise<LoadedDocument> {
    const visited = new Set<string>();
    const toVisit: Array<{ url: string; depth: number }> = [];
    
    const allContent: string[] = [];
    const allSections: DocumentSection[] = [];
    const allCodeBlocks: CodeBlock[] = [];
    let pageCount = 0;

    const baseUrl = new URL(source.url!);
    const baseDomain = baseUrl.origin;
    const basePath = baseUrl.pathname.split('/').slice(0, -1).join('/');

    this.logger.log(`Starting documentation crawl from ${source.url}`);
    this.logger.log(`Max depth: ${options.maxDepth}, Max pages: ${options.maxPages}`);

    // Try to find and parse sitemap first
    const sitemapUrls = await this.findSitemapUrls(baseDomain);
    if (sitemapUrls.length > 0) {
      this.logger.log(`Found ${sitemapUrls.length} URLs from sitemap`);
      sitemapUrls.forEach(url => {
        if (url.startsWith(baseDomain + basePath)) {
          toVisit.push({ url, depth: 0 });
        }
      });
    }

    // If no sitemap or sitemap didn't have enough URLs, start with base URL
    if (toVisit.length === 0) {
      toVisit.push({ url: source.url!, depth: 0 });
    }

    while (toVisit.length > 0 && pageCount < (options.maxPages || 50)) {
      const { url, depth } = toVisit.shift()!;

      if (visited.has(url) || depth > (options.maxDepth || 2)) {
        continue;
      }

      visited.add(url);
      pageCount++;

      try {
        this.logger.log(`Crawling [${pageCount}/${options.maxPages}] depth ${depth}: ${url}`);
        
        const pageSource = { ...source, url };
        const doc = options.useJavaScript
          ? await this.loadWebsiteWithPuppeteer(pageSource)
          : await this.loadWebsite(pageSource);

        allContent.push(`\n\n=== ${doc.metadata.title} ===\n\n${doc.content}`);
        if (doc.sections) {
          allSections.push(...doc.sections);
        }
        if (doc.codeBlocks) {
          allCodeBlocks.push(...doc.codeBlocks);
        }

        // Extract links if we haven't reached max depth
        if (depth < (options.maxDepth || 2)) {
          const links = await this.extractLinks(url, options.useJavaScript || false);
          
          for (const link of links) {
            const linkUrl = this.resolveUrl(url, link);
            
            if (this.shouldFollowLink(linkUrl, baseDomain, basePath, visited, options)) {
              toVisit.push({ url: linkUrl, depth: depth + 1 });
            }
          }
        }

        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.warn(`Failed to crawl ${url}: ${error.message}`);
      }
    }

    this.logger.log(`Crawl complete: ${pageCount} pages processed`);

    return {
      content: allContent.join('\n'),
      metadata: {
        ...source.metadata,
        title: source.metadata.title || 'Documentation',
        pageCount,
      },
      sections: allSections,
      codeBlocks: allCodeBlocks,
    };
  }

  /**
   * Extract links from a page
   */
  private async extractLinks(url: string, useJavaScript: boolean): Promise<string[]> {
    if (useJavaScript) {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => (a as HTMLAnchorElement).href)
            .filter(href => href && !href.startsWith('#'));
        });
        
        return links;
      } finally {
        await page.close();
      }
    } else {
      const html = await this.fetchContent(url);
      const $ = load(html);
      const links: string[] = [];
      
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && !href.startsWith('#')) {
          links.push(href);
        }
      });
      
      return links;
    }
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(baseUrl: string, relativeUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  /**
   * Check if link should be followed
   */
  private shouldFollowLink(
    url: string,
    baseDomain: string,
    basePath: string,
    visited: Set<string>,
    options: CrawlOptions
  ): boolean {
    if (visited.has(url)) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      
      // Must be same domain
      if (urlObj.origin !== baseDomain) {
        return false;
      }

      // Should be under base path (for documentation sites)
      if (!urlObj.pathname.startsWith(basePath)) {
        return false;
      }

      // Check include patterns
      if (options.includePatterns && options.includePatterns.length > 0) {
        if (!options.includePatterns.some(pattern => pattern.test(url))) {
          return false;
        }
      }

      // Check exclude patterns
      if (options.excludePatterns && options.excludePatterns.length > 0) {
        if (options.excludePatterns.some(pattern => pattern.test(url))) {
          return false;
        }
      }

      // Exclude common non-documentation URLs
      const excludeExtensions = ['.pdf', '.zip', '.tar', '.gz', '.jpg', '.png', '.gif', '.svg'];
      if (excludeExtensions.some(ext => url.toLowerCase().endsWith(ext))) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get or create Puppeteer browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.log('Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Find and parse sitemap URLs
   */
  private async findSitemapUrls(baseDomain: string): Promise<string[]> {
    const sitemapUrls = [
      `${baseDomain}/sitemap.xml`,
      `${baseDomain}/sitemap_index.xml`,
      `${baseDomain}/sitemap-index.xml`,
      `${baseDomain}/docs/sitemap.xml`,
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        this.logger.log(`Checking for sitemap at ${sitemapUrl}`);
        const urls = await this.parseSitemap(sitemapUrl);
        if (urls.length > 0) {
          return urls;
        }
      } catch (error) {
        // Sitemap not found or invalid, try next
        continue;
      }
    }

    return [];
  }

  /**
   * Parse sitemap XML
   */
  private async parseSitemap(sitemapUrl: string): Promise<string[]> {
    try {
      const xml = await this.fetchContent(sitemapUrl);
      const $ = load(xml, { xmlMode: true });
      
      const urls: string[] = [];
      
      // Check if this is a sitemap index
      $('sitemapindex > sitemap > loc').each((i, elem) => {
        const loc = $(elem).text().trim();
        if (loc) {
          urls.push(loc);
        }
      });

      // If sitemap index found, recursively parse each sitemap
      if (urls.length > 0) {
        this.logger.log(`Found sitemap index with ${urls.length} sitemaps`);
        const allUrls: string[] = [];
        for (const url of urls) {
          try {
            const subUrls = await this.parseSitemap(url);
            allUrls.push(...subUrls);
          } catch (error) {
            this.logger.warn(`Failed to parse sitemap ${url}: ${error.message}`);
          }
        }
        return allUrls;
      }

      // Parse regular sitemap
      $('urlset > url > loc').each((i, elem) => {
        const loc = $(elem).text().trim();
        if (loc) {
          urls.push(loc);
        }
      });

      this.logger.log(`Parsed ${urls.length} URLs from sitemap`);
      return urls;
    } catch (error) {
      this.logger.debug(`Failed to parse sitemap ${sitemapUrl}: ${error.message}`);
      return [];
    }
  }

  /**
   * Try to find documentation index page
   */
  private async findDocumentationIndex(baseUrl: string): Promise<string[]> {
    const indexPaths = [
      '/docs',
      '/documentation',
      '/api',
      '/reference',
      '/guide',
      '/manual',
    ];

    for (const path of indexPaths) {
      try {
        const indexUrl = baseUrl + path;
        const html = await this.fetchContent(indexUrl);
        const $ = load(html);
        
        // Look for documentation links
        const links: string[] = [];
        $('nav a[href], .sidebar a[href], .toc a[href], .menu a[href]').each((i, elem) => {
          const href = $(elem).attr('href');
          if (href && !href.startsWith('#')) {
            const fullUrl = this.resolveUrl(indexUrl, href);
            links.push(fullUrl);
          }
        });

        if (links.length > 0) {
          this.logger.log(`Found ${links.length} links from index page ${indexUrl}`);
          return links;
        }
      } catch (error) {
        continue;
      }
    }

    return [];
  }

  /**
   * Close browser on service destruction
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Fetch content from URL
   */
  private async fetchContent(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgentDB9-KnowledgeIngestion/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Extract markdown sections
   */
  private extractMarkdownSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = content.split('\n');
    let currentSection: DocumentSection | null = null;
    let offset = 0;

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.endOffset = offset;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: headingMatch[2].trim(),
          content: '',
          level: headingMatch[1].length,
          startOffset: offset,
          endOffset: 0,
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }

      offset += line.length + 1;
    }

    // Save last section
    if (currentSection) {
      currentSection.endOffset = offset;
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract code blocks from markdown
   */
  private extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }

    return codeBlocks;
  }
}
