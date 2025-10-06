/**
 * Fetch wrapper that ensures credentials (cookies) are included
 * This is necessary for authentication to work properly
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
