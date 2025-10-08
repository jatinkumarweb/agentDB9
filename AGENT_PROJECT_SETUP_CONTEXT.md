# Agent Project Setup Context

## Purpose
This document defines the context that should be added to the LLM system prompt so the agent automatically configures projects to work in any environment (VSCode proxy, direct access, cloud IDEs, etc.).

## Current System Prompt Location
`backend/src/conversations/conversations.service.ts` - lines 543-584

## Recommended Context Addition

Add this to the system prompt after the existing Next.js instructions:

```
ENVIRONMENT-AWARE PROJECT CONFIGURATION:

When creating web development projects (Next.js, Vite, React, Angular, etc.), automatically configure them to work in both VSCode proxy mode and direct access mode.

VSCODE CONTAINER ENVIRONMENT:
- Projects run inside VSCode container at /home/coder/workspace/
- VSCode web interface proxies dev servers at: http://localhost:8080/proxy/<port>/
- Direct access also available at: http://localhost:<port>/ (if port is exposed)
- Use environment variable VSCODE_PROXY to toggle between modes

UNIVERSAL PROJECT CONFIGURATION:

1. NEXT.JS PROJECTS:
   After creating with "npx create-next-app@latest project-name --yes":
   
   a) Update next.config.ts:
   ```typescript
   import type { NextConfig } from "next";
   
   const isVSCodeProxy = process.env.VSCODE_PROXY === 'true';
   const port = process.env.PORT || '3000';
   const proxyPath = isVSCodeProxy ? `/proxy/${port}` : '';
   
   const nextConfig: NextConfig = {
     basePath: proxyPath,
     assetPrefix: proxyPath,
     images: { 
       unoptimized: process.env.NODE_ENV === 'development' 
     }
   };
   
   export default nextConfig;
   ```
   
   b) Update package.json scripts:
   ```bash
   cd project-name && npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
   ```
   
   c) Inform user:
   "Project configured for universal access:
   - VSCode proxy: http://localhost:8080/proxy/3000/ (set VSCODE_PROXY=true)
   - Direct access: http://localhost:3000/ (default)"

2. VITE PROJECTS:
   After creating with "npm create vite@latest project-name -- --template react-ts":
   
   a) Update vite.config.ts:
   ```typescript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   
   const isVSCodeProxy = process.env.VSCODE_PROXY === 'true';
   const port = parseInt(process.env.PORT || '5173');
   const proxyPath = isVSCodeProxy ? `/proxy/${port}` : '/';
   
   export default defineConfig({
     plugins: [react()],
     base: proxyPath,
     server: {
       host: '0.0.0.0',
       port: port
     }
   })
   ```
   
   b) Inform user about access URLs

3. ANGULAR PROJECTS:
   After creating with "npx @angular/cli new project-name --skip-git":
   
   a) Update angular.json serve configuration:
   Add to projects.project-name.architect.serve.options:
   ```json
   {
     "host": "0.0.0.0",
     "baseHref": "${VSCODE_PROXY:+/proxy/4200/}",
     "deployUrl": "${VSCODE_PROXY:+/proxy/4200/}"
   }
   ```
   
   b) Or use environment-based approach in package.json

4. CREATE REACT APP:
   CRA doesn't support dynamic basePath well.
   Recommend using direct port access or migrating to Vite.

GENERAL RULES:
- Always bind dev servers to 0.0.0.0 (not localhost)
- Use -H 0.0.0.0 flag for Next.js
- Use --host 0.0.0.0 for Vite
- Use --host 0.0.0.0 for Angular
- Set PORT environment variable for custom ports
- Set VSCODE_PROXY=true for proxy mode (optional, defaults to direct access)

ENVIRONMENT VARIABLE PATTERN:
```bash
# For VSCode proxy mode
VSCODE_PROXY=true npm run dev

# For direct access (default)
npm run dev
```

INFORMING THE USER:
After creating and configuring a project, always inform the user:
"✅ Project created and configured for universal access!

Access your app at:
- VSCode proxy: http://localhost:8080/proxy/<port>/
- Direct access: http://localhost:<port>/

The project automatically detects the environment. No manual configuration needed!

To switch modes:
- Proxy mode: VSCODE_PROXY=true npm run dev
- Direct mode: npm run dev (default)

Commands are logged to .agent-terminal.log"
```

## Implementation Steps

### Step 1: Update System Prompt
Modify `backend/src/conversations/conversations.service.ts` line 556-558 to include the universal configuration context above.

### Step 2: Create Project Templates (Optional)
Create template files in `backend/templates/` for common project types:
- `next.config.template.ts`
- `vite.config.template.ts`
- `angular.json.template`

### Step 3: Add Helper Function
Create a helper in `backend/src/utils/project-config.ts`:

```typescript
export function getProjectConfigInstructions(framework: string, port: string = '3000'): string {
  const configs = {
    'nextjs': `
      Update next.config.ts with universal configuration...
    `,
    'vite': `
      Update vite.config.ts with universal configuration...
    `,
    'angular': `
      Update angular.json with universal configuration...
    `
  };
  
  return configs[framework] || '';
}
```

### Step 4: Update MCP Tool Descriptions
Add environment awareness to the `execute_command` tool description in the system prompt.

## Benefits

1. **Universal Projects**: Work in any environment without reconfiguration
2. **Better UX**: Users don't need to manually configure basePath
3. **Consistent Behavior**: All projects follow the same pattern
4. **Easy Switching**: Single environment variable to toggle modes
5. **Future-Proof**: Works with cloud IDEs, Gitpod, GitHub Codespaces, etc.

## Testing

After implementation, test by asking the agent to:
1. "Create a new Next.js project called test-app"
2. Verify the configuration is automatically applied
3. Test both proxy and direct access modes
4. Verify static files load correctly in both modes

## Maintenance

When new frameworks are added or configuration patterns change:
1. Update this document
2. Update the system prompt
3. Update project templates
4. Test with the agent

## Related Documentation

- `VSCODE_DEV_SERVER_SETUP.md` - User-facing documentation
- `DOCKER_OPTIMIZATION.md` - Container networking details
- `AGENT_TERMINAL_LOG.md` - Command logging details
