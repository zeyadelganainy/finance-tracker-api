using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Accounts;

public record CreateAssetRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(50)] string? AssetClass,
    [MaxLength(20)] string? Ticker
);

public record AssetResponse(
    Guid Id,
    string Name,
    string? AssetClass,
    string? Ticker
);
