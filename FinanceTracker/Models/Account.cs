using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Api.Models;

public class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Name { get; set; } = "";

    [MaxLength(30)]
    public string? Type { get; set; } // "cash", "bank", "investment", "credit", "loan", etc.

    public bool IsLiability { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<AccountSnapshot> Snapshots { get; set; } = new();
}
