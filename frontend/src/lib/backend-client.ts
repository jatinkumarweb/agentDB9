/**
 * Backend API client with DNS cache prevention
 * 
 * Provides a centralized way to make requests to the backend API
 * with proper DNS resolution and error handling.
 */

import { fetchNoCache } from './fetch-no-cache';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export interface BackendRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  token?: string;
}

/**
 * Make a request to the backend API
 * 
 * @param path - API path (e.g., '/api/auth/login')
 * @param options - Request options
 * @returns Promise<Response>
 */
export async function backendFetch(
  path: string,
  options: BackendRequestOptions = {}
): Promise<Response> {
  const { body, token, headers = {}, ...fetchOptions } = options;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const requestBody = body ? JSON.stringify(body) : undefined;

  const url = `${BACKEND_URL}${path}`;
  
  console.log(`Backend API: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetchNoCache(url, {
      ...fetchOptions,
      headers: requestHeaders,
      body: requestBody,
    });

    console.log(`Backend API: Response ${response.status} ${response.statusText}`);
    
    return response;
  } catch (error) {
    console.error(`Backend API: Request failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Make a GET request to the backend API
 */
export async function backendGet(path: string, token?: string): Promise<Response> {
  return backendFetch(path, { method: 'GET', token });
}

/**
 * Make a POST request to the backend API
 */
export async function backendPost(
  path: string,
  body?: any,
  token?: string
): Promise<Response> {
  return backendFetch(path, { method: 'POST', body, token });
}

/**
 * Make a PUT request to the backend API
 */
export async function backendPut(
  path: string,
  body?: any,
  token?: string
): Promise<Response> {
  return backendFetch(path, { method: 'PUT', body, token });
}

/**
 * Make a DELETE request to the backend API
 */
export async function backendDelete(path: string, token?: string): Promise<Response> {
  return backendFetch(path, { method: 'DELETE', token });
}
