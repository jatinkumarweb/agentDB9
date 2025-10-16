# Dev Server Quick Start Guide

## TL;DR

Use these commands to start your dev server in AgentDB9:

```bash
# React/Create React App
react-start

# Vite
vite-dev

# Next.js
next-dev
```

That's it! Your app will work correctly with all assets loading through the VSCode proxy.

## Why These Commands?

When running dev servers inside VSCode's code-server (browser-based VSCode), assets need to be served with a `/proxy/<port>` prefix. These convenience commands automatically set the correct `PUBLIC_URL` for you.

## What If I Use `npm start` Instead?

If you use the standard `npm start` command, you'll see 404 errors for JavaScript bundles and other assets. This is because the default `PUBLIC_URL` might not match your port configuration.

### Quick Fix

If you already started with `npm start` and see 404 errors:

1. Stop the server (Ctrl+C)
2. Use the convenience command instead:
   ```bash
   react-start
   ```

Or set `PUBLIC_URL` manually:
```bash
PUBLIC_URL=/proxy/3000 npm start
```

## Accessing Your App

### Through VSCode (Browser)
When using VSCode in the browser, your app is automatically accessible at:
```
http://your-vscode-url/proxy/3000
```

### Direct Access (Port Forwarding)
If port forwarding is configured, you can also access at:
```
http://localhost:3001
```

## Common Ports

| Framework | Port | Command | Access URL |
|-----------|------|---------|------------|
| React/CRA | 3000 | `react-start` | `/proxy/3000` |
| Vite | 5173 | `vite-dev` | `/proxy/5173` |
| Next.js | 3000 | `next-dev` | `/proxy/3000` |
| Webpack | 8080 | `PUBLIC_URL=/proxy/8080 npm start` | `/proxy/8080` |
| Angular | 4200 | `PUBLIC_URL=/proxy/4200 npm start` | `/proxy/4200` |

## Custom Ports

If your project uses a custom port:

```bash
# Set PUBLIC_URL to match your port
PUBLIC_URL=/proxy/YOUR_PORT npm start
```

For example, if your app runs on port 4000:
```bash
PUBLIC_URL=/proxy/4000 npm start
```

## What's Configured Automatically?

The container automatically sets these environment variables:

- `HOST=0.0.0.0` - Binds to all interfaces (required for Docker)
- `WATCHPACK_POLLING=true` - Enables file watching in Docker volumes
- `CHOKIDAR_USEPOLLING=true` - Enables file watching for various tools
- `BROWSER=none` - Disables auto-opening browser (doesn't work in containers)
- `PUBLIC_URL=/proxy/3000` - Default proxy path for assets

## Troubleshooting

### 404 for bundle.js

**Problem**: You see errors like `GET /static/js/bundle.js 404`

**Solution**: 
```bash
# Stop the server (Ctrl+C)
# Use the convenience command
react-start
```

### Assets Load But App Doesn't Work

**Problem**: HTML loads but JavaScript doesn't execute

**Solution**: Check browser console for CORS or path errors. Ensure you're accessing through the correct URL (`/proxy/3000` not just `/`).

### Different Port Than 3000

**Problem**: Your app uses port 5173 (Vite) or another port

**Solution**: Use the appropriate command or set PUBLIC_URL:
```bash
vite-dev  # For Vite on port 5173
# OR
PUBLIC_URL=/proxy/5173 npm run dev
```

## More Information

For detailed information about the container-level configuration:
- [Container-Level Dev Environment](./CONTAINER_DEV_ENV.md)
- [Mac npm Fix](./MAC_NPM_FIX.md)
- [Dev Server Guide](./DEV_SERVER_GUIDE.md)
