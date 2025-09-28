import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();
    
    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    // Call MCP server to read file
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:9001';
    
    const response = await fetch(`${mcpServerUrl}/api/tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'fs_read_file',
        parameters: {
          path
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MCP server error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to read file');
    }

    return NextResponse.json({ 
      content: result.result,
      path 
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}