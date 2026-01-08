namespace FinanceTracker.Contracts.Transactions;

public record ImportTransactionDto(
    string Date, // ISO yyyy-mm-dd
    decimal Amount,
    string? Description,
    string? CategoryName
);

public record ImportTransactionsRequest(
    string AccountId,
    List<ImportTransactionDto> Transactions
);

public record ImportTransactionError(
    int Row,
    string Message
);

public record ImportTransactionsResponse(
    int Imported,
    int Skipped,
    int Failed,
    List<ImportTransactionError>? Errors
);
