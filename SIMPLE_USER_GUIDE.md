## Simple Auto-Configuration Guide

### How It Works

Projects are automatically configured **the first time** you run the `dev` command. No complex hooks, no tracking - just simple and fast.

### Quick Start

```bash
# 1. Create or navigate to your project
cd my-vite-app

# 2. Start dev server (auto-configures on first run)
dev 5173

# That's it!
```

### First Time Experience

```bash
$ cd my-vite-app
$ dev 5173

🔧 First time in this project, configuring...

  📦 Detected: Vite
  ✅ Configured for PUBLIC_URL

✅ Project configured!

🚀 Starting dev server on port 5173
📦 PUBLIC_URL: /proxy/5173
🌐 Access at: http://localhost:8080/proxy/5173/

> vite dev
...
```

### Subsequent Times

```bash
$ dev 5173

🚀 Starting dev server on port 5173
📦 PUBLIC_URL: /proxy/5173
🌐 Access at: http://localhost:8080/proxy/5173/

> vite dev
...
```

### Commands

| Command | Description |
|---------|-------------|
| `dev 5173` | Start dev server on port 5173 (auto-configures first time) |
| `vite-dev` | Shortcut for Vite projects (port 5173) |
| `react-start` | Shortcut for CRA projects (port 3000) |
| `next-dev` | Shortcut for Next.js projects (port 3000) |
| `reconfig` | Reset configuration (re-configures on next `dev` run) |
| `config_status` | Show configuration status |

### Examples

#### Vite Project

```bash
cd my-vite-app
vite-dev  # Auto-configures and starts on port 5173
```

#### Create React App

```bash
cd my-react-app
react-start  # Auto-configures and starts on port 3000
```

#### Custom Port

```bash
cd my-app
dev 8080  # Auto-configures and starts on port 8080
```

### How It Works

1. **First run:** Checks for `.configured` file
2. **If not found:** Detects framework and configures
3. **Creates `.configured`:** Marks project as configured
4. **Starts dev server:** With correct PUBLIC_URL

### Supported Frameworks

| Framework | Auto-Config | Command |
|-----------|-------------|---------|
| **Vite** | ✅ Yes | `vite-dev` or `dev 5173` |
| **Create React App** | ✅ Native | `react-start` or `dev 3000` |
| **Next.js** | ⚠️ Manual | `next-dev` or `dev 3000` |

### Re-configuration

If you need to reconfigure:

```bash
reconfig
dev 5173  # Will reconfigure
```

Or manually:

```bash
rm .configured
dev 5173  # Will reconfigure
```

### Check Status

```bash
config_status

# Output:
📊 Project Configuration Status
================================
Directory: /workspaces/agentDB9/workspace/my-vite-app
Status: ✅ Configured
Type: Vite
PUBLIC_URL: ✅ Enabled
```

### What Gets Changed

#### Vite Projects

**Before:**
```javascript
export default defineConfig({
  plugins: [react()],
})
```

**After:**
```javascript
export default defineConfig({
  plugins: [react()],
  base: process.env.PUBLIC_URL || '/',  // ← Added
})
```

#### Create React App

No changes needed - native `PUBLIC_URL` support!

#### Next.js

Shows manual configuration instructions.

### Benefits

✅ **Simple** - Just run `dev <port>`
✅ **Fast** - One-time configuration
✅ **Clear** - Know exactly when it happens
✅ **Reliable** - No complex logic

### Troubleshooting

#### Still getting 404 errors?

```bash
# 1. Check if configured
config_status

# 2. If not configured, run
dev 5173

# 3. If already configured, reconfigure
reconfig
dev 5173

# 4. Verify PUBLIC_URL in config
grep "PUBLIC_URL" vite.config.js
```

#### Want to reconfigure?

```bash
reconfig
dev 5173
```

#### Configuration not working?

```bash
# Manually run configuration script
bash /workspaces/agentDB9/scripts/auto-configure-public-url.sh .

# Then start dev server
PUBLIC_URL=/proxy/5173 npm run dev
```

### Summary

**Old way (manual):**
```bash
cd my-project
bash /path/to/configure-script.sh
PUBLIC_URL=/proxy/5173 npm run dev
```

**New way (automatic):**
```bash
cd my-project
dev 5173  # Auto-configures first time
```

That's it! Simple, fast, and just works.
