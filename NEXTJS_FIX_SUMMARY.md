# Next.js Project Creation Fix

## Problem
Next.js project creation was failing because the `create-next-app` command now prompts for Turbopack preference, even when all other options are specified.

## Solution
Always include the `--yes` flag to skip all interactive prompts.

## ✅ Correct Commands

### Simple (Recommended)
```bash
npx create-next-app@latest my-app --yes
```

### With All Options
```bash
npx create-next-app@latest my-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --turbopack \
  --use-npm \
  --yes
```

### Using Helper Script
```bash
/workspaces/agentDB9/scripts/create-project.sh nextjs my-app
```

## Key Points

1. **Always use `--yes` flag** - This is the critical fix
2. **`--turbopack` or no flag** - Don't use `--no-turbopack` (not a valid flag)
3. **`--no-src-dir`** - Current default, use this instead of `--src-dir`
4. **Helper script updated** - The create-project.sh script now includes `--yes`

## Files Updated

- ✅ `AGENT_COMMAND_REFERENCE.md` - Updated with correct flags
- ✅ `scripts/create-project.sh` - Added `--yes` flag to all Next.js commands
- ✅ Tested and verified working

## Testing

Both methods tested successfully:
```bash
# Direct command
npx create-next-app@latest test-app --yes

# Helper script
./scripts/create-project.sh nextjs test-app
```

Both complete without any interactive prompts.

## For AI Agents

When a user asks to create a Next.js project, use one of these commands:

**Simplest:**
```bash
npx create-next-app@latest <project-name> --yes
```

**With customization:**
```bash
npx create-next-app@latest <project-name> --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack --use-npm --yes
```

**Using helper:**
```bash
/workspaces/agentDB9/scripts/create-project.sh nextjs <project-name>
```

## Date Fixed
2025-10-08
