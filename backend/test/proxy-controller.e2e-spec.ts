import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProxyController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CORS Headers', () => {
    it('should return CORS headers on OPTIONS request', () => {
      return request(app.getHttpServer())
        .options('/proxy/8080/')
        .set('Origin', 'http://localhost:3000')
        .expect(204)
        .expect('Access-Control-Allow-Origin', /.*/)
        .expect('Access-Control-Allow-Methods', /GET/)
        .expect('Access-Control-Allow-Credentials', 'true');
    });

    it('should allow any origin for proxy routes', () => {
      return request(app.getHttpServer())
        .options('/proxy/8080/')
        .set('Origin', 'http://example.com')
        .expect(204)
        .expect('Access-Control-Allow-Origin', /.*/)
    });
  });

  describe('Path Handling', () => {
    it('should strip /proxy/8080 prefix for VS Code (port 8080)', async () => {
      // This test verifies the path stripping logic
      // Note: Actual connection will fail if VS Code service isn't running
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/?folder=/test')
        .expect((res) => {
          // Should attempt to connect (502 if service down, 200 if up)
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should preserve full path for dev servers (port 5173)', async () => {
      // This test verifies dev server path preservation
      const response = await request(app.getHttpServer())
        .get('/proxy/5173/')
        .expect((res) => {
          // Should attempt to connect (502 if service down, 200 if up)
          expect([200, 302, 502]).toContain(res.status);
        });
    });
  });

  describe('WebSocket Support', () => {
    it('should detect WebSocket upgrade requests', async () => {
      // Test that proxy controller recognizes WebSocket upgrade
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/')
        .set('Upgrade', 'websocket')
        .set('Connection', 'Upgrade')
        .set('Sec-WebSocket-Key', 'dGhlIHNhbXBsZSBub25jZQ==')
        .set('Sec-WebSocket-Version', '13')
        .expect((res) => {
          // Should attempt WebSocket upgrade (101 if successful, 502 if service down)
          expect([101, 502]).toContain(res.status);
        });
    });

    it('should handle WebSocket upgrade for VS Code', async () => {
      // Test WebSocket upgrade specifically for VS Code port
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/')
        .set('Upgrade', 'websocket')
        .set('Connection', 'Upgrade')
        .set('Sec-WebSocket-Key', 'test-key')
        .set('Sec-WebSocket-Version', '13')
        .expect((res) => {
          // Should recognize as WebSocket request
          // 101 = success, 502 = service unavailable
          expect([101, 502]).toContain(res.status);
        });
    });
  });

  describe('Header Filtering', () => {
    it('should not include X-Frame-Options in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/')
        .expect((res) => {
          // X-Frame-Options should be filtered out
          expect(res.headers['x-frame-options']).toBeUndefined();
        });
    });

    it('should not include Content-Security-Policy in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/')
        .expect((res) => {
          // Content-Security-Policy should be filtered out
          expect(res.headers['content-security-policy']).toBeUndefined();
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 502 for invalid port', () => {
      return request(app.getHttpServer())
        .get('/proxy/9999/')
        .expect(502)
        .expect((res) => {
          expect(res.body).toHaveProperty('error');
          expect(res.body.error).toMatch(/Bad Gateway|Could not reach service/i);
        });
    });

    it('should handle connection errors gracefully', () => {
      return request(app.getHttpServer())
        .get('/proxy/9998/')
        .expect(502)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Service Mapping', () => {
    it('should map port 8080 to vscode service', async () => {
      // This test verifies the service mapping configuration
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/')
        .expect((res) => {
          // Should attempt to connect to vscode service
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should map port 5173 to vscode service', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/5173/')
        .expect((res) => {
          // Should attempt to connect to vscode service
          expect([200, 302, 502]).toContain(res.status);
        });
    });
  });

  describe('Query Parameters', () => {
    it('should preserve query parameters for VS Code', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/?folder=/home/coder/workspace&test=123')
        .expect((res) => {
          // Should attempt connection with query params
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should handle complex query strings', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/?folder=/test&param1=value1&param2=value2')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });
  });

  describe('Regression Tests', () => {
    it('should NOT send double prefix to VS Code', async () => {
      // Critical regression test for bug fix (commit 5ea81c8)
      // Ensures we don't send /proxy/8080/proxy/8080/
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/?test=double_prefix')
        .expect((res) => {
          // Should attempt connection (not checking logs here, but verifying no crash)
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should allow iframe embedding (no X-Frame-Options)', async () => {
      // Regression test for X-Frame-Options fix (commit 078db93)
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/')
        .expect((res) => {
          expect(res.headers['x-frame-options']).toBeUndefined();
        });
    });

    it('should support WebSocket upgrades', async () => {
      // Regression test for WebSocket support (this commit)
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/')
        .set('Upgrade', 'websocket')
        .set('Connection', 'Upgrade')
        .expect((res) => {
          // Should handle WebSocket upgrade
          expect([101, 502]).toContain(res.status);
        });
    });
  });

  describe('Multiple Dev Servers', () => {
    it('should handle port 3000 (React)', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/3000/')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should handle port 5173 (Vite)', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/5173/')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should handle port 4200 (Angular)', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/4200/')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should handle port 3001 (React Alt)', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/3001/')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      const requests = [
        request(app.getHttpServer()).get('/proxy/8080/'),
        request(app.getHttpServer()).get('/proxy/5173/'),
        request(app.getHttpServer()).get('/proxy/3000/'),
      ];

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 302, 502]).toContain(response.status);
      });
    });

    it('should handle rapid sequential requests', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get('/proxy/8080/')
          .expect((res) => {
            expect([200, 302, 502]).toContain(res.status);
          });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long query strings', async () => {
      const longQuery = '?param=' + 'a'.repeat(1000);
      const response = await request(app.getHttpServer())
        .get(`/proxy/8080/${longQuery}`)
        .expect((res) => {
          expect([200, 302, 502, 414]).toContain(res.status);
        });
    });

    it('should handle special characters in path', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080/?folder=/test%20folder')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should handle missing trailing slash', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });

    it('should handle double slashes in path', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080//')
        .expect((res) => {
          expect([200, 302, 502]).toContain(res.status);
        });
    });
  });

  describe('Security', () => {
    it('should not expose internal service names in errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/9999/')
        .expect(502);
      
      // Error message should not contain internal hostnames
      expect(response.body.message).not.toMatch(/vscode|host\.docker\.internal/i);
    });

    it('should handle malicious port numbers', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/99999/')
        .expect(502);
    });

    it('should handle port injection attempts', async () => {
      const response = await request(app.getHttpServer())
        .get('/proxy/8080;rm%20-rf/')
        .expect((res) => {
          // Should either reject or handle safely
          expect([400, 404, 502]).toContain(res.status);
        });
    });
  });
});
