import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    // Set auth cookie if registration was successful
    const nextResponse = NextResponse.json(data, { status: response.status });
    if (response.ok && data.accessToken) {
      // Use different cookie settings for development vs production
      const isProduction = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set('auth-token', data.accessToken, {
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        httpOnly: false, // Allow client-side access for auth store
        secure: isProduction, // Only secure in production (requires HTTPS)
        sameSite: isProduction ? 'none' : 'lax' // 'lax' for localhost, 'none' for production
      });
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Failed to register:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register' },
      { status: 500 }
    );
  }
}