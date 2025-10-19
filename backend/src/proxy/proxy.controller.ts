import { Controller, All, Req, Res, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import axios from 'axios';

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
      
      // Extract the path after /proxy/{port}/
      const path = req.url.split(`/proxy/${port}/`)[1] || '';
      console.log('Extracted path:', path);
      
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
        const targetUrl = `http://${host}:${port}/${path}`;
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
      
      // Copy response headers
      Object.keys(response.headers).forEach(key => {
        res.setHeader(key, response.headers[key]);
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
