import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();
    
    // Call MCP server to list files
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:9001';
    
    const response = await fetch(`${mcpServerUrl}/api/tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'fs_list_directory',
        parameters: {
          path: path || '/home/coder/workspace'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MCP server error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to list files');
    }

    // Transform the result to match our frontend format
    const files = result.result.map((entry: any) => ({
      path: entry.path,
      name: entry.name,
      type: entry.type,
      size: entry.size,
      lastModified: entry.lastModified ? new Date(entry.lastModified) : undefined
    }));

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return NextResponse.json(
      { error: 'Failed to list workspace files' },
      { status: 500 }
    );
  }
}