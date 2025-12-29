namespace FinanceTracker.Contracts.Accounts;

public record CreateAssetRequest(
    string Name,
    string? AssetClass,
    string? Ticker
);

public record AssetResponse(
    Guid Id,
    string Name,
    string? AssetClass,
    string? Ticker
);
