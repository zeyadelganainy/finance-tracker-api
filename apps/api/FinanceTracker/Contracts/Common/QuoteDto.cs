namespace FinanceTracker.Contracts.Common;

/// <summary>
/// Represents a market quote for a ticker (stock, ETF, gold, etc.)
/// </summary>
public class QuoteDto
{
    /// <summary>
    /// Ticker symbol (e.g., "AAPL", "MSFT", "XAU")
    /// </summary>
    public required string Ticker { get; set; }

    /// <summary>
    /// Current price in the requested currency
    /// </summary>
    public decimal? Price { get; set; }

    /// <summary>
    /// Currency code (e.g., "USD", "CAD", "EUR", "GBP")
    /// </summary>
    public required string Currency { get; set; }

    /// <summary>
    /// Timestamp when the price was last updated (UTC)
    /// </summary>
    public DateTime? AsOfUtc { get; set; }

    /// <summary>
    /// Source of the quote ("finnhub", "gold-api")
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// True if the quote is from cache and may be stale
    /// </summary>
    public bool IsStale { get; set; }

    /// <summary>
    /// Error message if quote retrieval failed
    /// </summary>
    public string? Error { get; set; }
}
