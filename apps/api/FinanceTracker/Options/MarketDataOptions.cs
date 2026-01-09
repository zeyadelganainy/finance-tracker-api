namespace FinanceTracker.Options;

/// <summary>
/// Market data API configuration options
/// </summary>
public class MarketDataOptions
{
    public const string SectionName = "MarketData";

    /// <summary>
    /// Finnhub API key
    /// Environment variable: FINNHUB_API_KEY
    /// </summary>
    public required string FinnhubApiKey { get; set; }

    /// <summary>
    /// Cache duration in minutes (default 15)
    /// </summary>
    public int CacheMinutes { get; set; } = 15;
}
