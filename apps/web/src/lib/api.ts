/**
 * API Client for Finance Tracker
 * 
 * Handles all HTTP requests to the backend API with:
 * - Environment variable validation
 * - Automatic JSON headers
 * - Bearer token authentication (if available)
 * - Error handling with meaningful messages
 * - Support for 204 No Content responses
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not defined. Please create a .env file with VITE_API_BASE_URL=https://your-api-url.com'
  );
}

/**
 * Generic API request helper
 * @param path - API endpoint path (e.g., '/transactions')
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response or null for 204 No Content
 */
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization if token exists
  const token = localStorage.getItem('ft_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make request
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Handle non-2xx responses
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If response is not JSON, use status text
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }

    throw new Error(errorMessage);
  }

  // Parse and return JSON response
  return response.json();
}

// Export configured base URL for reference
export { API_BASE_URL };
