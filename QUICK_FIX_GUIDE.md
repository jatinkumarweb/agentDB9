# Quick Fix Guide

## ✅ CRA Working (Port 3000) - Fix WebSocket Error

**Error:** `Refused to connect to 'ws://localhost:3000/ws'`

**Quick Fix:**

```bash
# In vscode container, in your CRA project:
echo "FAST_REFRESH=false" >> .env.local
echo "PUBLIC_URL=/proxy/3000" >> .env.local

# Restart dev server
npm start
```

**Access:** `http://localhost:8000/proxy/3000/`

---

## ❌ Vite Not Working (Port 5173) - Add Configuration

**Problem:** Vite needs `vite.config.js` with base path

**Quick Fix:**

```bash
# In vscode container, in your Vite project:
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/proxy/5173/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: false
  }
})
EOF

# Restart dev server
npm run dev
```

**Access:** `http://localhost:8000/proxy/5173/`

---

## Summary

| Framework | Config | Access URL |
|-----------|--------|------------|
| CRA | `.env.local` with `FAST_REFRESH=false` | http://localhost:8000/proxy/3000/ |
| Vite | `vite.config.js` with `base: '/proxy/5173/'` | http://localhost:8000/proxy/5173/ |
