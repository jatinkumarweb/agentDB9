/**
 * Fetch wrapper that ensures credentials and authorization are included
 * This is necessary for authentication to work properly
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Get token from localStorage (where zustand persists it)
  let token: string | null = null;
  try {
    const authState = localStorage.getItem('auth-storage');
    if (authState) {
      const parsed = JSON.parse(authState);
      token = parsed.state?.token || null;
    }
  } catch (error) {
    console.error('Failed to get token from localStorage:', error);
  }
  
  // Add Authorization header if token exists
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Log the request for debugging
  console.log('fetchWithAuth: Making request to', url, 'with token:', token ? 'present' : 'missing');
  
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
