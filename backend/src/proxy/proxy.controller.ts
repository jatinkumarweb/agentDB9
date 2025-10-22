import { Controller, All, Req, Res, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import axios from 'axios';
import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * Proxy Controller - Forwards requests to local dev servers
 * 
 * ⚠️  WARNING: JWT authentication is currently DISABLED for development
 * TODO: Re-enable authentication before deploying to production
 * 
 * Security considerations:
 * - CORS headers are permissive (allows any origin)
 * - No authentication required (commented out)
 * - Should only be used in trusted development environments
 */
@Controller('proxy')
export class ProxyController {
  
  // Cache for proxy middleware instances (supports WebSocket)
  private proxyCache: Map<string, any> = new Map();
  
  /**
   * Add CORS headers for proxy routes only
   * This allows browser access to proxied dev servers without compromising app security
   */
  private setCorsHeaders(req: Request, res: Response) {
    // Allow requests from any origin for proxy routes
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  /**
   * Get or create a proxy middleware for a specific target
   * Supports WebSocket connections for VS Code
   */
  private getProxyMiddleware(target: string, port: string) {
    const cacheKey = `${target}:${port}`;
    
    if (!this.proxyCache.has(cacheKey)) {
      console.log(`Creating WebSocket-aware proxy for ${cacheKey}`);
      
      const proxy = createProxyMiddleware({
        target,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
        logLevel: 'debug',
        pathRewrite: (path, req) => {
          // For VS Code (port 8080), strip /proxy/8080 prefix
          if (port === '8080' && path.startsWith(`/proxy/${port}`)) {
            const newPath = path.substring(`/proxy/${port}`.length) || '/';
            console.log(`[WebSocket Proxy] Path rewrite: ${path} → ${newPath}`);
            return newPath;
          }
          // For dev servers, keep full path
          return path;
        },
        onProxyReq: (proxyReq, req, res) => {
          console.log(`[Proxy] ${req.method} ${req.url} → ${target}`);
        },
        onProxyReqWs: (proxyReq, req, socket, options, head) => {
          console.log(`[WebSocket Proxy] Upgrading connection to ${target}`);
          console.log(`[WebSocket Proxy] Original URL: ${req.url}`);
        },
        onError: (err, req, res) => {
          console.error(`[Proxy Error] ${err.message}`);
          if (res instanceof Response && !res.headersSent) {
            res.status(502).json({
              error: 'Bad Gateway',
              message: `Proxy error: ${err.message}`,
            });
          }
        },
        onProxyRes: (proxyRes, req, res) => {
          // Remove headers that block iframe embedding
          delete proxyRes.headers['x-frame-options'];
          delete proxyRes.headers['content-security-policy'];
        },
      });
      
      this.proxyCache.set(cacheKey, proxy);
    }
    
    return this.proxyCache.get(cacheKey);
  }

  /**
   * Handle OPTIONS preflight requests (no authentication required)
   * 
   * TODO: Re-enable JWT authentication for production
   * Currently disabled for development/testing
   */
  @All(':port/*')
  @Public()
  async handleOptionsOrProxy(
    @Param('port') port: string,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Set CORS headers for all proxy requests
    this.setCorsHeaders(req, res);
    
    // Handle OPTIONS preflight (no auth required)
    if (req.method === 'OPTIONS') {
      console.log('=== OPTIONS PREFLIGHT ===');
      console.log('Port:', port);
      console.log('Origin:', req.headers.origin);
      res.status(204).send();
      return;
    }
    
    // Check if this is a WebSocket upgrade request
    const isWebSocket = req.headers.upgrade?.toLowerCase() === 'websocket';
    
    if (isWebSocket) {
      console.log('=== WEBSOCKET UPGRADE REQUEST ===');
      console.log('Port:', port);
      console.log('URL:', req.url);
      
      // Use http-proxy-middleware for WebSocket support
      return this.proxyRequestWithWebSocket(port, req, res);
    }
    
    // TODO: TEMPORARILY DISABLED - Re-enable for production
    // For non-OPTIONS requests, require authentication
    // if (!user) {
    //   console.log('=== PROXY REQUEST - UNAUTHORIZED ===');
    //   res.status(401).json({
    //     statusCode: 401,
    //     message: 'Unauthorized - JWT token required',
    //   });
    //   return;
    // }
    
    // Proceed with proxy request (auth check disabled for now)
    return this.proxyRequest(port, user, req, res);
  }
  
  /**
   * Proxy request with WebSocket support using http-proxy-middleware
   */
  private async proxyRequestWithWebSocket(
    port: string,
    req: Request,
    res: Response,
  ) {
    console.log('=== WEBSOCKET PROXY START ===');
    console.log('Port:', port);
    console.log('URL:', req.url);
    
    // Map ports to Docker service names
    const defaultServiceMap: Record<string, string> = {
      '3000': 'vscode',
      '3001': 'vscode',
      '5173': 'vscode',
      '4200': 'vscode',
      '8080': 'vscode',
    };
    
    const serviceMap = { ...defaultServiceMap };
    if (process.env.PROXY_SERVICE_MAP) {
      const customMappings = process.env.PROXY_SERVICE_MAP.split(',');
      customMappings.forEach(mapping => {
        const [mapPort, service] = mapping.split(':');
        if (mapPort && service) {
          serviceMap[mapPort.trim()] = service.trim();
        }
      });
    }
    
    // Determine target host
    const host = serviceMap[port] || 'localhost';
    const target = `http://${host}:${port}`;
    
    console.log(`WebSocket target: ${target}`);
    
    // Get or create proxy middleware
    const proxy = this.getProxyMiddleware(target, port);
    
    // Use the proxy middleware
    return proxy(req, res);
  }

  /**
   * Universal proxy route: /proxy/{port}/*
   * Forwards requests to localhost:{port}
   * Works for any dev server (React, Vite, Angular, etc.)
   */
  private async proxyRequest(
    port: string,
    user: any,
    req: Request,
    res: Response,
  ) {
    console.log('=== PROXY REQUEST START ===');
    console.log('User:', user ? `${user.id} ${user.email}` : 'No authentication (disabled)');
    console.log('Method:', req.method);
    console.log('Original URL:', req.url);
    console.log('Port param:', port);
    console.log('Origin:', req.headers.origin);
    console.log('Referer:', req.headers.referer);
    
    try {
      
      // Handle path differently for VS Code vs dev servers
      // - VS Code (8080): Strip /proxy/8080 prefix, send only /?folder=...
      // - Dev servers (5173, 3000, etc.): Keep full path /proxy/{port}/ for PUBLIC_URL
      const proxyPrefix = `/proxy/${port}`;
      let path = req.url;
      
      // For VS Code (port 8080), strip the proxy prefix
      if (port === '8080' && path.startsWith(proxyPrefix)) {
        path = path.substring(proxyPrefix.length);
        // Ensure path starts with /
        if (!path.startsWith('/')) {
          path = '/' + path;
        }
        console.log('VS Code proxy: stripped prefix');
      } else {
        // For dev servers, keep the full path for PUBLIC_URL compatibility
        console.log('Dev server proxy: keeping full path');
      }
      
      console.log('Original URL:', req.url);
      console.log('Target path:', path);
      console.log('Query string:', path.includes('?') ? path.split('?')[1] : 'none');
      
      // Map ports to Docker service names (for inter-container communication)
      // Can be overridden via PROXY_SERVICE_MAP env var: "3000:vscode,5173:devserver"
      const defaultServiceMap: Record<string, string> = {
        '3000': 'vscode',  // VSCode container dev server
        '3001': 'vscode',  // VSCode container additional port
        '5173': 'vscode',  // Vite dev server in vscode
        '4200': 'vscode',  // Angular dev server in vscode
        '8080': 'vscode',  // VSCode itself
      };
      
      // Parse custom mappings from environment
      const serviceMap = { ...defaultServiceMap };
      if (process.env.PROXY_SERVICE_MAP) {
        const customMappings = process.env.PROXY_SERVICE_MAP.split(',');
        customMappings.forEach(mapping => {
          const [mapPort, service] = mapping.split(':');
          if (mapPort && service) {
            serviceMap[mapPort.trim()] = service.trim();
          }
        });
      }
      
      // Build list of hosts to try
      // Priority: Docker service name > host.docker.internal > localhost > others
      const hosts: string[] = [];
      
      // If port has a known service mapping, try that first
      if (serviceMap[port]) {
        hosts.push(serviceMap[port]);
        console.log(`Port ${port} mapped to service: ${serviceMap[port]}`);
      }
      
      // Then try other hosts
      hosts.push('host.docker.internal', 'localhost', '0.0.0.0', '127.0.0.1');
      
      let response = null;
      let lastError = null;
      
      for (const host of hosts) {
        const targetUrl = `http://${host}:${port}${path}`;
        console.log(`Trying: ${targetUrl}`);
        
        try {
          // Forward the request
          response = await axios({
            method: req.method,
            url: targetUrl,
            headers: {
              ...req.headers,
              host: `${host}:${port}`, // Override host header
            },
            data: req.body,
            responseType: 'stream',
            validateStatus: () => true, // Accept any status code
            timeout: 2000, // 2 second timeout per attempt
          });
          
          console.log(`✅ Success with ${host}:${port}`);
          break; // Success, exit loop
        } catch (error) {
          console.log(`❌ Failed with ${host}:${port} - ${error.message}`);
          lastError = error;
          continue; // Try next host
        }
      }
      
      // If all hosts failed, throw the last error
      if (!response) {
        throw lastError || new Error('All connection attempts failed');
      }
      
      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers['content-type']);
      
      // Check if we got HTML when expecting JavaScript
      const contentType = response.headers['content-type'] || '';
      const isHtml = contentType.includes('text/html');
      const requestedJs = path.includes('.js') || path.includes('.jsx') || path.includes('.ts') || path.includes('.tsx');
      
      if (isHtml && requestedJs) {
        console.warn('⚠️  WARNING: Received HTML for JavaScript file!');
        console.warn('   This usually means the dev server returned a 404 page');
        console.warn('   Check that dev server is configured with PUBLIC_URL=/proxy/' + port);
      }
      
      // Copy response headers, but exclude X-Frame-Options to allow iframe embedding
      const headersToExclude = ['x-frame-options', 'content-security-policy'];
      Object.keys(response.headers).forEach(key => {
        if (!headersToExclude.includes(key.toLowerCase())) {
          res.setHeader(key, response.headers[key]);
        } else {
          console.log(`Excluding header for iframe compatibility: ${key}`);
        }
      });
      
      // Set status code
      res.status(response.status);
      
      // Pipe response data
      response.data.pipe(res);
      console.log('=== PROXY REQUEST END ===');
      
    } catch (error) {
      console.error('=== PROXY ERROR ===');
      console.error(`Proxy error for port ${port}:`, error.message);
      console.error('Error stack:', error.stack);
      res.status(502).json({
        error: 'Bad Gateway',
        message: `Could not reach service on port ${port}`,
        details: error.message,
      });
    }
  }
}
