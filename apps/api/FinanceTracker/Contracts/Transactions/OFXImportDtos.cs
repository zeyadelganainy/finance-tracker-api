namespace FinanceTracker.Contracts.Transactions;

public record OFXParseResponse(
    List<ImportTransactionRow> Rows
);

public record ImportTransactionRow(
    string Date,
    decimal Amount,
    string? Description,
    string? Payee,
    string? Memo
);

public record OFXConfirmRequest(
    List<ImportTransactionDto> Transactions
);

public record OFXImportError(
    int Row,
    string Message
);

public record OFXImportResponse(
    int Imported,
    int Skipped,
    int Failed,
    List<OFXImportError>? Errors
);
