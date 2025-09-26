import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const authToken = request.cookies.get('auth-token');
  
  return NextResponse.json({
    allCookies: cookies,
    authToken: authToken?.value || null,
    headers: Object.fromEntries(request.headers.entries())
  });
}