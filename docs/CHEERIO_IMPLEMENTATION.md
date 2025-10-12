# Cheerio Implementation for Website Knowledge Sources

## Overview

The AgentDB9 backend now supports loading website content as knowledge sources using Cheerio, a fast and flexible HTML parsing library. This implementation allows agents to ingest and process web content for their knowledge base.

## Implementation Details

### Location

The Cheerio implementation is located in:
- `backend/src/knowledge/loaders/document-loader.service.ts`

### Dependencies

- **cheerio**: ^1.0.0 (already installed in package.json)

### How It Works

1. **HTML Fetching**: The service fetches HTML content from the provided URL using the native `fetch` API.

2. **HTML Parsing**: Cheerio loads and parses the HTML content, providing a jQuery-like API for DOM manipulation.

3. **Content Extraction**:
   - Removes unnecessary elements (scripts, styles, navigation, headers, footers)
   - Extracts main content from semantic HTML elements (`<main>`, `<article>`, `.content`, `#content`)
   - Falls back to `<body>` content if no main content area is found
   - Cleans up whitespace for better readability

4. **Structure Extraction**:
   - **Headings**: Extracts all heading elements (h1-h6) as document sections
   - **Code Blocks**: Identifies and extracts code blocks with language detection
   - **Metadata**: Captures page title and other metadata

### Code Example

```typescript
private async loadWebsite(source: KnowledgeSourceType): Promise<LoadedDocument> {
  if (!source.url) {
    throw new Error('Website source must have a URL');
  }

  try {
    const html = await this.fetchContent(source.url);
    const $ = load(html);  // Cheerio loading
    
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
  } catch (error) {
    this.logger.error(`Failed to load website ${source.url}: ${error.message}`);
    throw new Error(`Failed to load website: ${error.message}`);
  }
}
```

## API Usage

### Adding a Website Knowledge Source

```bash
POST /knowledge/sources/:agentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Documentation Site",
  "type": "website",
  "url": "https://example.com/docs",
  "metadata": {
    "title": "Example Documentation",
    "description": "Official documentation",
    "tags": ["docs", "reference"]
  }
}
```

### Response

```json
{
  "id": "uuid",
  "agentId": "agent-uuid",
  "type": "website",
  "url": "https://example.com/docs",
  "metadata": {
    "title": "Example Documentation",
    "description": "Official documentation",
    "tags": ["docs", "reference"]
  },
  "status": "pending",
  "createdAt": "2025-10-12T18:00:00.000Z",
  "updatedAt": "2025-10-12T18:00:00.000Z"
}
```

### Processing the Source

After adding a source, trigger processing:

```bash
POST /knowledge/sources/:sourceId/reindex
Authorization: Bearer <token>
```

This will:
1. Fetch the website content
2. Parse HTML with Cheerio
3. Extract and clean content
4. Chunk the content
5. Generate embeddings (if configured)
6. Store in vector database

## Testing

A comprehensive test script is available at `tests/knowledge/test-knowledge-processing.sh`.

### Running the Test

```bash
# Ensure backend and database are running
./tests/knowledge/test-knowledge-processing.sh
```

### Test Coverage

The test script verifies:
- ✅ User authentication
- ✅ Agent creation
- ✅ Adding markdown knowledge sources
- ✅ Adding website knowledge sources
- ✅ Listing knowledge sources
- ✅ Knowledge source status tracking
- ✅ Cleanup operations

## Features

### Content Extraction
- Semantic HTML parsing
- Main content identification
- Noise removal (scripts, styles, navigation)
- Whitespace normalization

### Structure Preservation
- Heading hierarchy extraction
- Code block identification
- Language detection for code
- Section-based organization

### Metadata Handling
- Page title extraction
- Custom metadata support
- Tag-based categorization

## Limitations

1. **JavaScript-Rendered Content**: Cheerio parses static HTML only. Websites that rely heavily on JavaScript for content rendering may not be fully captured.

2. **Authentication**: Currently doesn't support websites requiring authentication.

3. **Rate Limiting**: No built-in rate limiting for fetching multiple pages.

4. **Dynamic Content**: Content loaded via AJAX/fetch after page load won't be captured.

## Enhanced Features

✅ **Puppeteer Integration**: Now available! See [PUPPETEER_AND_CRAWLING.md](./PUPPETEER_AND_CRAWLING.md)
✅ **Sitemap Support**: Automatic sitemap discovery and parsing
✅ **Link Following**: Recursive crawling with depth limits
✅ **Preset Configurations**: Optimized settings for popular documentation sites

### Future Enhancements

1. **Authentication**: Support for protected content
2. **Content Caching**: Reduce redundant fetches
3. **Incremental Updates**: Only fetch changed content
4. **Custom Extractors**: Plugin system for specialized content extraction

## Troubleshooting

### No Content Extracted

If a website source shows 0 chunks after processing:

1. **Check the URL**: Ensure it's accessible and returns HTML
2. **Inspect Content**: The site might have minimal text content
3. **JavaScript Dependency**: The site might require JavaScript to render content
4. **Check Logs**: Look for errors in backend logs

```bash
tail -f backend/backend.log | grep -E "(Loading document|Cheerio|chunks)"
```

### Processing Failures

Check the knowledge source status:

```bash
GET /knowledge/sources/:agentId
```

Look for sources with `status: "failed"` and check the `error` field.

## Related Files

- `backend/src/knowledge/loaders/document-loader.service.ts` - Main implementation
- `backend/src/knowledge/knowledge.service.ts` - Knowledge service orchestration
- `backend/src/knowledge/chunking/chunking.service.ts` - Content chunking
- `backend/src/entities/knowledge-source.entity.ts` - Database entity
- `tests/knowledge/test-knowledge-processing.sh` - Integration tests

## Conclusion

The Cheerio implementation provides a lightweight and efficient way to ingest website content into agent knowledge bases. It handles common web content patterns and provides structured extraction of headings, code blocks, and metadata.

For websites with complex JavaScript rendering requirements, consider using a headless browser solution like Puppeteer as a future enhancement.
