using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Accounts;

public record CreateAccountRequest(
    [property: Required, MaxLength(100)] string Name,
    [property: MaxLength(30)] string? Type,
    bool IsLiability
);

public record AccountResponse(
    Guid Id,
    string Name,
    string? Type,
    bool IsLiability
);
