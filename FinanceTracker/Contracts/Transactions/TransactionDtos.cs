using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Transactions;

public record CreateTransactionRequest(
    [property: Required, Range(typeof(decimal), "-1000000000", "1000000000")]
    decimal Amount,
    [property: Required]
    DateOnly Date,
    [property: Required, Range(1, int.MaxValue)]
    int CategoryId,
    [property: MaxLength(200)]
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
