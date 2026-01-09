/**
 * Centralized environment variable management
 * All environment variables are validated and exported from this module
 */

// Determine environment
const isDev = import.meta.env.DEV;

// Required environment variables
// In development, default to Vite proxy '/api'; in production, default to deployed App Runner URL
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? (isDev
  ? '/api'
  : 'https://ugwm6qnmpp.us-east-2.awsapprunner.com')) as string;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional environment variables (demo mode)
const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;

// Validate required environment variables
if (!apiBaseUrl) {
  throw new Error(
    'API base URL is not set. In dev it should be \'/api\' (via Vite proxy), and in production it should be your deployed API URL.'
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
