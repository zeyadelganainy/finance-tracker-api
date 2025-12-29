namespace FinanceTracker.Contracts.Summary;

public record MonthlySummaryResponse(
    string Month,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal Net,
    List<ExpenseBreakdownDto> ExpenseBreakdown
);

public record ExpenseBreakdownDto(
    int CategoryId,
    string CategoryName,
    decimal Total
);
