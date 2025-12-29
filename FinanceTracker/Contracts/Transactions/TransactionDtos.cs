namespace FinanceTracker.Contracts.Transactions;

public record CreateTransactionRequest(
    decimal Amount,
    DateOnly Date,
    int CategoryId,
    string? Description
);

public record TransactionResponse(
    int Id,
    decimal Amount,
    DateOnly Date,
    string? Description,
    TransactionCategoryDto Category
);

public record TransactionCategoryDto(
    int Id,
    string Name
);
