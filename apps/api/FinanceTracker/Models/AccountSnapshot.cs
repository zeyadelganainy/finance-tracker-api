using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Api.Models;

public class AccountSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public DateOnly Date { get; set; }

    [Range(typeof(decimal), "-999999999999", "999999999999")]
    public decimal Balance { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
