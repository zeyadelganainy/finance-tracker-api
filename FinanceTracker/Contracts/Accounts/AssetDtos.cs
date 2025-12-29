using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Accounts;

public record CreateAssetRequest(
    [property: Required, MaxLength(100)] string Name,
    [property: MaxLength(50)] string? AssetClass,
    [property: MaxLength(20)] string? Ticker
);

public record AssetResponse(
    Guid Id,
    string Name,
    string? AssetClass,
    string? Ticker
);
