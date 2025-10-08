# Agent System Prompt Update - Project Creation Commands

## Problem
The agent was generating incorrect commands for creating Next.js projects, missing the critical `--yes` flag that prevents interactive prompts.

**Incorrect command generated:**
```bash
npx create-next-app next-demo
```

**Error result:**
```
Command failed: npx create-next-app next-demo
npm warn exec The following package was not found and will be installed: create-next-app@15.5.4
```

The command hangs waiting for user input (Turbopack prompt).

## Solution
Updated the agent's system prompt in `backend/src/conversations/conversations.service.ts` to include correct commands for all major frameworks.

## Changes Made

### 1. Updated System Prompt (Line 551-558)
Added framework-specific commands to the AVAILABLE TOOLS section:

```typescript
AVAILABLE TOOLS:
- execute_command: Run shell commands. Args: {"command": "your command here"}
  * For npm projects: Use "mkdir project-name && cd project-name && npm init -y"
  * For Next.js: Use "npx create-next-app@latest project-name --yes" (ALWAYS include --yes flag)
  * For React: Use "npx create-react-app project-name --template typescript"
  * For Vite: Use "npm create vite@latest project-name -- --template react-ts"
  * NEVER use "npm init -y --name" (this tries to run create-name package)
  * To set package name after init: "npm pkg set name=project-name"
```

### 2. Updated Tool Description (Line 901)
```typescript
'execute_command': 'Execute a shell command. For Next.js: npx create-next-app@latest name --yes. For React: npx create-react-app name --template typescript. For npm: mkdir dir && cd dir && npm init -y (NEVER use npm init --name).'
```

### 3. Updated Tool Parameters (Line 936-938)
```typescript
command: { 
  type: 'string', 
  description: 'Shell command to execute. Next.js: npx create-next-app@latest name --yes. React: npx create-react-app name --template typescript. Vite: npm create vite@latest name -- --template react-ts. npm: mkdir dir && cd dir && npm init -y. For package.json: npm pkg set key=value.' 
}
```

## Correct Commands Reference

### Next.js
```bash
# Simple (uses defaults)
npx create-next-app@latest project-name --yes

# With options
npx create-next-app@latest project-name --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack --use-npm --yes
```

### React
```bash
# TypeScript
npx create-react-app project-name --template typescript

# JavaScript
npx create-react-app project-name
```

### Vite
```bash
# React + TypeScript
npm create vite@latest project-name -- --template react-ts

# Vue + TypeScript
npm create vite@latest project-name -- --template vue-ts

# Svelte + TypeScript
npm create vite@latest project-name -- --template svelte-ts
```

### Plain Node.js
```bash
mkdir project-name && cd project-name && npm init -y
```

## Expected Agent Behavior

When a user asks to "create a Next.js project named demo", the agent should now:

1. Generate the correct command:
   ```json
   {
     "tool_name": "execute_command",
     "arguments": {
       "command": "npx create-next-app@latest demo --yes"
     }
   }
   ```

2. Execute it without any interactive prompts

3. Return success message with project details

## Testing

To test the fix:

1. Restart the backend service:
   ```bash
   docker-compose restart backend
   ```

2. Ask the agent: "create a Next.js project named test-demo"

3. Verify the command includes `--yes` flag

4. Confirm project is created successfully

## Related Files

- `backend/src/conversations/conversations.service.ts` - Main system prompt
- `AGENT_COMMAND_REFERENCE.md` - Command reference for developers
- `NEXTJS_FIX_SUMMARY.md` - Next.js specific fix documentation
- `scripts/create-project.sh` - Helper script with correct commands

## Date Updated
2025-10-08
