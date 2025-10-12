# Puppeteer & Documentation Crawling

## Overview

AgentDB9 now supports advanced website scraping and documentation crawling capabilities using:
- **Cheerio**: Fast HTML parsing for static websites
- **Puppeteer**: Headless browser for JavaScript-rendered content
- **Smart Crawling**: Sitemap parsing, link following, and depth control
- **Preset Configurations**: Optimized settings for popular documentation sites

## Features

### 1. JavaScript-Rendered Content Support

Puppeteer enables scraping of modern web applications that rely on JavaScript for content rendering.

```typescript
{
  "name": "React Documentation",
  "type": "website",
  "url": "https://react.dev",
  "metadata": {
    "title": "React Docs",
    "tags": ["react", "documentation"],
    "useJavaScript": true,
    "waitForSelector": "main article"
  }
}
```

### 2. Documentation Site Crawling

Automatically crawl entire documentation sites with configurable depth and page limits.

```typescript
{
  "name": "TypeScript Handbook",
  "type": "documentation",
  "url": "https://www.typescriptlang.org/docs/handbook/",
  "metadata": {
    "title": "TypeScript Handbook",
    "tags": ["typescript", "documentation"],
    "followLinks": true,
    "maxDepth": 3,
    "maxPages": 100,
    "useJavaScript": true
  }
}
```

### 3. Sitemap Support

Automatically discovers and parses XML sitemaps for efficient crawling.

The crawler checks for sitemaps at common locations:
- `/sitemap.xml`
- `/sitemap_index.xml`
- `/sitemap-index.xml`
- `/docs/sitemap.xml`

### 4. Preset Configurations

Pre-configured settings for popular documentation sites:

- **React**: `react`
- **Next.js**: `nextjs`
- **TypeScript**: `typescript`
- **MDN Web Docs**: `mdn`
- **Python**: `python`
- **Node.js**: `nodejs`
- **Vue.js**: `vue`
- **Angular**: `angular`
- **Rust**: `rust`
- **Go**: `go`

Presets are auto-detected from URLs or can be explicitly specified.

## API Usage

### Basic Website (Static HTML)

```bash
POST /knowledge/sources/:agentId
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Example Site",
  "type": "website",
  "url": "https://example.com",
  "metadata": {
    "title": "Example",
    "tags": ["example"],
    "useJavaScript": false
  }
}
```

### JavaScript-Rendered Website

```bash
POST /knowledge/sources/:agentId
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Modern Web App",
  "type": "website",
  "url": "https://app.example.com",
  "metadata": {
    "title": "Modern App",
    "tags": ["spa", "javascript"],
    "useJavaScript": true,
    "waitForSelector": "#app-content"
  }
}
```

### Documentation Crawling

```bash
POST /knowledge/sources/:agentId
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Project Documentation",
  "type": "documentation",
  "url": "https://docs.example.com",
  "metadata": {
    "title": "Project Docs",
    "tags": ["documentation"],
    "followLinks": true,
    "maxDepth": 2,
    "maxPages": 50,
    "useJavaScript": false
  }
}
```

### Using Presets

```bash
POST /knowledge/sources/:agentId
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "React Documentation",
  "type": "documentation",
  "url": "https://react.dev/learn",
  "metadata": {
    "title": "React Docs",
    "tags": ["react"],
    "preset": "react"
  }
}
```

## Configuration Options

### Metadata Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `useJavaScript` | boolean | `false` | Use Puppeteer for JavaScript rendering |
| `waitForSelector` | string | - | CSS selector to wait for before scraping |
| `followLinks` | boolean | `true` | Follow links for multi-page crawling |
| `maxDepth` | number | `2` | Maximum crawl depth |
| `maxPages` | number | `50` | Maximum pages to crawl |

### Crawl Presets

Each preset includes optimized settings:

```typescript
{
  name: string;
  description: string;
  useJavaScript: boolean;
  waitForSelector?: string;
  maxDepth: number;
  maxPages: number;
  includePatterns?: RegExp[];
  excludePatterns?: RegExp[];
}
```

## Implementation Details

### Document Loader Service

The `DocumentLoaderService` handles all loading strategies:

1. **Static HTML** (Cheerio)
   - Fast parsing
   - Low resource usage
   - Best for static sites

2. **JavaScript-Rendered** (Puppeteer)
   - Full browser rendering
   - Handles dynamic content
   - Higher resource usage

3. **Documentation Crawling**
   - Sitemap discovery
   - Link extraction
   - Depth-first traversal
   - Respectful delays

### Crawling Algorithm

```
1. Check for sitemap.xml
   ├─ If found: Parse all URLs
   └─ If not found: Start from base URL

2. For each URL (up to maxPages):
   ├─ Check if already visited
   ├─ Check depth limit
   ├─ Load page (Cheerio or Puppeteer)
   ├─ Extract content
   ├─ Extract links (if depth < maxDepth)
   └─ Add valid links to queue

3. Combine all content
4. Return aggregated document
```

### Link Filtering

Links are filtered based on:
- Same domain requirement
- Base path matching
- Include/exclude patterns
- File extension exclusions
- Already visited check

## Testing

### Run Comprehensive Tests

```bash
./tests/knowledge/test-puppeteer-crawling.sh
```

### Test Coverage

The test suite verifies:
1. ✅ Static website loading (Cheerio)
2. ✅ JavaScript-rendered sites (Puppeteer)
3. ✅ Single-page documentation
4. ✅ Multi-page documentation crawling
5. ✅ Source listing and statistics
6. ✅ Cleanup operations

### Manual Testing

```bash
# Test static site
curl -X POST http://localhost:8000/knowledge/sources/$AGENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Site",
    "type": "website",
    "url": "https://example.com",
    "metadata": {
      "title": "Test",
      "tags": ["test"],
      "useJavaScript": false
    }
  }'

# Trigger processing
curl -X POST http://localhost:8000/knowledge/sources/$SOURCE_ID/reindex \
  -H "Authorization: Bearer $TOKEN"
```

## Performance Considerations

### Resource Usage

| Method | CPU | Memory | Speed | Best For |
|--------|-----|--------|-------|----------|
| Cheerio | Low | Low | Fast | Static HTML |
| Puppeteer | High | High | Slow | JS-rendered |
| Crawling | Medium | Medium | Slow | Documentation |

### Optimization Tips

1. **Use Cheerio when possible**
   - Most documentation sites work fine without JavaScript
   - Much faster and lighter

2. **Limit crawl depth**
   - Start with `maxDepth: 2`
   - Increase only if needed

3. **Set reasonable page limits**
   - Default `maxPages: 50` is usually sufficient
   - Large sites may need 100-200

4. **Use presets**
   - Presets are optimized for specific sites
   - Auto-detection works for popular frameworks

5. **Monitor resource usage**
   - Puppeteer can use significant memory
   - Consider rate limiting for large crawls

## Troubleshooting

### Puppeteer Issues

**Problem**: Puppeteer fails to launch

```
Error: Failed to launch browser
```

**Solution**: Ensure required dependencies are installed

```bash
# Install Chromium dependencies
apt-get install -y \
  chromium \
  chromium-sandbox \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils
```

### Crawling Issues

**Problem**: No pages found during crawl

**Possible causes**:
1. Sitemap not found
2. Links don't match base path
3. Exclude patterns too aggressive

**Solution**: Check logs and adjust filters

```bash
tail -f backend/backend.log | grep -E "(Crawling|sitemap|links)"
```

**Problem**: Crawl takes too long

**Solution**: Reduce limits

```json
{
  "maxDepth": 1,
  "maxPages": 20
}
```

### Content Extraction Issues

**Problem**: No content extracted

**Possible causes**:
1. JavaScript required but not enabled
2. Content in non-standard elements
3. Site blocks scrapers

**Solution**: Enable JavaScript or adjust selectors

```json
{
  "useJavaScript": true,
  "waitForSelector": ".main-content"
}
```

## Examples

### Example 1: React Documentation

```bash
POST /knowledge/sources/:agentId

{
  "name": "React Docs",
  "type": "documentation",
  "url": "https://react.dev/learn",
  "metadata": {
    "title": "React Documentation",
    "tags": ["react", "javascript", "frontend"],
    "preset": "react"
  }
}
```

Auto-applies:
- `useJavaScript: true`
- `waitForSelector: "main article"`
- `maxDepth: 3`
- `maxPages: 100`

### Example 2: Python Standard Library

```bash
POST /knowledge/sources/:agentId

{
  "name": "Python Docs",
  "type": "documentation",
  "url": "https://docs.python.org/3/library/",
  "metadata": {
    "title": "Python Standard Library",
    "tags": ["python", "stdlib"],
    "preset": "python"
  }
}
```

Auto-applies:
- `useJavaScript: false`
- `maxDepth: 3`
- `maxPages: 200`
- Include patterns for `/library/`, `/tutorial/`, `/reference/`

### Example 3: Custom Documentation Site

```bash
POST /knowledge/sources/:agentId

{
  "name": "Internal Docs",
  "type": "documentation",
  "url": "https://docs.internal.company.com",
  "metadata": {
    "title": "Internal Documentation",
    "tags": ["internal", "company"],
    "followLinks": true,
    "maxDepth": 2,
    "maxPages": 100,
    "useJavaScript": false
  }
}
```

## Best Practices

### 1. Start Small

Begin with single pages or small crawls:

```json
{
  "followLinks": false
}
```

Or:

```json
{
  "maxDepth": 1,
  "maxPages": 10
}
```

### 2. Use Appropriate Methods

- **Static sites**: Cheerio (default)
- **SPAs/React apps**: Puppeteer
- **Documentation**: Crawling with sitemap

### 3. Respect Rate Limits

The crawler includes built-in delays (500ms between pages). For external sites, consider:
- Longer delays
- Smaller page limits
- Off-peak crawling

### 4. Monitor Progress

Check logs during crawling:

```bash
tail -f backend/backend.log | grep "Crawling"
```

### 5. Verify Results

After crawling, check statistics:

```bash
GET /knowledge/stats/:agentId
```

## Advanced Usage

### Custom Crawl Configuration

```typescript
import { CrawlOptions } from './document-loader.service';

const options: CrawlOptions = {
  maxDepth: 3,
  maxPages: 100,
  followLinks: true,
  useJavaScript: true,
  waitForSelector: '.documentation',
  includePatterns: [
    /\/docs\//,
    /\/api\//,
    /\/guide\//
  ],
  excludePatterns: [
    /\/blog\//,
    /\/changelog\//,
    /\.(pdf|zip)$/
  ]
};
```

### Creating Custom Presets

Add to `backend/src/knowledge/config/crawl-presets.ts`:

```typescript
export const CRAWL_PRESETS: Record<string, CrawlPreset> = {
  // ... existing presets
  
  myframework: {
    name: 'My Framework',
    description: 'Optimized for My Framework docs',
    useJavaScript: true,
    waitForSelector: '#docs-content',
    maxDepth: 3,
    maxPages: 150,
    includePatterns: [/\/docs\//],
    excludePatterns: [/\/blog\//],
  },
};
```

## Related Files

- `backend/src/knowledge/loaders/document-loader.service.ts` - Main implementation
- `backend/src/knowledge/config/crawl-presets.ts` - Preset configurations
- `shared/src/types/agent.ts` - Type definitions
- `tests/knowledge/test-puppeteer-crawling.sh` - Test suite

## Conclusion

The Puppeteer and crawling implementation provides powerful capabilities for ingesting documentation and web content into agent knowledge bases. With smart defaults, preset configurations, and flexible options, it handles everything from simple static pages to complex JavaScript applications and large documentation sites.

For most use cases, the auto-detected presets and default settings provide excellent results. Advanced users can fine-tune crawling behavior with custom configurations and patterns.
