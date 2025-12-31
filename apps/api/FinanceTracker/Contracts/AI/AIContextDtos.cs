namespace FinanceTracker.Contracts.AI;

/// <summary>
/// Structured data for AI/LLM to generate financial insights
/// </summary>
public record AIContextResponse(
    AIAccountsSummary Accounts,
    AIAssetsSummary Assets,
    AITransactionsSummary Transactions,
    AICategoriesSummary Categories
);

public record AIAccountsSummary(
    int TotalAccounts,
    decimal TotalBalance,
    List<AIAccountData> Items
);

public record AIAccountData(
    Guid Id,
    string Name,
    string? Type,
    bool IsLiability,
    decimal? LatestBalance,
    DateOnly? LatestBalanceDate
);

public record AIAssetsSummary(
    int TotalAssets,
    decimal TotalCostBasis,
    List<AIAssetData> Items
);

public record AIAssetData(
    Guid Id,
    string Name,
    string AssetClass,
    string? Ticker,
    decimal Quantity,
    string? Unit,
    decimal CostBasisTotal,
    DateTime? PurchaseDate
);

public record AITransactionsSummary(
    int TotalCount,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal NetCashFlow,
    DateOnly? EarliestDate,
    DateOnly? LatestDate,
    List<AICategoryBreakdown> CategoryBreakdown
);

public record AICategoryBreakdown(
    string CategoryName,
    decimal Total,
    int Count
);

public record AICategoriesSummary(
    int TotalCategories,
    List<string> CategoryNames
);
