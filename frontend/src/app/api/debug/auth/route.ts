import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth-token');
  const authHeader = request.headers.get('authorization');
  
  return NextResponse.json({
    hasAuthTokenCookie: !!authToken,
    authTokenValue: authToken?.value?.substring(0, 20) + '...' || null,
    hasAuthHeader: !!authHeader,
    authHeaderValue: authHeader?.substring(0, 30) + '...' || null,
    allCookies: Object.fromEntries(
      request.cookies.getAll().map(c => [c.name, c.value.substring(0, 20) + '...'])
    ),
    userAgent: request.headers.get('user-agent')?.substring(0, 50) || null,
    timestamp: new Date().toISOString()
  });
}