/**
 * Backend API client with retry logic and error handling
 * 
 * Provides a centralized way to make requests to the backend API
 * with automatic retries, exponential backoff, and proper error handling.
 */

import { fetchNoCache } from './fetch-no-cache';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds
const RETRY_BACKOFF_MULTIPLIER = 2;

export interface BackendRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  token?: string;
  retries?: number;
  retryDelay?: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (network errors, 5xx errors, connection refused)
 */
function isRetryableError(error: any, response?: Response): boolean {
  // Network errors (connection refused, timeout, etc.)
  if (error && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
    return true;
  }
  
  // Fetch failed errors
  if (error && (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED'))) {
    return true;
  }
  
  // 5xx server errors (but not 501 Not Implemented)
  if (response && response.status >= 500 && response.status !== 501) {
    return true;
  }
  
  return false;
}

/**
 * Make a request to the backend API with retry logic
 * 
 * @param path - API path (e.g., '/api/auth/login')
 * @param options - Request options
 * @returns Promise<Response>
 */
export async function backendFetch(
  path: string,
  options: BackendRequestOptions = {}
): Promise<Response> {
  const { 
    body, 
    token, 
    headers = {}, 
    retries = MAX_RETRIES,
    retryDelay = INITIAL_RETRY_DELAY,
    ...fetchOptions 
  } = options;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const requestBody = body ? JSON.stringify(body) : undefined;
  const url = `${BACKEND_URL}${path}`;
  
  let lastError: any;
  let currentDelay = retryDelay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Backend API: Retry attempt ${attempt}/${retries} for ${url} after ${currentDelay}ms`);
        await sleep(currentDelay);
        currentDelay = Math.min(currentDelay * RETRY_BACKOFF_MULTIPLIER, MAX_RETRY_DELAY);
      } else {
        console.log(`Backend API: ${options.method || 'GET'} ${url}`);
      }

      const response = await fetchNoCache(url, {
        ...fetchOptions,
        headers: requestHeaders,
        body: requestBody,
      });

      console.log(`Backend API: Response ${response.status} ${response.statusText}`);
      
      // Check if we should retry on this response
      if (isRetryableError(null, response) && attempt < retries) {
        lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (isRetryableError(error) && attempt < retries) {
        console.warn(`Backend API: Request failed (attempt ${attempt + 1}/${retries + 1}):`, error.message);
        continue;
      }
      
      // No more retries or non-retryable error
      console.error(`Backend API: Request failed for ${url} after ${attempt + 1} attempts:`, error);
      throw error;
    }
  }

  // All retries exhausted
  console.error(`Backend API: All ${retries + 1} attempts failed for ${url}`);
  throw lastError;
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
