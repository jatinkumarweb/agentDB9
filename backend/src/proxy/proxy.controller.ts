import { Controller, All, Req, Res, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import axios from 'axios';

@Controller('proxy')
@Public() // No authentication required for proxy
export class ProxyController {
  /**
   * Universal proxy route: /proxy/{port}/*
   * Forwards requests to localhost:{port}
   * Works for any dev server (React, Vite, Angular, etc.)
   */
  @All(':port/*')
  async proxyRequest(
    @Param('port') port: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Extract the path after /proxy/{port}/
      const path = req.url.split(`/proxy/${port}/`)[1] || '';
      
      // Build target URL
      const targetUrl = `http://localhost:${port}/${path}`;
      
      // Forward the request
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
      
      // Copy response headers
      Object.keys(response.headers).forEach(key => {
        res.setHeader(key, response.headers[key]);
      });
      
      // Set status code
      res.status(response.status);
      
      // Pipe response data
      response.data.pipe(res);
      
    } catch (error) {
      console.error(`Proxy error for port ${port}:`, error.message);
      res.status(502).json({
        error: 'Bad Gateway',
        message: `Could not reach service on port ${port}`,
        details: error.message,
      });
    }
  }
}
