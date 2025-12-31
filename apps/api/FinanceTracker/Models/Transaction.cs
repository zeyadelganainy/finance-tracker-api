using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinanceTracker.Models;

public class Transaction
{
    public int Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    // Positive = income, Negative = expense (simple rule)
    [Column(TypeName = "numeric(12,2)")]
    public decimal Amount { get; set; }

    public DateOnly Date { get; set; }

    public int CategoryId { get; set; }
    public Category? Category { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }
}
