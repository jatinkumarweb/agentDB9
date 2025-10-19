# PUBLIC_URL Fix for Proxy

## The Solution (Updated)

The proxy now forwards the FULL path including `/proxy/{port}/` prefix to the dev server.

### ✅ Correct Configuration

```bash
export PUBLIC_URL="/proxy/3000"
npm start
```

### Why This Works

Browser requests:
```
http://localhost:8000/proxy/3000/static/js/bundle.js
```

Proxy forwards FULL path to dev server:
```
http://vscode:3000/proxy/3000/static/js/bundle.js
```

Dev server (configured with `PUBLIC_URL=/proxy/3000/`):
```
✅ Recognizes /proxy/3000/ prefix
✅ Serves /static/js/bundle.js
✅ Returns JavaScript file
```

## How It Works

### Request Flow

```
Browser
  ↓
Requests: http://localhost:8000/proxy/3000/static/js/bundle.js
  ↓
Backend Proxy
  ↓
Forwards FULL path: /proxy/3000/static/js/bundle.js
  ↓
Requests: http://vscode:3000/proxy/3000/static/js/bundle.js
  ↓
VSCode Dev Server (PUBLIC_URL="/proxy/3000")
  ↓
Recognizes /proxy/3000/ prefix
  ↓
Serves: /static/js/bundle.js ✅
  ↓
Returns JavaScript file
  ↓
Proxy forwards to browser
  ↓
Browser executes bundle.js ✅
```

## Implementation

### Option 1: Update vscode setup script

Change `setup-dev-env-simple.sh`:

```bash
# OLD (wrong for proxy)
export PUBLIC_URL="/proxy/${port}"

# NEW (correct for proxy)
export PUBLIC_URL="/"
```

### Option 2: Manual override

When starting dev server in vscode:

```bash
cd /home/coder/workspace/your-project
PUBLIC_URL="/" npm start
```

### Option 3: Remove PUBLIC_URL entirely

```bash
cd /home/coder/workspace/your-project
unset PUBLIC_URL
npm start
```

## Why This Works

The proxy acts as a path translator:

1. **Browser sees:** `/proxy/3000/static/js/bundle.js`
2. **Proxy strips:** `/proxy/3000/` prefix
3. **Dev server sees:** `/static/js/bundle.js`
4. **Dev server serves:** File from root

The dev server doesn't need to know about the `/proxy/3000/` prefix because the proxy handles it.

## For Different Frameworks

### Create React App (CRA)
```bash
PUBLIC_URL="/" npm start
```

### Vite
```javascript
// vite.config.js
export default {
  base: '/',  // Not '/proxy/5173/'
}
```

### Next.js
```javascript
// next.config.js
module.exports = {
  basePath: '',  // Empty, not '/proxy/3000'
}
```

### Angular
```json
// angular.json
"baseHref": "/",  // Not "/proxy/4200/"
```

## Testing

After fixing PUBLIC_URL:

```bash
# 1. Restart dev server with correct PUBLIC_URL
cd /home/coder/workspace/your-project
PUBLIC_URL="/" npm start

# 2. Test direct access (in vscode terminal)
curl http://localhost:3000/static/js/bundle.js
# Should return JavaScript code

# 3. Test via proxy
curl http://localhost:8000/proxy/3000/static/js/bundle.js
# Should return the same JavaScript code

# 4. Access in browser
http://localhost:8000/proxy/3000/
# bundle.js should load without MIME type error
```

## Verification

Check browser console:
- ✅ No MIME type errors
- ✅ bundle.js loads successfully
- ✅ App renders correctly

Check backend logs:
```
Trying: http://vscode:3000/static/js/bundle.js
✅ Success with vscode:3000
Response status: 200
Response content-type: application/javascript
```

## Summary

- **Dev server PUBLIC_URL:** `/` or empty
- **Proxy handles:** `/proxy/3000/` prefix
- **Dev server serves:** Files from root
- **Browser receives:** Correct JavaScript files

The proxy is the "public" interface, the dev server is the "private" backend.
