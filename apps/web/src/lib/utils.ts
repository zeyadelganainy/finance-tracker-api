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
