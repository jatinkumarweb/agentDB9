import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeSource as KnowledgeSourceType, LoadedDocument, DocumentSection, CodeBlock } from '@agentdb9/shared';
import * as cheerio from 'cheerio';

@Injectable()
export class DocumentLoaderService {
  private readonly logger = new Logger(DocumentLoaderService.name);

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

    const html = await this.fetchContent(source.url);
    const $ = cheerio.load(html);

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
      
      if (code.length > 10) { // Only include substantial code blocks
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
   * Load documentation
   */
  private async loadDocumentation(source: KnowledgeSourceType): Promise<LoadedDocument> {
    // Documentation is similar to website loading but with special handling
    return this.loadWebsite(source);
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
