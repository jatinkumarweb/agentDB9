/**
 * Fetch wrapper that ensures credentials (cookies) are included
 * This is necessary for authentication to work properly
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Log the request for debugging
  console.log('fetchWithAuth: Making request to', url, 'with credentials: include');
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });
  
  console.log('fetchWithAuth: Response status:', response.status, 'for', url);
  
  return response;
}
