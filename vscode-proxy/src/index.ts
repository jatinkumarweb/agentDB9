import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

const app = express();
const PORT = process.env.VSCODE_PROXY_PORT || 8081;
const VSCODE_URL = process.env.VSCODE_URL || 'http://vscode:8080';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_make_it_long_and_secure_for_production_use_at_least_32_chars';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for VS Code iframe
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(cookieParser());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Get token from cookie or Authorization header
  const token = req.cookies['auth-token'] || 
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.',
      redirectTo: '/auth/login'
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ 
      error: 'Invalid token.',
      redirectTo: '/auth/login'
    });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'VS Code Proxy',
    timestamp: new Date().toISOString()
  });
});

// Authentication status endpoint
app.get('/auth/status', authenticateToken, (req, res) => {
  res.json({ 
    authenticated: true, 
    user: (req as any).user 
  });
});

// VS Code proxy with authentication
const vscodeProxy = createProxyMiddleware({
  target: VSCODE_URL,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  logLevel: 'info',
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    if (res && !res.headersSent) {
      res.status(500).json({ error: 'VS Code service unavailable' });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add user information to headers for VS Code
    const user = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-ID', user.sub);
      proxyReq.setHeader('X-User-Email', user.email);
      proxyReq.setHeader('X-User-Name', user.username);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Remove X-Frame-Options to allow embedding in iframe
    delete proxyRes.headers['x-frame-options'];
    
    // Set headers to allow embedding
    proxyRes.headers['X-Frame-Options'] = 'SAMEORIGIN';
    proxyRes.headers['Content-Security-Policy'] = "frame-ancestors 'self' " + FRONTEND_URL;
  }
});

// Apply authentication to all VS Code routes
app.use('/', authenticateToken, vscodeProxy);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🔐 VS Code Proxy running on port ${PORT}`);
  console.log(`🎯 Proxying to: ${VSCODE_URL}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
});

// Handle WebSocket upgrade for VS Code
server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
  // Extract token from query params or headers for WebSocket
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const token = url.searchParams.get('token') || 
                request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  try {
    jwt.verify(token, JWT_SECRET);
    // If token is valid, proxy the WebSocket connection
    // Create a minimal request-like object for the proxy
    const proxyReq = request as any;
    proxyReq.url = request.url;
    proxyReq.headers = request.headers;
    proxyReq.method = request.method;
    
    if (vscodeProxy.upgrade) {
      vscodeProxy.upgrade(proxyReq, socket, head);
    }
  } catch (error) {
    console.error('WebSocket auth failed:', error);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down VS Code Proxy...');
  server.close(() => {
    console.log('VS Code Proxy stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down VS Code Proxy...');
  server.close(() => {
    console.log('VS Code Proxy stopped');
    process.exit(0);
  });
});