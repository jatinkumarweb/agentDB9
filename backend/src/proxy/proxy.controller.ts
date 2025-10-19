import { Controller, All, Req, Res, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import axios from 'axios';

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
    
    // For non-OPTIONS requests, require authentication
    if (!user) {
      console.log('=== PROXY REQUEST - UNAUTHORIZED ===');
      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized - JWT token required',
      });
      return;
    }
    
    // Proceed with authenticated proxy request
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
    console.log('Authenticated User:', user?.id, user?.email);
    console.log('Method:', req.method);
    console.log('Original URL:', req.url);
    console.log('Port param:', port);
    console.log('Origin:', req.headers.origin);
    console.log('Referer:', req.headers.referer);
    
    try {
      
      // Extract the path after /proxy/{port}/
      const path = req.url.split(`/proxy/${port}/`)[1] || '';
      console.log('Extracted path:', path);
      
      // Build target URL
      const targetUrl = `http://localhost:${port}/${path}`;
      console.log('Target URL:', targetUrl);
      
      // Forward the request
      console.log('Forwarding request to target...');
      const response = await axios({
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers,
          host: `localhost:${port}`, // Override host header
        },
        data: req.body,
        responseType: 'stream',
        validateStatus: () => true, // Accept any status code
      });
      
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
