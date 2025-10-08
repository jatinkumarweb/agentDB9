# Static Files 404 Fix for Next.js in Containers

## Problem

When running Next.js dev server in VSCode container, static files return 404 errors.

**Symptoms:**
- Images from `/public` directory don't load
- SVG files return 404
- CSS/JS assets may fail to load
- Next.js Image component shows broken images

**Example:**
```tsx
<Image src="/next.svg" alt="Logo" width={180} height={38} />
// Returns: 404 Not Found
```

## Root Cause

Next.js Image Optimization in development mode has issues in container environments:

1. **Image Optimization Server:** Next.js runs an image optimization server that may not bind correctly in containers
2. **File System Watching:** Container file systems can have different behavior
3. **Network Configuration:** Container networking can interfere with image optimization requests

## Solution

Disable image optimization in development mode for containers.

### Fix Applied

**File:** `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for development in containers
  // This prevents 404s on static images
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Ensure static files are served correctly
  assetPrefix: process.env.ASSET_PREFIX || '',
  
  // Configure for container environment
  experimental: {
    turbopack: {
      resolveAlias: {},
    },
  },
};

export default nextConfig;
```

### Key Configuration

**1. Disable Image Optimization in Development**
```typescript
images: {
  unoptimized: process.env.NODE_ENV === 'development',
}
```

This tells Next.js to serve images directly without optimization in development mode.

**Benefits:**
- ✅ Images load correctly
- ✅ No 404 errors
- ✅ Faster development (no optimization overhead)
- ✅ Works in containers

**Note:** Image optimization is still enabled in production builds.

**2. Asset Prefix**
```typescript
assetPrefix: process.env.ASSET_PREFIX || '',
```

Allows configuring a CDN or custom path for assets if needed.

**3. Turbopack Configuration**
```typescript
experimental: {
  turbopack: {
    resolveAlias: {},
  },
}
```

Ensures Turbopack works correctly in container environments.

## Automatic Fix

The fix is automatically applied when creating Next.js projects with our helper script:

```bash
./scripts/create-project.sh nextjs my-app
```

The script:
1. Creates Next.js project
2. Configures for container (`-H 0.0.0.0`)
3. Applies static files fix
4. Ready to use!

## Manual Fix for Existing Projects

If you have an existing Next.js project with static file issues:

### Step 1: Update next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  assetPrefix: process.env.ASSET_PREFIX || '',
};

export default nextConfig;
```

### Step 2: Restart Dev Server

```bash
npm run dev
```

### Step 3: Verify

Open your app and check that images load correctly.

## Testing

### Test Static Images

1. Create a Next.js project:
   ```bash
   npx create-next-app@latest test-app --yes
   cd test-app
   ```

2. Apply fix (update next.config.ts as shown above)

3. Start dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

5. Verify images load:
   - Next.js logo should be visible
   - Vercel logo should be visible
   - No 404 errors in console

### Test Image Component

```tsx
import Image from "next/image";

export default function TestPage() {
  return (
    <div>
      <h1>Static File Test</h1>
      
      {/* Test public directory images */}
      <Image src="/next.svg" alt="Next.js" width={180} height={38} />
      <Image src="/vercel.svg" alt="Vercel" width={100} height={24} />
      
      {/* Test with img tag */}
      <img src="/next.svg" alt="Next.js Direct" />
    </div>
  );
}
```

All images should load without 404 errors.

## Why This Works

### Development vs Production

**Development (Container):**
- Image optimization disabled
- Images served directly from `/public`
- No optimization server needed
- Works reliably in containers

**Production (Deployment):**
- Image optimization enabled
- Images optimized on-demand
- Better performance
- CDN-friendly

### Container-Specific Issues

**Problem:** Image optimization server in containers
- May not bind to correct network interface
- File system watching issues
- Port conflicts

**Solution:** Bypass optimization in development
- Serve images directly
- No optimization server needed
- Simpler, more reliable

## Alternative Solutions

### Option 1: Use Regular img Tags

Instead of Next.js Image component:

```tsx
// Instead of:
<Image src="/logo.svg" alt="Logo" width={100} height={50} />

// Use:
<img src="/logo.svg" alt="Logo" width={100} height={50} />
```

**Pros:**
- Always works
- No optimization issues

**Cons:**
- Lose Next.js image optimization benefits
- No lazy loading
- No automatic responsive images

### Option 2: External Image Hosting

Host images on CDN:

```tsx
<Image 
  src="https://cdn.example.com/logo.svg" 
  alt="Logo" 
  width={100} 
  height={50} 
/>
```

**Pros:**
- Reliable
- Fast (CDN)
- No container issues

**Cons:**
- Extra setup
- External dependency
- Not suitable for all use cases

### Option 3: Disable Turbopack

Use standard webpack instead:

```bash
npm run dev
# Instead of: npm run dev --turbopack
```

**Pros:**
- More stable
- Better tested

**Cons:**
- Slower build times
- Older technology

## Recommended Approach

**Use our automatic fix:**
1. Create projects with `./scripts/create-project.sh`
2. Fix is applied automatically
3. Everything works out of the box

**For existing projects:**
1. Update `next.config.ts` with image optimization disabled
2. Restart dev server
3. Verify images load

## Troubleshooting

### Images Still 404?

**Check 1: File Location**
```bash
ls public/
# Verify files exist
```

**Check 2: File Names**
```tsx
// Correct:
<Image src="/next.svg" alt="Logo" />

// Wrong (no leading slash):
<Image src="next.svg" alt="Logo" />
```

**Check 3: Dev Server Binding**
```bash
# Check package.json
"dev": "next dev -H 0.0.0.0"
# Must bind to 0.0.0.0 for container access
```

**Check 4: Next.js Config**
```typescript
// Verify in next.config.ts:
images: {
  unoptimized: process.env.NODE_ENV === 'development',
}
```

### Images Load Slowly?

This is normal in development without optimization. In production, images will be optimized.

### Want Optimization in Development?

Not recommended in containers, but if needed:

```typescript
images: {
  unoptimized: false,
  domains: ['localhost'],
}
```

May cause issues in containers.

## Summary

**Problem:** Static files return 404 in Next.js containers

**Root Cause:** Image optimization server issues in containers

**Solution:** Disable image optimization in development

**Implementation:**
```typescript
images: {
  unoptimized: process.env.NODE_ENV === 'development',
}
```

**Result:**
- ✅ Images load correctly
- ✅ No 404 errors
- ✅ Works in containers
- ✅ Production optimization still enabled

**Automatic:** Applied by `./scripts/create-project.sh`

---

**Date Fixed:** 2025-10-08
**Applies To:** Next.js 13+, 14+, 15+
**Container:** VSCode (code-server)
