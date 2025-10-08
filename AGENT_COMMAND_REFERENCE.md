# Agent Command Reference Guide

**For AI Agents:** This guide provides correct command syntax for common development tasks.

---

## ⚠️ IMPORTANT: Always use non-interactive flags!

Commands must work without user input. Use flags to specify all options.

---

## Next.js Project Creation

### ❌ WRONG (Old/Deprecated):
```bash
npx create-next-app demo --ts
npx create-next-app demo --typescript
```

### ✅ CORRECT (Current):
```bash
# Option 1: Use --yes flag (uses defaults)
npx create-next-app@latest demo --yes

# Option 2: Specify all options explicitly (RECOMMENDED)
npx create-next-app@latest demo \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack \
  --use-npm

# Option 3: Use helper script
/workspaces/agentDB9/scripts/create-project.sh nextjs demo
```

### Available Flags:
- `--typescript` or `--javascript` - Language choice
- `--tailwind` or `--no-tailwind` - Tailwind CSS
- `--eslint` or `--no-eslint` - ESLint
- `--app` or `--pages` - App Router vs Pages Router
- `--src-dir` or `--no-src-dir` - Use src/ directory
- `--import-alias "@/*"` - Import alias
- `--turbopack` or `--no-turbopack` - Turbopack
- `--use-npm`, `--use-pnpm`, `--use-yarn`, `--use-bun` - Package manager
- `--skip-install` - Skip package installation

---

## React Project Creation

### ❌ WRONG:
```bash
npx create-react-app demo
```

### ✅ CORRECT:
```bash
# TypeScript
npx create-react-app demo --template typescript

# JavaScript
npx create-react-app demo --template javascript

# Or use helper script
/workspaces/agentDB9/scripts/create-project.sh react demo
```

---

## Vite Project Creation

### ❌ WRONG:
```bash
npm create vite
```

### ✅ CORRECT:
```bash
# React + TypeScript
npm create vite@latest demo -- --template react-ts

# Vue + TypeScript
npm create vite@latest demo -- --template vue-ts

# Svelte + TypeScript
npm create vite@latest demo -- --template svelte-ts

# Or use helper script
/workspaces/agentDB9/scripts/create-project.sh vite-react demo
```

### Available Templates:
- `vanilla`, `vanilla-ts`
- `react`, `react-ts`
- `vue`, `vue-ts`
- `preact`, `preact-ts`
- `lit`, `lit-ts`
- `svelte`, `svelte-ts`
- `solid`, `solid-ts`

---

## Express.js Project Creation

### ✅ CORRECT:
```bash
# Use helper script (creates full structure)
/workspaces/agentDB9/scripts/create-project.sh express demo

# Or manual setup
mkdir demo && cd demo
npm init -y
npm install express cors dotenv
npm install -D nodemon
```

---

## Node.js Project Creation

### ✅ CORRECT:
```bash
# Use helper script
/workspaces/agentDB9/scripts/create-project.sh node demo

# Or manual
mkdir demo && cd demo
npm init -y
```

---

## Package Installation

### ❌ WRONG:
```bash
npm install
# May prompt for updates or show interactive messages
```

### ✅ CORRECT:
```bash
# Non-interactive install
npm install --yes

# Skip optional dependencies
npm install --no-optional

# Skip audit
npm install --no-audit

# Clean install
npm ci

# With environment variable
CI=true npm install
```

---

## Git Operations

### ❌ WRONG:
```bash
git add -p  # Interactive patch mode
```

### ✅ CORRECT:
```bash
# Add all changes
git add -A

# Add specific files
git add file1.js file2.js

# Add directory
git add src/
```

---

## Docker Commands

### ✅ CORRECT:
```bash
# Build image
docker build -t my-app:latest .

# Run container
docker run -d -p 3000:3000 my-app:latest

# Docker Compose
docker-compose up -d
docker-compose down

# View logs
docker logs container-name
docker-compose logs -f
```

---

## Common Patterns

### 1. Create and Navigate
```bash
# Create Next.js project and enter directory
npx create-next-app@latest demo --yes && cd demo
```

### 2. Install and Start
```bash
# Install dependencies and start dev server
npm install --yes && npm run dev
```

### 3. Build and Test
```bash
# Build and run tests
npm run build && npm test
```

---

## Helper Script Usage

The project includes a helper script that handles all interactive prompts:

```bash
# Show help
/workspaces/agentDB9/scripts/create-project.sh --help

# Create Next.js project
/workspaces/agentDB9/scripts/create-project.sh nextjs my-app

# Create React project
/workspaces/agentDB9/scripts/create-project.sh react my-app

# Create Vite project
/workspaces/agentDB9/scripts/create-project.sh vite-react my-app

# Create Express API
/workspaces/agentDB9/scripts/create-project.sh express my-api

# With options
/workspaces/agentDB9/scripts/create-project.sh nextjs my-app --use-pnpm
/workspaces/agentDB9/scripts/create-project.sh nextjs my-app --skip-install
```

---

## Environment Variables for Non-Interactive Mode

Set these to make commands non-interactive:

```bash
export CI=true
export NPM_CONFIG_YES=true
export DEBIAN_FRONTEND=noninteractive
```

---

## Quick Reference Table

| Task | Correct Command |
|------|----------------|
| Next.js | `npx create-next-app@latest demo --yes` |
| Next.js (full) | `npx create-next-app@latest demo --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm` |
| React | `npx create-react-app demo --template typescript` |
| Vite React | `npm create vite@latest demo -- --template react-ts` |
| Express | `/workspaces/agentDB9/scripts/create-project.sh express demo` |
| Node.js | `npm init -y` |
| Install deps | `npm install --yes` |
| Git add | `git add -A` |

---

## Troubleshooting

### Command hangs waiting for input
**Solution:** Add non-interactive flags or use helper script

### "Unknown option" error
**Solution:** Check flag syntax - use `--typescript` not `--ts`

### Permission denied
**Solution:** Make script executable: `chmod +x scripts/create-project.sh`

---

## For AI Agents

When generating commands:

1. **Always use non-interactive flags**
2. **Use `--yes` or specify all options**
3. **Prefer helper script for complex setups**
4. **Never use deprecated flags like `--ts`**
5. **Test commands before suggesting to users**

### Example Decision Tree:

```
User asks: "Create a Next.js project"
↓
Check: Do they need customization?
├─ No  → Use: npx create-next-app@latest demo --yes
└─ Yes → Use: npx create-next-app@latest demo --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm

OR

Always use helper script:
/workspaces/agentDB9/scripts/create-project.sh nextjs demo
```

---

## Summary

✅ **DO:**
- Use `--yes` flag for defaults
- Specify all options explicitly
- Use helper scripts when available
- Set CI=true environment variable
- Use current, documented flags

❌ **DON'T:**
- Use deprecated flags (`--ts`)
- Rely on interactive prompts
- Assume defaults will work
- Use commands without testing
- Forget to specify package manager

---

**Last Updated:** 2025-10-08  
**Maintained By:** Development Team
