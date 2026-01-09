using FinanceTracker.Contracts.Common;
using FinanceTracker.Data;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Services;

/// <summary>
/// Service for calculating portfolio ROI metrics
/// </summary>
public interface IPortfolioRoiService
{
    /// <summary>
    /// Calculate ROI for all assets owned by a user in the specified currency
    /// </summary>
    Task<PortfolioRoiResponseDto> CalculatePortfolioRoiAsync(Guid userId, string currency, CancellationToken ct = default);
}

public class PortfolioRoiService : IPortfolioRoiService
{
    private readonly AppDbContext _db;
    private readonly IMarketDataService _marketData;
    private readonly ILogger<PortfolioRoiService> _logger;

    public PortfolioRoiService(
        AppDbContext db,
        IMarketDataService marketData,
        ILogger<PortfolioRoiService> logger)
    {
        _db = db;
        _marketData = marketData;
        _logger = logger;
    }

    public async Task<PortfolioRoiResponseDto> CalculatePortfolioRoiAsync(Guid userId, string currency, CancellationToken ct = default)
    {
        // Fetch all assets for the user
        var assets = await _db.Assets
            .Where(a => a.UserId == userId)
            .ToListAsync(ct);

        var items = new List<PortfolioRoiItemDto>();
        var itemsWithValidQuotes = 0;
        var itemsWithErrors = 0;

        // Collect all tickers for batch fetching
        // Special-case metals with missing ticker: default to XAU
        var tickersToFetch = assets
            .Select(a =>
            {
                var hasTicker = !string.IsNullOrWhiteSpace(a.Ticker);
                var isMetal = string.Equals(a.AssetClass, "metal", StringComparison.OrdinalIgnoreCase);
                return hasTicker ? a.Ticker! : (isMetal ? "XAU" : null);
            })
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .ToList();

        // Fetch all quotes at once
        var quotes = new Dictionary<string, QuoteDto>(StringComparer.OrdinalIgnoreCase);
        if (tickersToFetch.Any())
        {
            // For now, fetch individually to handle per-asset weight units for gold
            // In the future, could batch non-gold tickers separately
            foreach (var asset in assets)
            {
                var isMetal = string.Equals(asset.AssetClass, "metal", StringComparison.OrdinalIgnoreCase);
                var tickerToUse = !string.IsNullOrWhiteSpace(asset.Ticker) ? asset.Ticker! : (isMetal ? "XAU" : null);
                
                if (string.IsNullOrWhiteSpace(tickerToUse))
                    continue;

                // Skip if already fetched (same ticker+unit combo)
                var cacheKey = isMetal && tickerToUse.Equals("XAU", StringComparison.OrdinalIgnoreCase)
                    ? $"{tickerToUse}:{asset.Unit ?? "oz"}"
                    : tickerToUse;
                
                if (quotes.ContainsKey(cacheKey))
                    continue;

                // Fetch quote with weight unit for gold
                var quote = isMetal && tickerToUse.Equals("XAU", StringComparison.OrdinalIgnoreCase)
                    ? await _marketData.GetQuoteAsync(tickerToUse, currency, asset.Unit, ct)
                    : await _marketData.GetQuoteAsync(tickerToUse, currency, ct);
                
                quotes[cacheKey] = quote;
            }
        }

        // Process each asset
        foreach (var asset in assets)
        {
            var isMetal = string.Equals(asset.AssetClass, "metal", StringComparison.OrdinalIgnoreCase);
            var tickerToUse = !string.IsNullOrWhiteSpace(asset.Ticker) ? asset.Ticker! : (isMetal ? "XAU" : null);

            // For gold, use ticker+unit as lookup key
            var quoteKey = isMetal && tickerToUse?.Equals("XAU", StringComparison.OrdinalIgnoreCase) == true
                ? $"{tickerToUse}:{asset.Unit ?? "oz"}"
                : tickerToUse;

            var item = new PortfolioRoiItemDto
            {
                AssetId = asset.Id,
                Name = asset.Name,
                AssetClass = asset.AssetClass,
                // Expose the effective ticker for pricing (XAU for gold when missing)
                Ticker = tickerToUse ?? asset.Ticker,
                Quantity = asset.Quantity,
                Unit = asset.Unit,
                CostBasisTotal = asset.CostBasisTotal,
                Currency = currency
            };

            // Handle missing ticker for non-metal assets
            if (string.IsNullOrWhiteSpace(tickerToUse))
            {
                item.Error = "No ticker provided; cannot price this asset.";
                item.IsQuoteStale = true;
                itemsWithErrors++;
                items.Add(item);
                continue;
            }

            // Handle zero cost basis
            if (asset.CostBasisTotal == 0)
            {
                item.Error = "Cost basis is zero; cannot calculate ROI.";
                item.IsQuoteStale = true;
                itemsWithErrors++;
                items.Add(item);
                continue;
            }

            // Get quote  
            if (string.IsNullOrWhiteSpace(quoteKey) || !quotes.TryGetValue(quoteKey, out var quote))
            {
                item.Error = "Failed to fetch quote for this ticker.";
                item.IsQuoteStale = true;
                itemsWithErrors++;
                items.Add(item);
                continue;
            }

            // Check for quote errors
            if (!quote.Price.HasValue)
            {
                item.Error = quote.Error ?? "Quote price unavailable.";
                item.IsQuoteStale = quote.IsStale;
                itemsWithErrors++;
                items.Add(item);
                continue;
            }

            // Calculate ROI metrics
            var unitPrice = quote.Price.Value;
            var currentValue = asset.Quantity * unitPrice;
            var unrealizedGain = currentValue - asset.CostBasisTotal;
            var roiPercent = (unrealizedGain / asset.CostBasisTotal) * 100;

            item.UnitPrice = unitPrice;
            item.CostBasisPerUnit = asset.CostBasisTotal / asset.Quantity;
            item.CurrentValue = currentValue;
            item.UnrealizedGain = unrealizedGain;
            item.RoiPercent = roiPercent;
            item.QuoteAsOfUtc = quote.AsOfUtc;
            item.IsQuoteStale = quote.IsStale;
            if (quote.IsStale)
            {
                item.Error = quote.Error;
            }

            itemsWithValidQuotes++;
            items.Add(item);
        }

        // Calculate totals (only items with valid quotes)
        var itemsWithValidValues = items.Where(i => i.CurrentValue.HasValue).ToList();
        var totals = new PortfolioTotalsDto
        {
            CostBasisTotal = itemsWithValidValues.Sum(i => i.CostBasisTotal),
            CurrentValueTotal = itemsWithValidValues.Sum(i => i.CurrentValue ?? 0),
            UnrealizedGainTotal = itemsWithValidValues.Sum(i => i.UnrealizedGain ?? 0),
            ItemsWithValidQuotes = itemsWithValidQuotes,
            ItemsWithErrors = itemsWithErrors
        };

        // Calculate total ROI percent
        if (totals.CostBasisTotal > 0)
        {
            totals.RoiPercentTotal = (totals.UnrealizedGainTotal / totals.CostBasisTotal) * 100;
        }

        return new PortfolioRoiResponseDto
        {
            Items = items,
            Totals = totals
        };
    }
}
