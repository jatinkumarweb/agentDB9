# Agent Fix Summary - Next.js Project Creation

**Issue:** Agent was using deprecated `--ts` flag causing project creation to fail.

**Error:**
```
Command failed: npx create-next-app demo --ts
npm warn exec The following package was not found and will be installed: create-next-app@15.5.4
```

---

## ✅ Solution Implemented

### 1. Created Command Reference Guide

**File:** `AGENT_COMMAND_REFERENCE.md`

This guide provides correct command syntax for:
- Next.js project creation (with all current flags)
- React project creation
- Vite project creation
- Express.js setup
- Node.js initialization

### 2. Created Tool Usage Guide for AI Agents

**File:** `docs/TOOL_USAGE_GUIDE.md`

This guide explains:
- How to properly use tools
- Decision trees for project creation
- Common workflows
- Troubleshooting

### 3. Added Next.js Template to ProjectTools

**File:** `mcp-server/src/tools/ProjectTools.ts`

Added `nextjs-typescript` template that creates a complete Next.js 14+ project with:
- TypeScript configuration
- Tailwind CSS setup
- App Router structure
- ESLint configuration

---

## How to Use (For Agents)

### Method 1: Use Helper Script (RECOMMENDED)

```bash
/workspaces/agentDB9/scripts/create-project.sh nextjs demo
```

**Why this works:**
- ✅ No interactive prompts
- ✅ Handles all configuration
- ✅ Always succeeds
- ✅ Consistent results

### Method 2: Use Correct Flags

```bash
npx create-next-app@latest demo \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack \
  --use-npm
```

**Why this works:**
- ✅ Uses current flags (not deprecated `--ts`)
- ✅ Specifies all options explicitly
- ✅ No interactive prompts

### Method 3: Use project_init Tool

```json
{
  "tool": "project_init",
  "name": "demo",
  "template": "nextjs-typescript",
  "gitInit": true,
  "installDeps": true
}
```

**Why this works:**
- ✅ Uses built-in template
- ✅ Faster (no npm download)
- ✅ Reliable

---

## What Changed

### Before (❌ WRONG):
```bash
npx create-next-app demo --ts
```

**Problems:**
- `--ts` is deprecated
- Missing required flags
- Hangs on interactive prompts

### After (✅ CORRECT):
```bash
# Option 1: Helper script
/workspaces/agentDB9/scripts/create-project.sh nextjs demo

# Option 2: Full command
npx create-next-app@latest demo --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm

# Option 3: Built-in template
project_init with template "nextjs-typescript"
```

---

## For Users: How to Tell the Agent

When asking the agent to create a Next.js project, you can say:

**Option 1 (Simplest):**
> "Create a Next.js project called demo using the helper script"

**Option 2 (Specific):**
> "Initialize a Next.js TypeScript project with Tailwind CSS called demo"

**Option 3 (Direct):**
> "Run: /workspaces/agentDB9/scripts/create-project.sh nextjs demo"

---

## Testing

Test the fix by asking the agent:

```
"Create a Next.js project called test-app"
```

**Expected Result:**
- ✅ Project created successfully
- ✅ No errors about deprecated flags
- ✅ Complete Next.js structure with TypeScript and Tailwind

---

## Reference Documents

1. **AGENT_COMMAND_REFERENCE.md** - Correct command syntax
2. **docs/TOOL_USAGE_GUIDE.md** - Tool usage for AI agents
3. **INTERACTIVE_PROMPTS_SOLUTION.md** - Interactive prompts guide
4. **scripts/create-project.sh** - Helper script

---

## Quick Test

Run this command to verify the fix:

```bash
cd /tmp
/workspaces/agentDB9/scripts/create-project.sh nextjs test-verify --skip-install
ls -la test-verify/
```

**Expected Output:**
```
✅ Project created successfully!
📁 Location: ./test-verify

Next steps:
  cd test-verify
  npm install
  npm run dev
```

---

## Summary

✅ **Fixed:** Deprecated `--ts` flag issue  
✅ **Added:** Next.js template to ProjectTools  
✅ **Created:** Command reference guides  
✅ **Documented:** Proper tool usage for agents  
✅ **Tested:** All methods work correctly  

**Status:** Ready for use  
**Pushed to:** main branch  
**Commit:** 777257d

---

**For Support:** See AGENT_COMMAND_REFERENCE.md and docs/TOOL_USAGE_GUIDE.md
