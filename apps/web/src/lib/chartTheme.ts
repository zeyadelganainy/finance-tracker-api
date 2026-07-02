/**
 * Shared chart theme for WealthWise.
 *
 * Every chart component consumes this module — no chart defines its own colors,
 * axis styles, or formatters inline. The palette is derived from the design
 * tokens (muted gold accent + complementary desaturated hues) so charts feel
 * like they belong on a Bloomberg terminal, not a default Recharts demo.
 */
import { useEffect, useState } from 'react';
import { getCurrentSettings } from '../settings/registry';

export interface ChartTheme {
  isDark: boolean;
  /** Ordered palette; index 0 is the most important series. */
  colors: string[];
  /** The accent color (gold) resolved from the live CSS variable. */
  accent: string;
  grid: string;
  axis: string;
  tooltip: {
    bg: string;
    border: string;
    text: string;
  };
  positive: string;
  negative: string;
  /** Muted neutral used for the "expense" series / "Other" bucket. */
  neutral: string;
}

const DARK: Omit<ChartTheme, 'isDark' | 'accent'> = {
  colors: ['#c9a96e', '#5b8a72', '#6b7fa3', '#a67c8a', '#8b8569', '#7d8fa3', '#9a8f7d'],
  grid: 'rgba(255, 255, 255, 0.04)',
  axis: '#5a5b5e',
  tooltip: {
    bg: '#1e2028',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#e8e6e1',
  },
  positive: '#4caf82',
  negative: '#cf6679',
  neutral: '#5a5b5e',
};

const LIGHT: Omit<ChartTheme, 'isDark' | 'accent'> = {
  colors: ['#a8853a', '#3d7a5a', '#4a6380', '#8a5a6a', '#6b6550', '#5f7388', '#7c7058'],
  grid: 'rgba(0, 0, 0, 0.05)',
  axis: '#8a8a8a',
  tooltip: {
    bg: '#ffffff',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#1a1a1a',
  },
  positive: '#2f8f5b',
  negative: '#c0455b',
  neutral: '#b0b0b0',
};

function readAccent(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
  return v || fallback;
}

function isDarkNow(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark');
}

export function getChartTheme(isDark = isDarkNow()): ChartTheme {
  const base = isDark ? DARK : LIGHT;
  const accent = readAccent(base.colors[0]);
  // Lead the palette with the live accent so custom accent colors flow through.
  const colors = [accent, ...base.colors.slice(1)];
  return { isDark, accent, ...base, colors };
}

/**
 * React hook that returns the current chart theme and re-renders when the
 * <html> `dark` class toggles (theme switch) so charts restyle instantly.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() => getChartTheme());

  useEffect(() => {
    const update = () => setTheme(getChartTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Shared axis/tick styling for Recharts. */
export const CHART_DEFAULTS = {
  axisTick: {
    fontSize: 11,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  },
  // Whether draw-in animations should run (respects reduced-motion).
  animate:
    typeof window !== 'undefined'
      ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true,
  animationDuration: 600,
};

/**
 * Abbreviated currency for axes/compact labels: $1.2K, $45.3K, $1.2M.
 * Uses the user's selected currency symbol via Intl.
 */
export function formatCompactCurrency(value: number): string {
  const settings = getCurrentSettings();
  const locale = settings.language === 'fr-CA' ? 'fr-CA' : 'en-US';
  const currency = settings.currency || 'USD';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export type DateGranularity = 'day' | 'month' | 'year';

/** Consistent, compact x-axis date formatting. */
export function formatChartDate(date: string | Date, granularity: DateGranularity = 'day'): string {
  const settings = getCurrentSettings();
  const locale = settings.language === 'fr-CA' ? 'fr-CA' : 'en-US';
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions =
    granularity === 'year'
      ? { year: 'numeric' }
      : granularity === 'month'
      ? { month: 'short' }
      : { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(locale, opts).format(d);
}
