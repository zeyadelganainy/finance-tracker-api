namespace FinanceTracker.Contracts.Valuation;

/// <summary>
/// Asset valuation data (placeholder for future pricing integration)
/// </summary>
public record AssetValuationResponse(
    List<AssetValuationData> Assets,
    string Message
);

public record AssetValuationData(
    Guid AssetId,
    string Name,
    string AssetClass,
    string? Ticker,
    decimal Quantity,
    string? Unit,
    decimal CostBasisTotal,
    decimal? CurrentPrice,
    decimal? CurrentValue,
    decimal? UnrealizedGainLoss,
    decimal? ROIPercentage,
    string ValuationStatus
);
