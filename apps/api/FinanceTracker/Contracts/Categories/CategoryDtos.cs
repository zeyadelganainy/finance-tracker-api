using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Categories;

public record CreateCategoryRequest(
    [Required, MaxLength(50)] string Name
);

public record CategoryResponse(
    int Id,
    string Name
);
