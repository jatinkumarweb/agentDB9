# Tool Usage Guide for AI Agents

This guide explains how to properly use tools to create projects and execute commands.

---

## Creating Next.js Projects

### Method 1: Use execute_command with Helper Script (RECOMMENDED)

```json
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh nextjs demo"
}
```

**Advantages:**
- ✅ No interactive prompts
- ✅ Handles all configuration automatically
- ✅ Consistent results
- ✅ Works every time

### Method 2: Use execute_command with Full Flags

```json
{
  "tool": "execute_command",
  "command": "npx create-next-app@latest demo --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --no-turbopack --use-npm"
}
```

**Advantages:**
- ✅ Full control over options
- ✅ No interactive prompts
- ✅ Official Next.js CLI

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

**Advantages:**
- ✅ Uses built-in template
- ✅ Faster (no npm download)
- ✅ Customizable

### ❌ WRONG - DO NOT USE:

```json
{
  "tool": "execute_command",
  "command": "npx create-next-app demo --ts"
}
```

**Why it fails:**
- ❌ `--ts` is deprecated (use `--typescript`)
- ❌ Missing other required flags
- ❌ Will hang waiting for interactive prompts

---

## Creating React Projects

### Method 1: Use Helper Script (RECOMMENDED)

```json
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh react demo"
}
```

### Method 2: Use create-react-app with Template

```json
{
  "tool": "execute_command",
  "command": "npx create-react-app demo --template typescript"
}
```

### Method 3: Use project_init Tool

```json
{
  "tool": "project_init",
  "name": "demo",
  "template": "react-typescript",
  "gitInit": true,
  "installDeps": true
}
```

---

## Creating Vite Projects

### Method 1: Use Helper Script (RECOMMENDED)

```json
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh vite-react demo"
}
```

### Method 2: Use Vite CLI with Template

```json
{
  "tool": "execute_command",
  "command": "npm create vite@latest demo -- --template react-ts"
}
```

---

## Creating Express.js Projects

### Use Helper Script (RECOMMENDED)

```json
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh express demo"
}
```

This creates a complete Express.js structure with:
- Basic server setup
- CORS and middleware
- Environment variables
- Development scripts

---

## Creating Node.js Projects

### Method 1: Use Helper Script

```json
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh node demo"
}
```

### Method 2: Use npm init

```json
{
  "tool": "execute_command",
  "command": "mkdir demo && cd demo && npm init -y"
}
```

### Method 3: Use project_init Tool

```json
{
  "tool": "project_init",
  "name": "demo",
  "template": "node-typescript",
  "gitInit": true,
  "installDeps": true
}
```

---

## Available Templates

Use `project_list_templates` to see all available templates:

```json
{
  "tool": "project_list_templates"
}
```

**Current Templates:**
- `node-typescript` - Node.js with TypeScript
- `react-typescript` - React with Vite and TypeScript
- `nextjs-typescript` - Next.js 14+ with TypeScript and Tailwind
- `python-basic` - Python with pytest

---

## Command Execution Best Practices

### 1. Always Use Non-Interactive Flags

```json
// ✅ GOOD
{
  "tool": "execute_command",
  "command": "npm install --yes"
}

// ❌ BAD
{
  "tool": "execute_command",
  "command": "npm install"
}
```

### 2. Chain Commands with &&

```json
{
  "tool": "execute_command",
  "command": "mkdir demo && cd demo && npm init -y"
}
```

### 3. Use Absolute Paths for Scripts

```json
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh nextjs demo"
}
```

### 4. Set Working Directory When Needed

```json
{
  "tool": "execute_command",
  "command": "npm run dev",
  "workingDirectory": "/workspaces/agentDB9/demo"
}
```

---

## Common Workflows

### Workflow 1: Create and Start Next.js Project

```json
// Step 1: Create project
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh nextjs my-app"
}

// Step 2: Start dev server
{
  "tool": "execute_command",
  "command": "npm run dev",
  "workingDirectory": "/workspaces/agentDB9/my-app"
}
```

### Workflow 2: Create and Build React Project

```json
// Step 1: Create project
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh react my-app"
}

// Step 2: Build project
{
  "tool": "execute_command",
  "command": "npm run build",
  "workingDirectory": "/workspaces/agentDB9/my-app"
}
```

### Workflow 3: Create Express API and Start

```json
// Step 1: Create project
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh express my-api"
}

// Step 2: Start dev server
{
  "tool": "execute_command",
  "command": "npm run dev",
  "workingDirectory": "/workspaces/agentDB9/my-api"
}
```

---

## Troubleshooting

### Issue: Command hangs or times out

**Cause:** Interactive prompts waiting for user input

**Solution:** Use helper script or add non-interactive flags

```json
// Instead of this:
{
  "tool": "execute_command",
  "command": "npx create-next-app demo"
}

// Use this:
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh nextjs demo"
}
```

### Issue: "Unknown option" error

**Cause:** Using deprecated or incorrect flags

**Solution:** Check AGENT_COMMAND_REFERENCE.md for correct flags

```json
// Instead of --ts (deprecated):
{
  "tool": "execute_command",
  "command": "npx create-next-app demo --ts"
}

// Use --typescript:
{
  "tool": "execute_command",
  "command": "npx create-next-app@latest demo --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --no-turbopack --use-npm"
}
```

### Issue: Project created but incomplete

**Cause:** Command exited before completion

**Solution:** Use helper script which waits for completion

```json
{
  "tool": "execute_command",
  "command": "/workspaces/agentDB9/scripts/create-project.sh nextjs demo"
}
```

---

## Decision Tree for Project Creation

```
User wants to create a project
↓
What type?
├─ Next.js
│  └─ Use: /workspaces/agentDB9/scripts/create-project.sh nextjs <name>
│
├─ React
│  └─ Use: /workspaces/agentDB9/scripts/create-project.sh react <name>
│
├─ Vite (React/Vue/Svelte)
│  └─ Use: /workspaces/agentDB9/scripts/create-project.sh vite-react <name>
│
├─ Express.js
│  └─ Use: /workspaces/agentDB9/scripts/create-project.sh express <name>
│
├─ Node.js
│  └─ Use: /workspaces/agentDB9/scripts/create-project.sh node <name>
│
└─ Other
   └─ Use: project_init with appropriate template
```

---

## Quick Reference

| Framework | Command |
|-----------|---------|
| Next.js | `/workspaces/agentDB9/scripts/create-project.sh nextjs <name>` |
| React | `/workspaces/agentDB9/scripts/create-project.sh react <name>` |
| Vite React | `/workspaces/agentDB9/scripts/create-project.sh vite-react <name>` |
| Express | `/workspaces/agentDB9/scripts/create-project.sh express <name>` |
| Node.js | `/workspaces/agentDB9/scripts/create-project.sh node <name>` |

---

## Summary

✅ **Always use:**
- Helper scripts for project creation
- Non-interactive flags
- Absolute paths for scripts
- Proper working directories

❌ **Never use:**
- Deprecated flags (`--ts`)
- Commands without flags
- Interactive prompts
- Relative paths for scripts

---

**For AI Agents:** When a user asks to create a project, always use the helper script first. It's the most reliable method.

**Last Updated:** 2025-10-08
