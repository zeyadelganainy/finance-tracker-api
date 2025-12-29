using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Accounts;

public record CreateAccountRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(30)] string? Type,
    bool IsLiability
);

public record AccountResponse(
    Guid Id,
    string Name,
    string? Type,
    bool IsLiability
);
