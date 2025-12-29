namespace FinanceTracker.Contracts.Categories;

public record CreateCategoryRequest(
    string Name
);

public record CategoryResponse(
    int Id,
    string Name
);
