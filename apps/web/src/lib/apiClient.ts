import { supabase } from './supabaseClient';
import { env } from './env';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Dev-only: trace entry point
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[apiFetch] ENTRY', { path, method: options.method || 'GET' });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    if (import.meta.env.DEV) {
      console.error('[apiFetch] BLOCKED: No auth token for', path);
    }
    throw new Error('No authentication token available');
  }

  const headers = new Headers(options.headers || undefined);
  headers.set('Authorization', `Bearer ${token}`);
  
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Prevent caching - always fetch fresh data from server
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    cache: 'no-store',
  };

  const fullUrl = `${env.apiBaseUrl}${path}`;

  // Dev-only: log all API requests with details
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[apiFetch] → ${fetchOptions.method || 'GET'} ${fullUrl}`, {
      headers: Object.fromEntries(headers.entries()),
      hasToken: !!token,
    });
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, fetchOptions);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[apiFetch] ← ${response.status} ${fetchOptions.method || 'GET'} ${fullUrl}`);
    }
  } catch (fetchError) {
    console.error('[apiFetch] Network error:', fetchError);
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
  }

  if (response.status === 401) {
    await supabase.auth.signOut();
    // Store a message to show on the login page
    sessionStorage.setItem('auth_redirect_message', 'Your session has expired. Please sign in again.');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const bodyText = await response.text();
    const message = bodyText || response.statusText || 'Request failed';
    const errorMsg = `${response.status}: ${message}`;
    console.error('[apiFetch] Request failed:', errorMsg, { path, status: response.status });
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
