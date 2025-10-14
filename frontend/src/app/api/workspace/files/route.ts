import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();
    
    // Call MCP server to list files
    // In Docker: use service name (vscode:9001)
    // Locally: use localhost:9001
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:9001';
    const workspacePath = path || '/workspace';
    
    console.log(`Listing workspace files from: ${workspacePath} via ${mcpServerUrl}`);
    
    const response = await fetch(`${mcpServerUrl}/api/tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'fs_list_directory',
        parameters: {
          path: workspacePath
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MCP server error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`MCP server error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      console.error('MCP server returned error:', result.error);
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

    console.log(`Successfully listed ${files.length} files from workspace`);
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list workspace files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}