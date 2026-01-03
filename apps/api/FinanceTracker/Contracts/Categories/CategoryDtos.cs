using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Categories;

public record CreateCategoryRequest(
    [Required, MaxLength(50)] string Name,
    [MaxLength(20)] string? Type
);

public record UpdateCategoryRequest(
    [Required] int Id,
    [Required, MaxLength(50)] string Name,
    [MaxLength(20)] string? Type
);

public record CategoryResponse(
    int Id,
    string Name,
    string? Type
);
