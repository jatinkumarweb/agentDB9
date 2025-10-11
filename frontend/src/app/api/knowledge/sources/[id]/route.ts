import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // This is for listing sources by agentId
    const response = await fetch(`${BACKEND_URL}/knowledge/sources/${id}`, {
      headers: createBackendHeaders(request),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Knowledge API: Failed to fetch sources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch knowledge sources' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // This is for deleting a source by sourceId
    const response = await fetch(`${BACKEND_URL}/knowledge/sources/${id}`, {
      method: 'DELETE',
      headers: createBackendHeaders(request),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Knowledge API: Failed to delete source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete knowledge source' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/knowledge/sources/${id}`, {
      method: 'PUT',
      headers: createBackendHeaders(request),
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Knowledge API: Failed to update source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update knowledge source' },
      { status: 500 }
    );
  }
}
