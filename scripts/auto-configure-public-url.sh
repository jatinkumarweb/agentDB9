#!/bin/bash
# Auto-configure PUBLIC_URL support for any React framework
# This script detects the framework and injects PUBLIC_URL support

set -e

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

if [ ! -f "package.json" ]; then
  echo "❌ No package.json found in $PROJECT_DIR"
  exit 1
fi

echo "🔧 Auto-configuring PUBLIC_URL support..."

# Detect framework
FRAMEWORK="unknown"

if grep -q '"vite"' package.json || [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
  FRAMEWORK="vite"
elif grep -q '"next"' package.json || [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
  FRAMEWORK="nextjs"
elif grep -q '"react-scripts"' package.json; then
  FRAMEWORK="cra"
fi

echo "📦 Detected framework: $FRAMEWORK"

case $FRAMEWORK in
  vite)
    # Configure Vite to use PUBLIC_URL
    if [ -f "vite.config.js" ]; then
      if ! grep -q "process.env.PUBLIC_URL" vite.config.js; then
        echo "⚙️  Updating vite.config.js to support PUBLIC_URL..."
        
        # Backup original
        cp vite.config.js vite.config.js.backup
        
        # Create new config with PUBLIC_URL support
        cat > vite.config.js << 'VITEEOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Universal PUBLIC_URL support (works like Create React App)
const base = process.env.PUBLIC_URL || process.env.VITE_BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
  }
})
VITEEOF
        
        echo "✅ Vite configured to use PUBLIC_URL"
        echo "   Original config backed up to vite.config.js.backup"
      else
        echo "✅ Vite already configured for PUBLIC_URL"
      fi
    elif [ -f "vite.config.ts" ]; then
      if ! grep -q "process.env.PUBLIC_URL" vite.config.ts; then
        echo "⚙️  Updating vite.config.ts to support PUBLIC_URL..."
        
        # Backup original
        cp vite.config.ts vite.config.ts.backup
        
        # Create new config with PUBLIC_URL support
        cat > vite.config.ts << 'VITEEOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Universal PUBLIC_URL support (works like Create React App)
const base = process.env.PUBLIC_URL || process.env.VITE_BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
  }
})
VITEEOF
        
        echo "✅ Vite configured to use PUBLIC_URL"
        echo "   Original config backed up to vite.config.ts.backup"
      else
        echo "✅ Vite already configured for PUBLIC_URL"
      fi
    else
      echo "⚠️  No vite.config.js found, creating one..."
      cat > vite.config.js << 'VITEEOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Universal PUBLIC_URL support (works like Create React App)
const base = process.env.PUBLIC_URL || process.env.VITE_BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
  }
})
VITEEOF
      echo "✅ Created vite.config.js with PUBLIC_URL support"
    fi
    ;;
    
  nextjs)
    echo "📦 Next.js detected"
    if [ -f "next.config.js" ]; then
      if ! grep -q "process.env.PUBLIC_URL" next.config.js; then
        echo "⚠️  Next.js requires manual configuration"
        echo ""
        echo "Add this to your next.config.js:"
        echo ""
        cat << 'NEXTEOF'
module.exports = {
  basePath: process.env.PUBLIC_URL || '',
  assetPrefix: process.env.PUBLIC_URL || '',
  // ... rest of your config
}
NEXTEOF
        echo ""
      else
        echo "✅ Next.js already configured for PUBLIC_URL"
      fi
    else
      echo "⚠️  No next.config.js found"
      echo "   Next.js will work with PUBLIC_URL but you may want to create next.config.js"
    fi
    ;;
    
  cra)
    echo "📦 Create React App detected"
    echo "✅ CRA natively supports PUBLIC_URL - no configuration needed!"
    ;;
    
  *)
    echo "⚠️  Unknown framework"
    echo "   PUBLIC_URL may not work without manual configuration"
    ;;
esac

echo ""
echo "🎉 Configuration complete!"
echo ""
echo "📋 Usage:"
echo "  PUBLIC_URL=/proxy/5173 npm run dev   # Vite"
echo "  PUBLIC_URL=/proxy/3000 npm start     # CRA"
echo "  PUBLIC_URL=/proxy/3000 npm run dev   # Next.js"
echo ""
echo "🌐 Access your app at:"
echo "  http://localhost:8080/proxy/<port>/"
echo ""
