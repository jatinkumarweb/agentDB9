# Knowledge System Features Summary

## What's New

AgentDB9 now includes a comprehensive knowledge ingestion and retrieval system with advanced web scraping capabilities.

## Key Features

### ✅ Multiple Content Sources
- **Markdown**: Static files and URLs
- **Websites**: Static HTML and JavaScript-rendered
- **Documentation**: Multi-page crawling with sitemap support
- **API**: JSON/REST endpoints
- **GitHub**: Repository files

### ✅ Dual Scraping Engines
- **Cheerio**: Fast HTML parsing for static content (~100ms per page)
- **Puppeteer**: Full browser rendering for JavaScript apps (~2-5s per page)

### ✅ Smart Documentation Crawling
- Automatic sitemap discovery and parsing
- Configurable depth and page limits
- Link filtering and validation
- Respectful crawling with delays

### ✅ Preset Configurations
Pre-optimized settings for popular documentation sites:
- React, Next.js, Vue, Angular
- TypeScript, Python, Node.js, Go, Rust
- MDN Web Docs
- Auto-detection from URLs

### ✅ Intelligent Processing
- Structure-aware chunking
- Code block preservation
- Metadata extraction
- Vector embeddings for semantic search

## Quick Start

### 1. Add a Static Website

```bash
POST /knowledge/sources/:agentId
{
  "name": "Example Site",
  "type": "website",
  "url": "https://example.com",
  "metadata": {
    "title": "Example",
    "tags": ["example"]
  }
}
```

### 2. Add JavaScript-Rendered Site

```bash
POST /knowledge/sources/:agentId
{
  "name": "React App",
  "type": "website",
  "url": "https://app.example.com",
  "metadata": {
    "title": "React App",
    "tags": ["react"],
    "useJavaScript": true,
    "waitForSelector": "#app"
  }
}
```

### 3. Crawl Documentation

```bash
POST /knowledge/sources/:agentId
{
  "name": "React Docs",
  "type": "documentation",
  "url": "https://react.dev/learn",
  "metadata": {
    "title": "React Documentation",
    "tags": ["react"],
    "preset": "react"
  }
}
```

### 4. Process Source

```bash
POST /knowledge/sources/:sourceId/reindex
```

### 5. Query Knowledge

```bash
POST /knowledge/retrieve
{
  "agentId": "agent-id",
  "query": "How do I use hooks?",
  "topK": 5
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useJavaScript` | boolean | `false` | Use Puppeteer for JS rendering |
| `waitForSelector` | string | - | CSS selector to wait for |
| `followLinks` | boolean | `true` | Enable multi-page crawling |
| `maxDepth` | number | `2` | Maximum crawl depth |
| `maxPages` | number | `50` | Maximum pages to crawl |
| `preset` | string | - | Use predefined configuration |

## Available Presets

- `generic` - Default for most sites
- `react` - React documentation
- `nextjs` - Next.js documentation
- `typescript` - TypeScript handbook
- `mdn` - MDN Web Docs
- `python` - Python documentation
- `nodejs` - Node.js documentation
- `vue` - Vue.js documentation
- `angular` - Angular documentation
- `rust` - Rust documentation
- `go` - Go documentation
- `quick` - Fast scan (depth 1, 20 pages)
- `comprehensive` - Deep crawl (depth 4, 500 pages)

## Testing

Run comprehensive tests:

```bash
# Basic knowledge processing
./tests/knowledge/test-knowledge-processing.sh

# Puppeteer and crawling
./tests/knowledge/test-puppeteer-crawling.sh
```

## Performance

| Method | Speed | Resource Usage | Best For |
|--------|-------|----------------|----------|
| Cheerio | Fast (~100ms) | Low | Static HTML |
| Puppeteer | Slow (~2-5s) | High | JS-rendered |
| Crawling | Medium | Medium | Documentation |

## Documentation

- **[KNOWLEDGE_SYSTEM.md](./KNOWLEDGE_SYSTEM.md)** - Complete system overview
- **[CHEERIO_IMPLEMENTATION.md](./CHEERIO_IMPLEMENTATION.md)** - Cheerio details
- **[PUPPETEER_AND_CRAWLING.md](./PUPPETEER_AND_CRAWLING.md)** - Puppeteer & crawling guide

## Architecture

```
Document Sources
    ↓
Document Loaders (Cheerio/Puppeteer)
    ↓
Chunking Service
    ↓
Embedding Service
    ↓
Vector Store (PostgreSQL/Chroma)
    ↓
Semantic Search & Retrieval
```

## Example Use Cases

### 1. Technical Documentation Assistant
Ingest framework documentation and provide instant answers to developers.

### 2. Internal Knowledge Base
Crawl company documentation and make it searchable for employees.

### 3. API Reference Bot
Load API documentation and help users understand endpoints.

### 4. Learning Assistant
Ingest educational content and provide personalized explanations.

### 5. Code Documentation
Index GitHub repositories and provide code context.

## Next Steps

1. **Install Dependencies**: Puppeteer is already installed
2. **Configure Embeddings**: Set up Ollama or OpenAI
3. **Add Knowledge Sources**: Start with preset configurations
4. **Test Retrieval**: Verify search quality
5. **Integrate with Agents**: Use knowledge in conversations

## Support

For issues or questions:
- Check logs: `tail -f backend/backend.log | grep -E "(Knowledge|Crawling|Puppeteer)"`
- Review documentation in `docs/`
- Run test suites to verify functionality

## Changelog

### v2.0.0 (Current)
- ✅ Added Puppeteer support for JavaScript-rendered content
- ✅ Implemented documentation crawling with sitemap support
- ✅ Added preset configurations for popular frameworks
- ✅ Enhanced Cheerio implementation
- ✅ Created comprehensive test suites
- ✅ Added detailed documentation

### v1.0.0
- ✅ Basic Cheerio implementation
- ✅ Markdown and static website support
- ✅ Vector embeddings and search
- ✅ Knowledge source management
