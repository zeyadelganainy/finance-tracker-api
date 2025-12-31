using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Accounts;

public record CreateAssetRequest(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(30)] string AssetClass, // Stock, Crypto, Metal, CashEquivalent, RealEstate
    [MaxLength(20)] string? Ticker,
    [Range(0.00000001, double.MaxValue)] decimal Quantity,
    [MaxLength(20)] string? Unit, // "oz", "g", "kg", "shares", "btc", etc.
    [Range(0, double.MaxValue)] decimal CostBasisTotal,
    DateTime? PurchaseDate,
    [MaxLength(500)] string? Notes
);

public record AssetResponse(
    Guid Id,
    string Name,
    string AssetClass,
    string? Ticker,
    decimal Quantity,
    string? Unit,
    decimal CostBasisTotal,
    DateTime? PurchaseDate,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record UpdateAssetRequest(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(30)] string AssetClass,
    [MaxLength(20)] string? Ticker,
    [Range(0.00000001, double.MaxValue)] decimal Quantity,
    [MaxLength(20)] string? Unit,
    [Range(0, double.MaxValue)] decimal CostBasisTotal,
    DateTime? PurchaseDate,
    [MaxLength(500)] string? Notes
);
