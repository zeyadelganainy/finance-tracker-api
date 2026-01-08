export type AccentColor = 'blue' | 'emerald' | 'purple' | 'orange' | 'rose';
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
  accentColor: 'blue',
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
