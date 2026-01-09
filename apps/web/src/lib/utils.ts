import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getCurrentSettings } from '../settings/registry';

/**
 * Merge class names with tailwind-merge for proper Tailwind CSS class precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with proper locale formatting
 */
export function formatCurrency(amount: number): string {
  const settings = getCurrentSettings();
  const locale = settings.language === 'fr-CA' ? 'fr-CA' : 'en-US';
  const currency = settings.currency || 'USD';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a percentage value
 * @param percent - The percentage value (already in percent form, e.g., 21.63 for 21.63%)
 */
export function formatPercent(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) {
    return '-';
  }
  const settings = getCurrentSettings();
  const locale = settings.language === 'fr-CA' ? 'fr-CA' : 'en-US';
  // Format as a decimal with 2 fraction digits, then add % sign
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent) + '%';
}

/**
 * Format date to locale string
 */
export function formatDate(date: string | Date): string {
  const settings = getCurrentSettings();
  const locale = settings.language === 'fr-CA' ? 'fr-CA' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format datetime to locale string with time
 */
export function formatDateTime(date: string | Date): string {
  const settings = getCurrentSettings();
  const locale = settings.language === 'fr-CA' ? 'fr-CA' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date));
}
