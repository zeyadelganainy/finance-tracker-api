using FinanceTracker.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Controllers;

[ApiController]
[Route("summary")]
public class SummaryController : ControllerBase
{
    private readonly AppDbContext _db;
    public SummaryController(AppDbContext db) => _db = db;

    // GET /summary/monthly?month=2025-12
    [HttpGet("monthly")]
    public async Task<IActionResult> Monthly([FromQuery] string month)
    {
        if (string.IsNullOrWhiteSpace(month))
            return BadRequest("month is required in format YYYY-MM");

        if (!DateOnly.TryParse($"{month}-01", out var start))
            return BadRequest("Invalid month. Use YYYY-MM.");

        var end = start.AddMonths(1);

        var tx = _db.Transactions.AsNoTracking()
            .Where(t => t.Date >= start && t.Date < end);

        var totalIncome = await tx.Where(t => t.Amount > 0).SumAsync(t => (decimal?)t.Amount) ?? 0m;
        var totalExpenses = await tx.Where(t => t.Amount < 0).SumAsync(t => (decimal?)t.Amount) ?? 0m;

        var byCategory = await tx
            .Where(t => t.Amount < 0)
            .GroupBy(t => t.CategoryId)
            .Select(g => new
            {
                CategoryId = g.Key,
                Total = g.Sum(x => x.Amount) // negative
            })
            .ToListAsync();

        // join category names (simple, readable)
        var categoryIds = byCategory.Select(x => x.CategoryId).ToList();
        var names = await _db.Categories.AsNoTracking()
            .Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name);

        var breakdown = byCategory
            .Select(x => new
            {
                CategoryId = x.CategoryId,
                CategoryName = names.TryGetValue(x.CategoryId, out var n) ? n : "Unknown",
                Total = x.Total
            })
            .OrderBy(x => x.Total) // most negative first
            .ToList();

        return Ok(new
        {
            Month = month,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses, // negative
            Net = totalIncome + totalExpenses,
            ExpenseBreakdown = breakdown
        });
    }
}
