import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get backend URL from environment, fallback to direct backend call
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      throw new Error('BACKEND_URL not configured');
    }
    
    const response = await fetch(`${backendUrl}/api/agents/${params.id}`, {
      headers: createBackendHeaders(request),
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/agents/${params.id}`, {
      method: 'PUT',
      headers: createBackendHeaders(request),
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/agents/${params.id}`, {
      method: 'DELETE',
      headers: createBackendHeaders(request),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}