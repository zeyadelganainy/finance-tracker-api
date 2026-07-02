import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppSettings, AccentColor, ThemeMode, setCurrentSettings } from './registry';
import i18n from '../i18n';

const STORAGE_KEY = 'wealthwise:settings';

const VALID_ACCENTS: AccentColor[] = ['gold', 'sage', 'slate', 'rose', 'stone'];

function coerceAccent(value: unknown): AccentColor {
  return VALID_ACCENTS.includes(value as AccentColor) ? (value as AccentColor) : 'gold';
}

function loadSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        language: parsed.language ?? 'en',
        currency: parsed.currency ?? 'CAD',
        themeMode: parsed.themeMode ?? 'system',
        accentColor: coerceAccent(parsed.accentColor),
      };
    } catch {}
  }
  return {
    language: 'en',
    currency: 'CAD',
    themeMode: 'system',
    accentColor: 'gold',
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

// Refined, muted accent options. 'gold' is the signature default and is left to
// the theme-aware CSS variables (different value in light vs dark); the others
// apply a single inline override on both themes.
const ACCENT_COLORS: Record<Exclude<AccentColor, 'gold'>, { base: string; hover: string; soft: string }> = {
  sage: { base: '#5b8a72', hover: '#4d7a63', soft: 'rgba(91, 138, 114, 0.12)' },
  slate: { base: '#6b7fa3', hover: '#5c6f91', soft: 'rgba(107, 127, 163, 0.12)' },
  rose: { base: '#a67c8a', hover: '#946b79', soft: 'rgba(166, 124, 138, 0.12)' },
  stone: { base: '#8b8569', hover: '#79745a', soft: 'rgba(139, 133, 105, 0.12)' },
};

function applyAccent(color: AccentColor) {
  const root = document.documentElement;
  if (color === 'gold') {
    // Defer to the theme's gold tokens defined in index.css
    root.style.removeProperty('--accent-color');
    root.style.removeProperty('--accent-color-hover');
    root.style.removeProperty('--accent-soft');
    root.style.removeProperty('--accent-contrast');
    return;
  }
  const { base, hover, soft } = ACCENT_COLORS[color];
  root.style.setProperty('--accent-color', base);
  root.style.setProperty('--accent-color-hover', hover);
  root.style.setProperty('--accent-soft', soft);
  root.style.setProperty('--accent-contrast', '#ffffff');
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
