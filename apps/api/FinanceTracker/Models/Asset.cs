using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Api.Models;

public class Asset
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string AssetClass { get; set; } = string.Empty; // Stock, Crypto, Metal, CashEquivalent, RealEstate

    [MaxLength(20)]
    public string? Ticker { get; set; } // For stocks/ETFs/crypto symbols

    public decimal Quantity { get; set; } // How much of the asset user holds

    [MaxLength(20)]
    public string? Unit { get; set; } // "oz", "g", "kg", "shares", "btc", etc.

    public decimal CostBasisTotal { get; set; } // Total cost basis

    public DateTime? PurchaseDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
