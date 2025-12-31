import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/apiClient';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
  demoEnabled: boolean;
  demoError?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const demoEmail = (import.meta as any).env.VITE_DEMO_EMAIL as string | undefined;
const demoPassword = (import.meta as any).env.VITE_DEMO_PASSWORD as string | undefined;
const demoEnabled = Boolean(demoEmail && demoPassword);
const demoError = !demoEnabled ? 'Demo credentials are not configured.' : undefined;

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
      throw new Error(error.message);
    }
    await ensureAuthMe();
    setIsLoading(false);
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
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
    if (!demoEnabled || !demoEmail || !demoPassword) {
      throw new Error(demoError || 'Demo mode is not configured.');
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
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
    isLoading,
    signIn,
    signUp,
    signOut,
    signInAsDemo,
    demoEnabled,
    demoError,
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
