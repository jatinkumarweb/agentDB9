import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/evaluation/suites`, {
      headers: createBackendHeaders(request),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch suites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suites' },
      { status: 500 }
    );
  }
}
