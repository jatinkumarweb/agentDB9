import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/providers/config/${params.provider}`, {
      method: 'DELETE',
      headers: createBackendHeaders(request),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to remove provider config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove provider configuration' },
      { status: 500 }
    );
  }
}
