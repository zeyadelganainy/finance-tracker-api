using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Api.Models;

public class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Institution { get; set; } // Bank name, brokerage, etc.

    [MaxLength(30)]
    public string? Type { get; set; } // "cash", "bank", "investment", "credit", "loan", etc.

    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    public bool IsLiability { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<AccountSnapshot> Snapshots { get; set; } = new();
}
