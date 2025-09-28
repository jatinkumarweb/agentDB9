import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const vscodeProxyUrl = process.env.VSCODE_PROXY_URL || 'http://localhost:8081';
    
    // Check if VS Code proxy is accessible
    const response = await fetch(`${vscodeProxyUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: 'healthy',
        vscodeProxy: data,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'VS Code proxy not responding',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  } catch (error) {
    console.error('VS Code health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Failed to connect to VS Code proxy',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}