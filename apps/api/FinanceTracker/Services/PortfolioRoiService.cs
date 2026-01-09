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
        var tickersToFetch = assets
            .Where(a => !string.IsNullOrWhiteSpace(a.Ticker))
            .Select(a => a.Ticker!)
            .Distinct()
            .ToList();

        // Fetch all quotes at once
        var quotes = new Dictionary<string, QuoteDto>(StringComparer.OrdinalIgnoreCase);
        if (tickersToFetch.Any())
        {
            var quoteList = await _marketData.GetQuotesAsync(tickersToFetch, currency, ct);
            foreach (var quote in quoteList)
            {
                quotes[quote.Ticker] = quote;
            }
        }

        // Process each asset
        foreach (var asset in assets)
        {
            var item = new PortfolioRoiItemDto
            {
                AssetId = asset.Id,
                Name = asset.Name,
                AssetClass = asset.AssetClass,
                Ticker = asset.Ticker,
                Quantity = asset.Quantity,
                Unit = asset.Unit,
                CostBasisTotal = asset.CostBasisTotal,
                Currency = currency
            };

            // Handle missing ticker
            if (string.IsNullOrWhiteSpace(asset.Ticker))
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
            if (!quotes.TryGetValue(asset.Ticker, out var quote))
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
