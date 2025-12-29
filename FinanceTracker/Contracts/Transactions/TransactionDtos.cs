using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Transactions;

public record CreateTransactionRequest(
    [Required, Range(typeof(decimal), "-1000000000", "1000000000")]
    decimal Amount,
    [Required]
    DateOnly Date,
    [Required, Range(1, int.MaxValue)]
    int CategoryId,
    [MaxLength(200)]
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
