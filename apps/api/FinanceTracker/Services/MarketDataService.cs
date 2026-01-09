using FinanceTracker.Contracts.Common;
using FinanceTracker.ExternalApis;
using FinanceTracker.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace FinanceTracker.Services;

/// <summary>
/// Service for fetching and caching market quotes from external APIs
/// </summary>
public interface IMarketDataService
{
    /// <summary>
    /// Get quotes for multiple tickers in a specified currency
    /// </summary>
    Task<List<QuoteDto>> GetQuotesAsync(List<string> tickers, string currency, CancellationToken ct = default);

    /// <summary>
    /// Get a single quote for a ticker in a specified currency
    /// </summary>
    Task<QuoteDto> GetQuoteAsync(string ticker, string currency, CancellationToken ct = default);
}

public class MarketDataService : IMarketDataService
{
    private readonly IFinnhubClient _finnhub;
    private readonly IGoldApiClient _goldApi;
    private readonly IFxRateClient _fxRateClient;
    private readonly IMemoryCache _cache;
    private readonly MarketDataOptions _options;
    private readonly ILogger<MarketDataService> _logger;

    // Semaphore to throttle concurrent API calls (max 5 concurrent)
    private static readonly SemaphoreSlim _semaphore = new SemaphoreSlim(5, 5);

    public MarketDataService(
        IFinnhubClient finnhub,
        IGoldApiClient goldApi,
        IFxRateClient fxRateClient,
        IMemoryCache cache,
        IOptions<MarketDataOptions> options,
        ILogger<MarketDataService> logger)
    {
        _finnhub = finnhub;
        _goldApi = goldApi;
        _fxRateClient = fxRateClient;
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<List<QuoteDto>> GetQuotesAsync(List<string> tickers, string currency, CancellationToken ct = default)
    {
        // Deduplicate and normalize tickers
        var uniqueTickers = tickers
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.ToUpperInvariant().Trim())
            .Distinct()
            .ToList();

        if (!uniqueTickers.Any())
            return new List<QuoteDto>();

        // Fetch quotes concurrently with throttling
        var tasks = uniqueTickers.Select(t => GetQuoteAsync(t, currency, ct));
        var quotes = await Task.WhenAll(tasks);

        return quotes.ToList();
    }

    public async Task<QuoteDto> GetQuoteAsync(string ticker, string currency, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ticker))
            return new QuoteDto { Ticker = ticker, Currency = currency, Error = "Ticker is empty" };

        ticker = ticker.ToUpperInvariant().Trim();
        currency = currency.ToUpperInvariant();

        // Special handling for gold
        if (ticker == "XAU")
            return await GetGoldQuoteAsync(currency, ct);

        // Standard ticker quote
        var cacheKey = $"quote:ticker:{ticker}:cur:{currency}";

        // Try cache first
        if (_cache.TryGetValue(cacheKey, out var cached))
            return (QuoteDto)cached!;

        // Throttle concurrent calls
        await _semaphore.WaitAsync(ct);
        try
        {
            // Try live fetch
            var liveQuote = await FetchStockQuoteAsync(ticker, currency, ct);
            if (liveQuote != null && liveQuote.Price.HasValue)
            {
                liveQuote.IsStale = false;
                _cache.Set(cacheKey, liveQuote, TimeSpan.FromMinutes(_options.CacheMinutes));
                return liveQuote;
            }

            // Live fetch failed; try cache fallback
            return await FallbackToCache(cacheKey, ticker, currency, "Live quote failed", ct);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task<QuoteDto?> FetchStockQuoteAsync(string ticker, string currency, CancellationToken ct)
    {
        try
        {
            // Fetch from Finnhub (returns USD)
            var finnhubQuote = await _finnhub.GetQuoteAsync(ticker, ct);
            if (finnhubQuote?.CurrentPrice == null)
                return null;

            var priceUsd = finnhubQuote.CurrentPrice.Value;

            // Convert to requested currency if needed
            decimal price = priceUsd;
            if (currency != "USD")
            {
                var conversionRate = await GetFxRateAsync("USD", currency, ct);
                if (conversionRate == null)
                {
                    _logger.LogWarning("Failed to convert USD to {Currency} for {Ticker}", currency, ticker);
                    return null;
                }
                price = priceUsd * conversionRate.Value;
            }

            var asOfUtc = finnhubQuote.Timestamp.HasValue
                ? UnixTimeStampToDateTime(finnhubQuote.Timestamp.Value)
                : DateTime.UtcNow;

            return new QuoteDto
            {
                Ticker = ticker,
                Price = price,
                Currency = currency,
                AsOfUtc = asOfUtc,
                Source = "finnhub",
                IsStale = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching quote for {Ticker}", ticker);
            return null;
        }
    }

    private async Task<QuoteDto> GetGoldQuoteAsync(string currency, CancellationToken ct)
    {
        var cacheKey = $"gold:cur:{currency}";

        // Try cache first
        if (_cache.TryGetValue(cacheKey, out var cached))
            return (QuoteDto)cached!;

        // Throttle
        await _semaphore.WaitAsync(ct);
        try
        {
            // Try live fetch
            var liveQuote = await FetchGoldQuoteAsync(currency, ct);
            if (liveQuote != null && liveQuote.Price.HasValue)
            {
                liveQuote.IsStale = false;
                _cache.Set(cacheKey, liveQuote, TimeSpan.FromMinutes(_options.CacheMinutes));
                return liveQuote;
            }

            // Fallback to cache
            return await FallbackToCache(cacheKey, "XAU", currency, "Live gold quote failed", ct);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task<QuoteDto?> FetchGoldQuoteAsync(string currency, CancellationToken ct)
    {
        try
        {
            // Get USD price from Gold-API
            var response = await _goldApi.GetGoldPriceAsync(ct);
            if (response?.Price == null)
                return null;

            var priceInTargetCurrency = response.Price.Value;

            // If target currency is not USD, convert via FX rate
            if (!currency.Equals("USD", StringComparison.OrdinalIgnoreCase))
            {
                var fxRate = await GetFxRateAsync("USD", currency, ct);
                if (fxRate == null || fxRate == 0)
                    return null;

                priceInTargetCurrency = response.Price.Value * fxRate.Value;
            }

            // Parse timestamp, defaulting to now if not available
            var asOfUtc = !string.IsNullOrEmpty(response.Timestamp)
                ? DateTime.Parse(response.Timestamp, null, System.Globalization.DateTimeStyles.AssumeUniversal)
                : DateTime.UtcNow;

            return new QuoteDto
            {
                Ticker = "XAU",
                Price = priceInTargetCurrency,
                Currency = currency,
                AsOfUtc = asOfUtc,
                Source = "gold-api",
                IsStale = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching gold quote for {Currency}", currency);
            return null;
        }
    }

    private async Task<decimal?> GetFxRateAsync(string baseCurrency, string targetCurrency, CancellationToken ct)
    {
        var cacheKey = $"fx:base:{baseCurrency}:target:{targetCurrency}";

        // Try cache
        if (_cache.TryGetValue(cacheKey, out var cached))
            return (decimal?)cached;

        try
        {
            var response = await _fxRateClient.GetRatesAsync(baseCurrency, ct);
            if (response?.Rates == null || 
                !response.Rates.TryGetValue(targetCurrency, out var rate))
                return null;

            _cache.Set(cacheKey, rate, TimeSpan.FromMinutes(_options.CacheMinutes));
            return rate;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching FX rate from {Base} to {Target}", baseCurrency, targetCurrency);
            return null;
        }
    }

    private async Task<QuoteDto> FallbackToCache(string cacheKey, string ticker, string currency, string errorPrefix, CancellationToken ct)
    {
        // Give cache one more try in case of race condition
        await Task.Delay(100, ct);
        if (_cache.TryGetValue(cacheKey, out var fallback))
        {
            var quote = (QuoteDto)fallback!;
            quote.IsStale = true;
            quote.Error = $"{errorPrefix}. Using cached.";
            return quote;
        }

        return new QuoteDto
        {
            Ticker = ticker,
            Currency = currency,
            IsStale = true,
            Error = $"{errorPrefix} and no cached value available."
        };
    }

    private static DateTime UnixTimeStampToDateTime(long unixTimeStamp)
    {
        var dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
        dateTime = dateTime.AddSeconds(unixTimeStamp);
        return dateTime;
    }
}
