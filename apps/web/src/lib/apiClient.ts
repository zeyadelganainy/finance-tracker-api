import { supabase } from './supabaseClient';
import { env } from './env';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
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

  // Dev-only: log requests for audit trail (remove after bug verification)
  if (import.meta.env.DEV && (path.includes('/transactions/') || path.includes('DELETE') || path.includes('PUT'))) {
    // eslint-disable-next-line no-console
    console.debug(`[apiFetch] ${fetchOptions.method || 'GET'} ${fullUrl}`);
  }

  const response = await fetch(fullUrl, fetchOptions);

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
    throw new Error(`${response.status}: ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
