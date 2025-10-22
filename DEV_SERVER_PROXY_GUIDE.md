# Dev Server Proxy Guide

## How to Run Dev Servers Through the Proxy

When running dev servers (Vite, React, Angular) inside the VS Code container, they need to be accessible through the backend proxy for same-origin policy.

### The Flow

1. **Browser** → `http://localhost:8000/proxy/5173/`
2. **Backend Proxy** → strips `/proxy/5173` → forwards to `vscode:5173/`
3. **Vite Server** → serves content from `/`

### Running Vite (Port 5173)

**Inside VS Code terminal:**

```bash
# Create a new Vite project or navigate to existing one
npm create vite@latest my-app -- --template react
cd my-app
npm install

# Run WITHOUT base path configuration
npm run dev -- --host 0.0.0.0 --port 5173
```

**Important:** Do NOT configure a base path in `vite.config.js`. The proxy handles the path routing.

### Running React (Create React App) - Port 3000

```bash
# Inside VS Code terminal
npm start
```

React dev server will run on port 3000. Access via: `http://localhost:8000/proxy/3000/`

### Running Angular - Port 4200

```bash
# Inside VS Code terminal
ng serve --host 0.0.0.0 --port 4200
```

Access via: `http://localhost:8000/proxy/4200/`

### Troubleshooting

#### 404 on `/@vite/client` or `/src/main.jsx`

**Cause:** Vite is running but from the wrong directory (can't find project files).

**Symptoms:**
- Proxy logs show: `✅ Success with vscode:5173`
- But response status: `404`
- Vite is running but can't find files

**Solution:**
```bash
# Inside VS Code terminal, check current directory
pwd

# Should be in your project directory with package.json and src/
ls -la
# Should see: package.json, src/, node_modules/, vite.config.js

# If not in project directory, navigate there:
cd /home/coder/workspace/my-vite-app

# Then run Vite:
npm run dev -- --host 0.0.0.0 --port 5173
```

**Quick Diagnostic:**
```bash
# Check if Vite is running
ps aux | grep vite

# Check what directory Vite is running from
lsof -p $(pgrep -f vite) | grep cwd

# Check if port 5173 is listening
netstat -tlnp | grep 5173
```

#### CORS Errors

**Cause:** Origin mismatch or CORS not configured.

**Solution:** Already fixed in backend - CORS allows all origins in development.

#### WebSocket Connection Failed

**Cause:** Vite HMR (Hot Module Replacement) WebSocket connection.

**Solution:** The proxy supports WebSocket connections. Ensure:
- Vite is running with `--host 0.0.0.0`
- No firewall blocking WebSocket connections

### Correct Vite Configuration

If you need a `vite.config.js`, use this minimal configuration:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Listen on all interfaces
    port: 5173,
    strictPort: true,  // Fail if port is already in use
    // DO NOT set base path - proxy handles routing
  }
})
```

### Port Mappings

The backend proxy automatically maps these ports to the `vscode` container:

- `3000` → React dev server
- `3001` → Additional dev server
- `5173` → Vite dev server
- `4200` → Angular dev server
- `8080` → VS Code itself

### Access URLs

- **VS Code:** `http://localhost:8080` (direct) or `http://localhost:8000/proxy/8080/` (through proxy)
- **Vite:** `http://localhost:8000/proxy/5173/`
- **React:** `http://localhost:8000/proxy/3000/`
- **Angular:** `http://localhost:8000/proxy/4200/`

### Why This Architecture?

1. **Same-Origin Policy:** All requests go through `localhost:8000`, avoiding CORS issues
2. **Security:** Backend can add authentication/authorization
3. **Flexibility:** Works with any dev server on any port
4. **Simplicity:** No complex configuration needed in dev servers

### Example: Complete Vite Setup

```bash
# Inside VS Code container terminal
cd /home/coder/workspace
npm create vite@latest my-vite-app -- --template react-ts
cd my-vite-app
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Then access in browser: `http://localhost:8000/proxy/5173/`

You should see your Vite app with HMR working!
