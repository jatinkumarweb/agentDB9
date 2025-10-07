/**
 * Fetch wrapper that ensures credentials (cookies) are included
 * This is necessary for authentication to work properly
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  return fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });
}
