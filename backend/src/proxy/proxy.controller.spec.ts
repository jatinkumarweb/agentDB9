import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { Request, Response } from 'express';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock http-proxy-middleware
jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn(() => jest.fn()),
}));

describe('ProxyController', () => {
  let controller: ProxyController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);

    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      method: 'GET',
      url: '/proxy/5173/',
      headers: {
        origin: 'http://localhost:8000',
      },
    };

    // Setup mock response
    const headersSent = false;
    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      get headersSent() {
        return headersSent;
      },
    };
  });

  describe('Path Handling', () => {
    describe('VS Code (port 8080)', () => {
      it('should strip /proxy/8080 prefix for VS Code', async () => {
        mockRequest.url = '/proxy/8080/?folder=/home/coder/workspace';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: '<html>VS Code</html>',
          headers: { 'content-type': 'text/html' },
        });

        await controller.handleOptionsOrProxy(
          '8080',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify axios was called with stripped path
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/?folder=/home/coder/workspace'),
          expect.any(Object),
        );
      });

      it('should handle VS Code static resources', async () => {
        mockRequest.url = '/proxy/8080/static/out/vs/workbench/workbench.main.js';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: 'console.log("VS Code")',
          headers: { 'content-type': 'application/javascript' },
        });

        await controller.handleOptionsOrProxy(
          '8080',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify path was stripped correctly
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/static/out/vs/workbench/workbench.main.js'),
          expect.any(Object),
        );
      });
    });

    describe('Vite Dev Server (port 5173)', () => {
      it('should keep full path with /proxy/5173 prefix for Vite', async () => {
        mockRequest.url = '/proxy/5173/';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: '<html>Vite App</html>',
          headers: { 'content-type': 'text/html' },
        });

        await controller.handleOptionsOrProxy(
          '5173',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify full path is kept
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/proxy/5173/'),
          expect.any(Object),
        );
      });

      it('should keep prefix for Vite HMR client', async () => {
        mockRequest.url = '/proxy/5173/@vite/client';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: 'export default {}',
          headers: { 'content-type': 'application/javascript' },
        });

        await controller.handleOptionsOrProxy(
          '5173',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify full path with prefix is kept
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/proxy/5173/@vite/client'),
          expect.any(Object),
        );
      });

      it('should keep prefix for Vite source files', async () => {
        mockRequest.url = '/proxy/5173/src/main.jsx';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: 'import React from "react"',
          headers: { 'content-type': 'application/javascript' },
        });

        await controller.handleOptionsOrProxy(
          '5173',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify full path with prefix is kept
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/proxy/5173/src/main.jsx'),
          expect.any(Object),
        );
      });

      it('should keep prefix for Vite assets', async () => {
        mockRequest.url = '/proxy/5173/assets/index-abc123.js';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: 'console.log("bundled")',
          headers: { 'content-type': 'application/javascript' },
        });

        await controller.handleOptionsOrProxy(
          '5173',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify full path with prefix is kept
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/proxy/5173/assets/index-abc123.js'),
          expect.any(Object),
        );
      });
    });

    describe('React Dev Server (port 3000)', () => {
      it('should keep full path with /proxy/3000 prefix for React', async () => {
        mockRequest.url = '/proxy/3000/';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: '<html>React App</html>',
          headers: { 'content-type': 'text/html' },
        });

        await controller.handleOptionsOrProxy(
          '3000',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify full path is kept
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/proxy/3000/'),
          expect.any(Object),
        );
      });

      it('should keep prefix for React static assets', async () => {
        mockRequest.url = '/proxy/3000/static/js/bundle.js';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: 'console.log("React bundle")',
          headers: { 'content-type': 'application/javascript' },
        });

        await controller.handleOptionsOrProxy(
          '3000',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify full path with prefix is kept
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/proxy/3000/static/js/bundle.js'),
          expect.any(Object),
        );
      });
    });

    describe('Angular Dev Server (port 4200)', () => {
      it('should keep full path with /proxy/4200 prefix for Angular', async () => {
        mockRequest.url = '/proxy/4200/';
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: '<html>Angular App</html>',
          headers: { 'content-type': 'text/html' },
        });

        await controller.handleOptionsOrProxy(
          '4200',
          null,
          mockRequest as Request,
          mockResponse as Response,
        );

        // Verify full path is kept
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/proxy/4200/'),
          expect.any(Object),
        );
      });
    });
  });

  describe('CORS Headers', () => {
    it('should set CORS headers for all proxy requests', async () => {
      mockRequest.url = '/proxy/5173/';
      mockRequest.headers = { origin: 'http://localhost:8000' };
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: {},
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:8000',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true',
      );
    });

    it('should handle OPTIONS preflight requests', async () => {
      mockRequest.method = 'OPTIONS';
      mockRequest.url = '/proxy/5173/';
      mockRequest.headers = { origin: 'http://localhost:8000' };

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should use wildcard when no origin header present', async () => {
      mockRequest.url = '/proxy/5173/';
      mockRequest.headers = {};
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: {},
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        '*',
      );
    });
  });

  describe('Service Mapping', () => {
    it('should map port 5173 to vscode service', async () => {
      mockRequest.url = '/proxy/5173/';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: {},
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify it tries vscode service first
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('vscode:5173'),
        expect.any(Object),
      );
    });

    it('should map port 3000 to vscode service', async () => {
      mockRequest.url = '/proxy/3000/';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: {},
      });

      await controller.handleOptionsOrProxy(
        '3000',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('vscode:3000'),
        expect.any(Object),
      );
    });

    it('should map port 8080 to vscode service', async () => {
      mockRequest.url = '/proxy/8080/';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: {},
      });

      await controller.handleOptionsOrProxy(
        '8080',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('vscode:8080'),
        expect.any(Object),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors from target service', async () => {
      mockRequest.url = '/proxy/5173/nonexistent.js';
      
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
        },
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle connection errors', async () => {
      mockRequest.url = '/proxy/5173/';
      
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(502);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });

    it('should handle timeout errors', async () => {
      mockRequest.url = '/proxy/5173/';
      
      mockedAxios.get.mockRejectedValue({
        code: 'ETIMEDOUT',
        message: 'Request timeout',
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(502);
    });
  });

  describe('Response Handling', () => {
    it('should forward response status code', async () => {
      mockRequest.url = '/proxy/5173/';
      
      mockedAxios.get.mockResolvedValue({
        status: 304,
        data: '',
        headers: {},
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(304);
    });

    it('should forward content-type header', async () => {
      mockRequest.url = '/proxy/5173/';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: { 'content-type': 'text/html' },
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html',
      );
    });

    it('should remove X-Frame-Options header', async () => {
      mockRequest.url = '/proxy/8080/';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: {
          'x-frame-options': 'DENY',
          'content-type': 'text/html',
        },
      });

      await controller.handleOptionsOrProxy(
        '8080',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      // X-Frame-Options should not be forwarded
      const setHeaderCalls = (mockResponse.setHeader as jest.Mock).mock.calls;
      const xFrameCall = setHeaderCalls.find(call => 
        call[0].toLowerCase() === 'x-frame-options'
      );
      expect(xFrameCall).toBeUndefined();
    });
  });

  describe('Regression Tests', () => {
    it('should not cause double prefix issue (regression from 0ac6683)', async () => {
      // This was the bug: /proxy/5173/proxy/5173/
      mockRequest.url = '/proxy/5173/';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>',
        headers: {},
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      // Should NOT have double prefix
      expect(mockedAxios.get).not.toHaveBeenCalledWith(
        expect.stringContaining('/proxy/5173/proxy/5173/'),
        expect.any(Object),
      );

      // Should have single prefix
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/proxy/5173/'),
        expect.any(Object),
      );
    });

    it('should handle Vite @vite/client correctly (common 404 issue)', async () => {
      mockRequest.url = '/proxy/5173/@vite/client';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: 'export default {}',
        headers: { 'content-type': 'application/javascript' },
      });

      await controller.handleOptionsOrProxy(
        '5173',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      // Should keep the prefix for Vite to recognize it
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/proxy/5173/@vite/client'),
        expect.any(Object),
      );
    });

    it('should handle React bundle.js correctly (common 404 issue)', async () => {
      mockRequest.url = '/proxy/3000/static/js/bundle.js';
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: 'console.log("bundle")',
        headers: { 'content-type': 'application/javascript' },
      });

      await controller.handleOptionsOrProxy(
        '3000',
        null,
        mockRequest as Request,
        mockResponse as Response,
      );

      // Should keep the prefix for React to recognize it
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/proxy/3000/static/js/bundle.js'),
        expect.any(Object),
      );
    });
  });
});
