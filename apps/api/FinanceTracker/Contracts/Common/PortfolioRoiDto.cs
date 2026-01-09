namespace FinanceTracker.Contracts.Common;

/// <summary>
/// Portfolio ROI response containing items and totals
/// </summary>
public class PortfolioRoiResponseDto
{
    /// <summary>
    /// List of portfolio items with ROI calculations
    /// </summary>
    public required List<PortfolioRoiItemDto> Items { get; set; } = new();

    /// <summary>
    /// Aggregated portfolio totals
    /// </summary>
    public required PortfolioTotalsDto Totals { get; set; }
}

/// <summary>
/// Single asset item in the portfolio with ROI metrics
/// </summary>
public class PortfolioRoiItemDto
{
    /// <summary>
    /// Asset ID
    /// </summary>
    public Guid AssetId { get; set; }

    /// <summary>
    /// Asset name
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Asset class (Stock, Crypto, Metal, etc.)
    /// </summary>
    public required string AssetClass { get; set; }

    /// <summary>
    /// Ticker symbol (null if not available)
    /// </summary>
    public string? Ticker { get; set; }

    /// <summary>
    /// Quantity held
    /// </summary>
    public decimal Quantity { get; set; }

    /// <summary>
    /// Unit of measurement (shares, oz, kg, etc.)
    /// </summary>
    public string? Unit { get; set; }

    /// <summary>
    /// Cost basis per unit
    /// </summary>
    public decimal? CostBasisPerUnit { get; set; }

    /// <summary>
    /// Total cost basis
    /// </summary>
    public decimal CostBasisTotal { get; set; }

    /// <summary>
    /// Current unit price (in portfolio currency)
    /// </summary>
    public decimal? UnitPrice { get; set; }

    /// <summary>
    /// Current total value (in portfolio currency)
    /// </summary>
    public decimal? CurrentValue { get; set; }

    /// <summary>
    /// Unrealized gain/loss in absolute terms
    /// </summary>
    public decimal? UnrealizedGain { get; set; }

    /// <summary>
    /// ROI as percentage
    /// </summary>
    public decimal? RoiPercent { get; set; }

    /// <summary>
    /// Currency code used for pricing
    /// </summary>
    public required string Currency { get; set; }

    /// <summary>
    /// When the quote was last updated
    /// </summary>
    public DateTime? QuoteAsOfUtc { get; set; }

    /// <summary>
    /// True if using stale cached quote
    /// </summary>
    public bool IsQuoteStale { get; set; }

    /// <summary>
    /// Error message if pricing failed
    /// </summary>
    public string? Error { get; set; }
}

/// <summary>
/// Aggregated portfolio totals
/// </summary>
public class PortfolioTotalsDto
{
    /// <summary>
    /// Sum of all cost basis (items with valid quotes)
    /// </summary>
    public decimal CostBasisTotal { get; set; }

    /// <summary>
    /// Sum of all current values (items with valid quotes)
    /// </summary>
    public decimal CurrentValueTotal { get; set; }

    /// <summary>
    /// Sum of all unrealized gains
    /// </summary>
    public decimal UnrealizedGainTotal { get; set; }

    /// <summary>
    /// Overall portfolio ROI percentage
    /// </summary>
    public decimal? RoiPercentTotal { get; set; }

    /// <summary>
    /// Number of items with valid quotes
    /// </summary>
    public int ItemsWithValidQuotes { get; set; }

    /// <summary>
    /// Number of items with pricing errors/warnings
    /// </summary>
    public int ItemsWithErrors { get; set; }
}
