export type AccentColor = 'gold' | 'sage' | 'slate' | 'rose' | 'stone';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  language: 'en' | 'fr-CA';
  currency: 'CAD' | 'USD' | 'EUR' | 'GBP';
  themeMode: ThemeMode;
  accentColor: AccentColor;
}

let current: AppSettings = {
  language: 'en',
  currency: 'CAD',
  themeMode: 'system',
  accentColor: 'gold',
};

const listeners = new Set<(s: AppSettings) => void>();

export function getCurrentSettings(): AppSettings {
  return current;
}

export function setCurrentSettings(s: AppSettings) {
  current = s;
  listeners.forEach((fn) => fn(current));
}

export function onSettingsChange(fn: (s: AppSettings) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
