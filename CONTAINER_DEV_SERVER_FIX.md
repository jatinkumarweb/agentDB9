# Container Dev Server Fix - Next.js Static Files Issue

## Problems Identified

### 1. Agent Code Execution Location
**Question:** Where does agent code execute?
**Answer:** Agent code executes in the **backend container** at `/workspace`

- Backend container has volume mount: `./workspace:/workspace`
- VSCode container has volume mount: `./workspace:/home/coder/workspace`
- Both containers share the same workspace directory on the host

### 2. Project Detection Issue
**Problem:** "Not detecting single project when trying to run dev environment"
**Root Cause:** Projects created in workspace are accessible to both containers, but the workspace starts empty

**Solution:** 
- Projects should be created in the `./workspace` directory
- Both backend (for agent execution) and VSCode (for user interaction) can access them
- The workspace is properly mounted in both containers

### 3. Static Files Not Loading in VSCode Container
**Problem:** "When running dev server in VSCode container, JSX content is visible but not static files"
**Root Cause:** Next.js dev server binds to `localhost` (127.0.0.1) by default, which is not accessible from outside the container

**Symptoms:**
- Dev server starts successfully
- React/JSX components render
- Static files from `/public` directory return 404
- Images, SVGs, and other assets don't load

**Technical Explanation:**
When Next.js runs `next dev` in a container:
1. It binds to `localhost:3000` by default
2. `localhost` in a container refers to the container's internal network
3. Port forwarding (e.g., `-p 3000:3000`) forwards the port but can't reach `localhost`
4. The server must bind to `0.0.0.0` to accept connections from outside the container

## Solutions Implemented

### 1. Updated create-project.sh Script
Automatically configures Next.js projects for container environments:

```bash
# After creating Next.js project
cd "$PROJECT_NAME"
npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
npm pkg set scripts.start="next start -H 0.0.0.0"
```

The `-H 0.0.0.0` flag makes Next.js bind to all network interfaces, allowing external access.

### 2. Created configure-nextjs-container.sh Script
Standalone script to fix existing Next.js projects:

```bash
./scripts/configure-nextjs-container.sh ./my-nextjs-app
```

This script:
- Updates package.json scripts to bind to 0.0.0.0
- Creates/updates next.config.ts for container optimization
- Ensures static files are served correctly

### 3. Updated Agent System Prompt
Added container configuration instructions to the agent's knowledge:

```typescript
* For Next.js: Use "npx create-next-app@latest project-name --yes"
  IMPORTANT: After creating Next.js project, configure for container:
  "cd project-name && npm pkg set scripts.dev='next dev --turbopack -H 0.0.0.0' && npm pkg set scripts.start='next start -H 0.0.0.0'"
```

## How It Works

### Before Fix
```json
{
  "scripts": {
    "dev": "next dev --turbopack"
  }
}
```
- Binds to `localhost:3000`
- Not accessible from outside container
- Static files fail to load

### After Fix
```json
{
  "scripts": {
    "dev": "next dev --turbopack -H 0.0.0.0"
  }
}
```
- Binds to `0.0.0.0:3000` (all interfaces)
- Accessible via port forwarding
- Static files load correctly

## Usage

### For New Projects
Use the updated create-project.sh script:
```bash
./scripts/create-project.sh nextjs my-app
cd my-app
npm run dev
```

The project is automatically configured for containers.

### For Existing Projects
Use the configuration script:
```bash
./scripts/configure-nextjs-container.sh ./existing-project
cd existing-project
npm run dev
```

### Manual Configuration
If needed, manually update package.json:
```bash
cd your-nextjs-project
npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
npm pkg set scripts.start="next start -H 0.0.0.0"
```

## Verification

Test that static files work:

1. Create a Next.js project:
   ```bash
   npx create-next-app@latest test-app --yes
   cd test-app
   ```

2. Configure for container:
   ```bash
   npm pkg set scripts.dev="next dev --turbopack -H 0.0.0.0"
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

4. Access the app and check:
   - ✅ Page loads
   - ✅ React components render
   - ✅ Static files from `/public` load
   - ✅ Images and SVGs display correctly

## Technical Details

### Network Binding in Containers

**localhost (127.0.0.1):**
- Only accessible within the container
- Port forwarding doesn't help
- External requests can't reach it

**0.0.0.0 (all interfaces):**
- Accessible from outside the container
- Works with Docker port forwarding
- Allows external connections

### Next.js CLI Options

```bash
next dev -H 0.0.0.0        # Bind to all interfaces
next dev -p 3000           # Specify port
next dev --turbopack       # Use Turbopack (faster)
```

### Docker Port Forwarding

In docker-compose.yml:
```yaml
ports:
  - "3000:3000"  # Host:Container
```

This forwards port 3000 from host to container, but the container must bind to 0.0.0.0 for it to work.

## Related Files

- `scripts/create-project.sh` - Automatically configures new projects
- `scripts/configure-nextjs-container.sh` - Fixes existing projects
- `backend/src/conversations/conversations.service.ts` - Agent system prompt
- `backend/src/mcp/mcp.service.ts` - Agent code execution (workspaceRoot)

## Date Fixed
2025-10-08

## Summary

**Root Causes:**
1. ✅ Agent executes in backend container at `/workspace`
2. ✅ Workspace is properly mounted in both containers
3. ✅ Next.js binds to localhost by default (not accessible in containers)

**Fixes:**
1. ✅ Updated create-project.sh to auto-configure Next.js
2. ✅ Created configure-nextjs-container.sh for existing projects
3. ✅ Updated agent system prompt with container configuration
4. ✅ All Next.js projects now bind to 0.0.0.0 for container access

**Result:** Static files and dev servers now work correctly in container environments.
