namespace FinanceTracker.Contracts.Common;

public record ErrorResponse(
    string Error,
    string TraceId
);
