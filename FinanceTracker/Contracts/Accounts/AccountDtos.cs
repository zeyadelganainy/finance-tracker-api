namespace FinanceTracker.Contracts.Accounts;

public record CreateAccountRequest(
    string Name,
    string? Type,
    bool IsLiability
);

public record AccountResponse(
    Guid Id,
    string Name,
    string? Type,
    bool IsLiability
);
