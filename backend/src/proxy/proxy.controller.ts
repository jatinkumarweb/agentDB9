import { Controller, All, Req, Res, Param, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import axios from 'axios';

@Controller('proxy')
@UseGuards(JwtAuthGuard) // Require authentication for proxy access
export class ProxyController {
  
  /**
   * Add CORS headers for proxy routes only
   * This allows browser access to proxied dev servers without compromising app security
   */
  private setCorsHeaders(res: Response) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  /**
   * Universal proxy route: /proxy/{port}/*
   * Forwards requests to localhost:{port}
   * Works for any dev server (React, Vite, Angular, etc.)
   */
  @All(':port/*')
  async proxyRequest(
    @Param('port') port: string,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log('=== PROXY REQUEST START ===');
    console.log('Authenticated User:', user?.id, user?.email);
    console.log('Method:', req.method);
    console.log('Original URL:', req.url);
    console.log('Port param:', port);
    console.log('Origin:', req.headers.origin);
    console.log('Referer:', req.headers.referer);
    
    try {
      // Set CORS headers for proxy routes only
      console.log('Setting CORS headers...');
      this.setCorsHeaders(res);
      
      // Handle OPTIONS preflight request
      if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight - returning 204');
        res.status(204).send();
        return;
      }
      
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
