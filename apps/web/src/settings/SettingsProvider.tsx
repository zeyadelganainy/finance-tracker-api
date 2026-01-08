import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppSettings, AccentColor, ThemeMode, setCurrentSettings } from './registry';
import i18n from '../i18n';

const STORAGE_KEY = 'wealthwise:settings';

function loadSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        language: parsed.language ?? 'en',
        currency: parsed.currency ?? 'CAD',
        themeMode: parsed.themeMode ?? 'system',
        accentColor: parsed.accentColor ?? 'blue',
      };
    } catch {}
  }
  return {
    language: 'en',
    currency: 'CAD',
    themeMode: 'system',
    accentColor: 'blue',
  };
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

const ACCENT_COLORS: Record<AccentColor, { base: string; hover: string }> = {
  blue: { base: '#3b82f6', hover: '#2563eb' },
  emerald: { base: '#10b981', hover: '#0ea5e9' /* using teal hover for better contrast */ },
  purple: { base: '#8b5cf6', hover: '#7c3aed' },
  orange: { base: '#f59e0b', hover: '#d97706' },
  rose: { base: '#f43f5e', hover: '#e11d48' },
};

function applyAccent(color: AccentColor) {
  const { base, hover } = ACCENT_COLORS[color];
  const root = document.documentElement;
  root.style.setProperty('--accent-color', base);
  root.style.setProperty('--accent-color-hover', hover);
}

interface SettingsContextValue {
  settings: AppSettings;
  setLanguage: (lang: AppSettings['language']) => void;
  setCurrency: (cur: AppSettings['currency']) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (accent: AccentColor) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    // apply on mount
    applyTheme(settings.themeMode);
    applyAccent(settings.accentColor);
    setCurrentSettings(settings);
    i18n.changeLanguage(settings.language);
  }, []);

  useEffect(() => {
    // persist and apply
    saveSettings(settings);
    applyTheme(settings.themeMode);
    applyAccent(settings.accentColor);
    setCurrentSettings(settings);
    i18n.changeLanguage(settings.language);
  }, [settings]);

  // follow system changes while in system mode
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (settings.themeMode === 'system') applyTheme('system');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [settings.themeMode]);

  const api = useMemo<SettingsContextValue>(() => ({
    settings,
    setLanguage: (language) => setSettings((s) => ({ ...s, language })),
    setCurrency: (currency) => setSettings((s) => ({ ...s, currency })),
    setThemeMode: (themeMode) => setSettings((s) => ({ ...s, themeMode })),
    setAccentColor: (accentColor) => setSettings((s) => ({ ...s, accentColor })),
  }), [settings]);

  return (
    <SettingsContext.Provider value={api}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
