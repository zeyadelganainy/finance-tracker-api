/**
 * Centralized environment variable management
 * All environment variables are validated and exported from this module
 */

// Required environment variables
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional environment variables (demo mode)
const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;

// Validate required environment variables
if (!apiBaseUrl) {
  throw new Error(
    'Missing required environment variable: VITE_API_BASE_URL. ' +
    'Please set it in your .env file or as an environment variable in Vercel.'
  );
}

if (!supabaseUrl) {
  throw new Error(
    'Missing required environment variable: VITE_SUPABASE_URL. ' +
    'Please set it in your .env file or as an environment variable in Vercel.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing required environment variable: VITE_SUPABASE_ANON_KEY. ' +
    'Please set it in your .env file or as an environment variable in Vercel.'
  );
}

// Export validated environment variables
export const env = {
  apiBaseUrl: apiBaseUrl.toString(),
  supabaseUrl: supabaseUrl.toString(),
  supabaseAnonKey: supabaseAnonKey.toString(),
  demoEmail: demoEmail?.toString() || '',
  demoPassword: demoPassword?.toString() || '',
  isDemoModeEnabled: !!(demoEmail && demoPassword),
} as const;
