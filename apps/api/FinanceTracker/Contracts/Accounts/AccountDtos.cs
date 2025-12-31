using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Accounts;

public record CreateAccountRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(100)] string? Institution,
    [MaxLength(30)] string? Type,
    [MaxLength(10)] string Currency = "USD",
    bool IsLiability = false
);

public record AccountResponse(
    Guid Id,
    string Name,
    string? Institution,
    string? Type,
    string Currency,
    bool IsLiability,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record AccountDetailResponse(
    Guid Id,
    string Name,
    string? Institution,
    string? Type,
    string Currency,
    bool IsLiability,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    decimal? LatestBalance,
    DateOnly? LatestBalanceDate,
    int SnapshotCount
);

public record UpdateAccountRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(100)] string? Institution,
    [MaxLength(30)] string? Type,
    [MaxLength(10)] string Currency = "USD"
);
