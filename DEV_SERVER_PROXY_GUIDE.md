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

#### 404 on `/@vite/client` or other assets

**Cause:** Vite server isn't running or isn't accessible on the expected port.

**Solution:**
1. Check if Vite is running: `ps aux | grep vite`
2. Check if port 5173 is listening: `netstat -tlnp | grep 5173`
3. Ensure Vite is bound to `0.0.0.0` not `localhost`
4. Check Vite output for the actual port it's using

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
