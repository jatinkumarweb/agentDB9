#!/usr/bin/env node

/**
 * Simple test HTTP server to verify proxy functionality
 * Usage: node test-server.js [port]
 */

const http = require('http');
const port = process.argv[2] || 5173;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Serve HTML response
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Server - Port ${port}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #2563eb; }
    .success { color: #16a34a; font-weight: bold; }
    .info { background: #eff6ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Test Server Running</h1>
    <p class="success">Proxy is working correctly!</p>
    
    <div class="info">
      <strong>Server Info:</strong>
      <ul>
        <li>Port: <code>${port}</code></li>
        <li>Request URL: <code>${req.url}</code></li>
        <li>Request Method: <code>${req.method}</code></li>
        <li>Time: <code>${new Date().toISOString()}</code></li>
      </ul>
    </div>
    
    <h2>How to Access:</h2>
    <ul>
      <li><strong>Direct:</strong> <code>http://localhost:${port}/</code></li>
      <li><strong>Via Proxy:</strong> <code>http://localhost:8000/proxy/${port}/</code></li>
    </ul>
    
    <h2>Test Commands:</h2>
    <pre><code># Direct access
curl http://localhost:${port}/

# Via proxy
curl http://localhost:8000/proxy/${port}/</code></pre>
  </div>
</body>
</html>
  `);
});

server.listen(port, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 Test Server Started');
  console.log('======================');
  console.log(`Port: ${port}`);
  console.log(`Direct URL: http://localhost:${port}/`);
  console.log(`Proxy URL: http://localhost:8000/proxy/${port}/`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
