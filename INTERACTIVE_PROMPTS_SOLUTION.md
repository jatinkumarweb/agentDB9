# Interactive Prompts Solution Guide

**Issue:** Commands like `create-next-app`, `create-react-app`, and other interactive CLIs hang when waiting for user input in automated environments.

**Solution:** Use non-interactive flags and environment variables to bypass prompts.

---

## 1. Next.js Project Creation

### Problem:
```bash
npx create-next-app@latest my-app
# Hangs waiting for interactive prompts:
# - Would you like to use TypeScript?
# - Would you like to use ESLint?
# - Would you like to use Tailwind CSS?
# - etc.
```

### Solution A: Use `--yes` flag (Recommended)
```bash
npx create-next-app@latest my-app --yes
```

This uses saved preferences or defaults for all options.

### Solution B: Specify all options explicitly
```bash
npx create-next-app@latest my-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm
```

### Solution C: Use environment variable
```bash
# Skip all prompts and use defaults
CI=true npx create-next-app@latest my-app
```

### Complete Example with All Options:
```bash
npx create-next-app@latest my-nextjs-app \
  --typescript              # Use TypeScript (default)
  --tailwind                # Use Tailwind CSS (default)
  --eslint                  # Use ESLint
  --app                     # Use App Router (default)
  --src-dir                 # Use src/ directory
  --import-alias "@/*"      # Set import alias
  --use-npm                 # Use npm (or --use-pnpm, --use-yarn, --use-bun)
  --skip-install            # Skip package installation (optional)
```

---

## 2. Create React App

### Problem:
```bash
npx create-react-app my-app
# May prompt for template selection
```

### Solution:
```bash
# With TypeScript
npx create-react-app my-app --template typescript

# With specific template
npx create-react-app my-app --template cra-template-pwa-typescript

# Use npm explicitly
npx create-react-app my-app --use-npm
```

---

## 3. Vite Project Creation

### Problem:
```bash
npm create vite@latest
# Prompts for:
# - Project name
# - Framework selection
# - Variant selection
```

### Solution:
```bash
# Specify project name and template
npm create vite@latest my-vite-app -- --template react-ts

# Available templates:
# - vanilla, vanilla-ts
# - vue, vue-ts
# - react, react-ts
# - preact, preact-ts
# - lit, lit-ts
# - svelte, svelte-ts
# - solid, solid-ts
# - qwik, qwik-ts
```

---

## 4. npm init / yarn create

### Problem:
```bash
npm init
# Prompts for package.json fields
```

### Solution:
```bash
# Use -y flag to accept all defaults
npm init -y

# Or specify package name
npm init -y my-package
```

---

## 5. Git Operations

### Problem:
```bash
git add -p
# Interactive patch mode
```

### Solution:
```bash
# Add all changes without prompts
git add -A

# Or add specific files
git add file1.js file2.js
```

---

## 6. Package Manager Prompts

### npm
```bash
# Skip prompts during install
npm install --yes

# Skip optional dependencies
npm install --no-optional

# Skip audit
npm install --no-audit
```

### yarn
```bash
# Non-interactive mode
yarn install --non-interactive

# Skip integrity check
yarn install --skip-integrity-check
```

### pnpm
```bash
# Non-interactive mode
pnpm install --no-interactive
```

---

## 7. Environment Variables for CI/CD

Set these environment variables to make most tools non-interactive:

```bash
export CI=true
export DEBIAN_FRONTEND=noninteractive
export NPM_CONFIG_YES=true
export YARN_ENABLE_INTERACTIVE=false
```

Add to your shell profile:
```bash
# ~/.bashrc or ~/.zshrc
export CI=true
export NPM_CONFIG_YES=true
```

---

## 8. Common Interactive Tools & Solutions

| Tool | Interactive Command | Non-Interactive Solution |
|------|-------------------|-------------------------|
| create-next-app | `npx create-next-app` | `npx create-next-app --yes` |
| create-react-app | `npx create-react-app` | `npx create-react-app --template typescript` |
| vite | `npm create vite` | `npm create vite -- --template react-ts` |
| npm init | `npm init` | `npm init -y` |
| git add | `git add -p` | `git add -A` |
| apt-get | `apt-get install` | `apt-get install -y` |
| pip | `pip install` | `pip install --yes` |

---

## 9. Wrapper Script for Next.js

Create a helper script for easy Next.js project creation:

```bash
#!/bin/bash
# create-nextjs.sh

PROJECT_NAME=${1:-my-nextjs-app}
USE_TYPESCRIPT=${2:-true}
USE_TAILWIND=${3:-true}

echo "Creating Next.js project: $PROJECT_NAME"

if [ "$USE_TYPESCRIPT" = "true" ]; then
  TS_FLAG="--typescript"
else
  TS_FLAG="--javascript"
fi

if [ "$USE_TAILWIND" = "true" ]; then
  TW_FLAG="--tailwind"
else
  TW_FLAG=""
fi

npx create-next-app@latest "$PROJECT_NAME" \
  $TS_FLAG \
  $TW_FLAG \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

echo "✅ Project created successfully!"
echo "📁 Location: ./$PROJECT_NAME"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_NAME"
echo "  npm run dev"
```

Usage:
```bash
chmod +x create-nextjs.sh

# Create with defaults (TypeScript + Tailwind)
./create-nextjs.sh my-app

# Create JavaScript project without Tailwind
./create-nextjs.sh my-app false false
```

---

## 10. Automated Project Creation Script

Create a comprehensive script that handles multiple frameworks:

```bash
#!/bin/bash
# create-project.sh

show_usage() {
  echo "Usage: ./create-project.sh <framework> <project-name>"
  echo ""
  echo "Frameworks:"
  echo "  nextjs     - Next.js with TypeScript and Tailwind"
  echo "  react      - React with TypeScript"
  echo "  vite-react - Vite + React + TypeScript"
  echo "  vite-vue   - Vite + Vue + TypeScript"
  echo "  node       - Node.js project with package.json"
  echo ""
  echo "Example:"
  echo "  ./create-project.sh nextjs my-awesome-app"
}

if [ $# -lt 2 ]; then
  show_usage
  exit 1
fi

FRAMEWORK=$1
PROJECT_NAME=$2

case $FRAMEWORK in
  nextjs)
    echo "🚀 Creating Next.js project: $PROJECT_NAME"
    npx create-next-app@latest "$PROJECT_NAME" \
      --typescript \
      --tailwind \
      --eslint \
      --app \
      --src-dir \
      --import-alias "@/*" \
      --use-npm
    ;;
  
  react)
    echo "⚛️  Creating React project: $PROJECT_NAME"
    npx create-react-app "$PROJECT_NAME" --template typescript
    ;;
  
  vite-react)
    echo "⚡ Creating Vite + React project: $PROJECT_NAME"
    npm create vite@latest "$PROJECT_NAME" -- --template react-ts
    cd "$PROJECT_NAME" && npm install
    ;;
  
  vite-vue)
    echo "⚡ Creating Vite + Vue project: $PROJECT_NAME"
    npm create vite@latest "$PROJECT_NAME" -- --template vue-ts
    cd "$PROJECT_NAME" && npm install
    ;;
  
  node)
    echo "📦 Creating Node.js project: $PROJECT_NAME"
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    npm init -y
    echo "✅ Created package.json"
    ;;
  
  *)
    echo "❌ Unknown framework: $FRAMEWORK"
    show_usage
    exit 1
    ;;
esac

echo ""
echo "✅ Project created successfully!"
echo "📁 Location: ./$PROJECT_NAME"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_NAME"
if [ "$FRAMEWORK" = "nextjs" ] || [ "$FRAMEWORK" = "vite-react" ] || [ "$FRAMEWORK" = "vite-vue" ]; then
  echo "  npm run dev"
elif [ "$FRAMEWORK" = "react" ]; then
  echo "  npm start"
fi
```

Save as `create-project.sh` and make executable:
```bash
chmod +x create-project.sh

# Usage examples
./create-project.sh nextjs my-nextjs-app
./create-project.sh react my-react-app
./create-project.sh vite-react my-vite-app
```

---

## 11. Add to package.json Scripts

Add helper scripts to your root `package.json`:

```json
{
  "scripts": {
    "create:nextjs": "npx create-next-app@latest --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --use-npm",
    "create:react": "npx create-react-app --template typescript",
    "create:vite": "npm create vite@latest -- --template react-ts"
  }
}
```

Usage:
```bash
npm run create:nextjs my-app
npm run create:react my-app
npm run create:vite my-app
```

---

## 12. Testing Interactive Commands

To test if a command will hang:

```bash
# Method 1: Use timeout
timeout 5 npx create-next-app@latest test-app

# Method 2: Use expect (if installed)
expect -c '
  spawn npx create-next-app@latest test-app
  expect "Would you like to use TypeScript?"
  send "yes\r"
  expect "Would you like to use ESLint?"
  send "yes\r"
  interact
'

# Method 3: Pipe yes command
yes "" | npx create-next-app@latest test-app
```

---

## 13. Troubleshooting

### Issue: Command still hangs
**Solution:** Check if there are hidden prompts or confirmations

```bash
# Enable verbose output
DEBUG=* npx create-next-app@latest my-app --yes

# Or use strace to see what's blocking
strace -e trace=read npx create-next-app@latest my-app --yes
```

### Issue: Defaults not working as expected
**Solution:** Reset preferences

```bash
# For create-next-app
npx create-next-app@latest --reset-preferences

# Then create with --yes
npx create-next-app@latest my-app --yes
```

### Issue: Need to see what options are available
**Solution:** Use --help flag

```bash
npx create-next-app@latest --help
npm create vite@latest -- --help
```

---

## 14. Best Practices

1. **Always use non-interactive flags in scripts**
   ```bash
   # Good
   npx create-next-app@latest my-app --yes
   
   # Bad (will hang in CI/CD)
   npx create-next-app@latest my-app
   ```

2. **Set CI environment variable in automation**
   ```bash
   CI=true npm install
   CI=true npm run build
   ```

3. **Document required flags in README**
   ```markdown
   ## Creating a New Project
   
   Use the following command to avoid interactive prompts:
   \`\`\`bash
   npx create-next-app@latest my-app --yes
   \`\`\`
   ```

4. **Create wrapper scripts for common operations**
   - Easier for team members
   - Consistent project setup
   - Documented in one place

5. **Test in CI/CD environment**
   ```yaml
   # .github/workflows/test.yml
   - name: Create test project
     run: |
       npx create-next-app@latest test-app --yes
       cd test-app
       npm run build
   ```

---

## 15. Quick Reference

### Next.js (Recommended)
```bash
npx create-next-app@latest my-app --yes
```

### Next.js (Full Control)
```bash
npx create-next-app@latest my-app \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm
```

### React
```bash
npx create-react-app my-app --template typescript
```

### Vite
```bash
npm create vite@latest my-app -- --template react-ts
```

### Node.js
```bash
npm init -y
```

---

## Summary

✅ **Use `--yes` flag** for create-next-app  
✅ **Specify templates** for create-react-app and vite  
✅ **Set CI=true** environment variable  
✅ **Create wrapper scripts** for team consistency  
✅ **Document in README** for team members  

**Key Takeaway:** Always use non-interactive flags when running commands in scripts or automation!
