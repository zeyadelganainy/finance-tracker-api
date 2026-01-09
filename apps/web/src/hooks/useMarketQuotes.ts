import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';
import { QuoteDto, PortfolioRoiResponse } from '../types/api';
import { useSettings } from '../settings/SettingsProvider';

/**
 * Fetch market quotes for one or more tickers in the selected currency
 * @param tickers - Array of ticker symbols (e.g., ['AAPL', 'MSFT', 'XAU'])
 * @param enabled - Whether the query should run (default: true)
 */
export function useMarketQuotes(tickers: string[] | undefined, enabled = true) {
  const { settings } = useSettings();

  const isQueryEnabled = enabled && !!tickers && tickers.length > 0;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[useMarketQuotes] Hook called', {
      tickers,
      enabled,
      isQueryEnabled,
      currency: settings.currency,
    });
  }

  return useQuery({
    queryKey: ['market-quotes', tickers, settings.currency],
    queryFn: async () => {
      if (!tickers || tickers.length === 0) {
        return [];
      }
      const tickerList = tickers.join(',');
      return apiFetch<QuoteDto[]>(
        `/market/quotes?tickers=${encodeURIComponent(tickerList)}&currency=${encodeURIComponent(settings.currency)}`
      );
    },
    enabled: isQueryEnabled,
    staleTime: 1000 * 60 * 15, // 15 minutes, matching backend cache
  });
}

/**
 * Fetch a single market quote for a ticker in the selected currency
 * @param ticker - Ticker symbol (e.g., 'AAPL', 'XAU')
 * @param enabled - Whether the query should run (default: true)
 */
export function useMarketQuote(ticker: string | undefined, enabled = true) {
  const { settings } = useSettings();

  const isQueryEnabled = enabled && !!ticker;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[useMarketQuote] Hook called', {
      ticker,
      enabled,
      isQueryEnabled,
      currency: settings.currency,
    });
  }

  return useQuery({
    queryKey: ['market-quote', ticker, settings.currency],
    queryFn: async () => {
      if (!ticker) {
        return null;
      }
      return apiFetch<QuoteDto>(
        `/market/quotes/${encodeURIComponent(ticker)}?currency=${encodeURIComponent(settings.currency)}`
      );
    },
    enabled: isQueryEnabled,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Fetch portfolio ROI in the selected currency
 * @param enabled - Whether the query should run (default: true)
 */
export function usePortfolioRoi(enabled = true) {
  const { settings } = useSettings();

  console.log('[usePortfolioRoi] Hook called', {
    enabled,
    currency: settings.currency,
    queryKey: ['portfolio-roi', settings.currency],
  });

  return useQuery({
    queryKey: ['portfolio-roi', settings.currency],
    queryFn: async () => {
      console.log('[usePortfolioRoi] Executing query for currency:', settings.currency);
      const result = await apiFetch<PortfolioRoiResponse>(
        `/portfolio/roi?currency=${encodeURIComponent(settings.currency)}`
      );
      console.log('[usePortfolioRoi] Query result:', result);
      return result;
    },
    enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
  });
}
