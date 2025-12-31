import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/apiClient';
import { env } from '../lib/env';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  userId: string | null;
  accessToken: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
  demoEnabled: boolean;
  demoError?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setUser(null);
        setSession(null);
      } else {
        setUser(data.session?.user ?? null);
        setSession(data.session ?? null);
      }
      setIsLoading(false);
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setUser(nextSession?.user ?? null);
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const ensureAuthMe = async () => {
    try {
      await apiFetch('/auth/me');
    } catch (error) {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      throw new Error(message);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      // Friendly message for unverified email
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('Your email isn\'t verified yet. Check your inbox and verify, then try again.');
      }
      throw new Error(error.message);
    }
    await ensureAuthMe();
    setIsLoading(false);
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    
    // Check if email verification is required (user exists but no session)
    if (data.user && !data.session) {
      setIsLoading(false);
      throw new Error('VERIFICATION_REQUIRED');
    }
    
    await ensureAuthMe();
    setIsLoading(false);
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsLoading(false);
  };

  const signInAsDemo = async () => {
    if (!env.isDemoModeEnabled) {
      throw new Error('Demo mode is not configured. Please set VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD.');
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: env.demoEmail,
      password: env.demoPassword,
    });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    await ensureAuthMe();
    setIsLoading(false);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    userId: user?.id ?? null,
    accessToken: session?.access_token ?? null,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInAsDemo,
    demoEnabled: env.isDemoModeEnabled,
    demoError: !env.isDemoModeEnabled ? 'Demo credentials are not configured.' : undefined,
  }), [user, session, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
