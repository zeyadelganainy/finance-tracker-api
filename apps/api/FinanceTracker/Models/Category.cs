using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Models;

public class Category
{
    [Key]
    public int Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Type { get; set; }
}