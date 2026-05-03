/**
 * Safe Fetch Wrapper
 * Handles all fetch errors gracefully and provides offline fallbacks
 */

interface SafeFetchOptions extends RequestInit {
  timeout?: number;
  skipErrorToast?: boolean;
}

interface SafeFetchResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  offline?: boolean;
}

/**
 * Safe fetch that never throws and always returns a result object
 */
export async function safeFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const { timeout = 10000, skipErrorToast = false, ...fetchOptions } = options;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Make the fetch request
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check if response is ok
    if (!response.ok) {
      let errorMessage = `Server returned ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Couldn't parse error, use status
      }

      console.warn(`[SafeFetch] Request failed: ${url}`, {
        status: response.status,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        status: response.status,
        offline: response.status >= 500 || response.status === 0
      };
    }

    // Try to parse JSON response
    try {
      const data = await response.json();
      return {
        success: true,
        data,
        status: response.status
      };
    } catch (e) {
      // Response wasn't JSON, return as text
      return {
        success: true,
        data: await response.text() as any,
        status: response.status
      };
    }

  } catch (error: any) {
    // Network error, timeout, or abort
    const isTimeout = error.name === 'AbortError';
    const isNetworkError = error.message?.includes('fetch') || 
                          error.message?.includes('network') ||
                          error.message?.includes('Failed to fetch');

    const errorMessage = isTimeout 
      ? 'Request timeout - server not responding'
      : isNetworkError
      ? 'Network error - server offline or unreachable'
      : error.message || 'Unknown error';

    console.warn(`[SafeFetch] Network error: ${url}`, {
      error: errorMessage,
      type: error.name,
      isTimeout,
      isNetworkError
    });

    return {
      success: false,
      error: errorMessage,
      offline: true
    };
  }
}

/**
 * Check if server is online
 */
export async function checkServerHealth(baseUrl: string): Promise<boolean> {
  const result = await safeFetch(`${baseUrl}/make-server-57095a78/health`, {
    timeout: 5000,
    skipErrorToast: true
  });

  return result.success;
}

/**
 * Make a GET request with safe error handling
 */
export async function safeGet<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * Make a POST request with safe error handling
 */
export async function safePost<T = any>(
  url: string,
  body: any,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body)
  });
}

/**
 * Make a PUT request with safe error handling
 */
export async function safePut<T = any>(
  url: string,
  body: any,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body)
  });
}

/**
 * Make a DELETE request with safe error handling
 */
export async function safeDelete<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, { ...options, method: 'DELETE' });
}

/**
 * Retry a fetch operation with exponential backoff
 */
export async function retryFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {},
  maxRetries: number = 3
): Promise<SafeFetchResult<T>> {
  let lastError: SafeFetchResult<T> | null = null;

  for (let i = 0; i < maxRetries; i++) {
    const result = await safeFetch<T>(url, options);
    
    if (result.success) {
      return result;
    }

    lastError = result;
    
    // Don't retry if it's a client error (4xx)
    if (result.status && result.status >= 400 && result.status < 500) {
      break;
    }

    // Wait before retrying (exponential backoff)
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  return lastError || {
    success: false,
    error: 'All retries failed',
    offline: true
  };
}
