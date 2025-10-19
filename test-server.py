#!/usr/bin/env python3

"""
Simple test HTTP server to verify proxy functionality
Usage: python3 test-server.py [port]
"""

import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173

class TestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{datetime.now().isoformat()} - {format % args}")
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Server - Port {PORT}</title>
  <style>
    body {{
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }}
    .container {{
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }}
    h1 {{ color: #2563eb; }}
    .success {{ color: #16a34a; font-weight: bold; font-size: 1.2em; }}
    .info {{ background: #eff6ff; padding: 15px; border-radius: 4px; margin: 20px 0; }}
    code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: monospace; }}
    pre {{ background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 4px; overflow-x: auto; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Test Server Running</h1>
    <p class="success">Proxy is working correctly!</p>
    
    <div class="info">
      <strong>Server Info:</strong>
      <ul>
        <li>Port: <code>{PORT}</code></li>
        <li>Request URL: <code>{self.path}</code></li>
        <li>Request Method: <code>{self.command}</code></li>
        <li>Time: <code>{datetime.now().isoformat()}</code></li>
      </ul>
    </div>
    
    <h2>How to Access:</h2>
    <ul>
      <li><strong>Direct:</strong> <code>http://localhost:{PORT}/</code></li>
      <li><strong>Via Proxy:</strong> <code>http://localhost:8000/proxy/{PORT}/</code></li>
    </ul>
    
    <h2>Test Commands:</h2>
    <pre><code># Direct access
curl http://localhost:{PORT}/

# Via proxy
curl http://localhost:8000/proxy/{PORT}/</code></pre>

    <h2>Next Steps:</h2>
    <ol>
      <li>This test server proves the proxy works</li>
      <li>Start your actual dev server (React, Vite, etc.)</li>
      <li>Access it via: <code>http://localhost:8000/proxy/[PORT]/</code></li>
    </ol>
  </div>
</body>
</html>
        """
        
        self.wfile.write(html.encode())

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), TestHandler)
    print('')
    print('🚀 Test Server Started')
    print('======================')
    print(f'Port: {PORT}')
    print(f'Direct URL: http://localhost:{PORT}/')
    print(f'Proxy URL: http://localhost:8000/proxy/{PORT}/')
    print('')
    print('Press Ctrl+C to stop')
    print('')
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n\n✅ Server stopped')
        server.shutdown()
