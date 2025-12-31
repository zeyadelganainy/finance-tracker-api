using FinanceTracker.Auth;
using FinanceTracker.Contracts.AI;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

/// <summary>
/// Provides structured financial data for AI/LLM insight generation
/// </summary>
[ApiController]
[Route("ai")]
[Authorize]
public class AIContextController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public AIContextController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Returns comprehensive financial context for AI analysis
    /// Includes accounts, assets, transactions summary, and categories
    /// </summary>
    [HttpGet("context")]
    public async Task<IActionResult> GetContext()
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // Get accounts with latest balances (filtered by user)
        var accounts = await _db.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .Include(a => a.Snapshots)
            .OrderBy(a => a.Name)
            .ToListAsync();

        var accountsData = accounts.Select(a =>
        {
            var latestSnapshot = a.Snapshots
                .OrderByDescending(s => s.Date)
                .FirstOrDefault();

            return new AIAccountData(
                a.Id,
                a.Name,
                a.Type,
                a.IsLiability,
                latestSnapshot?.Balance,
                latestSnapshot?.Date
            );
        }).ToList();

        var totalBalance = accountsData
            .Where(a => !a.IsLiability && a.LatestBalance.HasValue)
            .Sum(a => a.LatestBalance!.Value)
            - accountsData
                .Where(a => a.IsLiability && a.LatestBalance.HasValue)
                .Sum(a => a.LatestBalance!.Value);

        var accountsSummary = new AIAccountsSummary(
            accountsData.Count,
            totalBalance,
            accountsData
        );

        // Get assets (filtered by user)
        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.Name)
            .ToListAsync();

        var assetsData = assets.Select(a => new AIAssetData(
            a.Id,
            a.Name,
            a.AssetClass,
            a.Ticker,
            a.Quantity,
            a.Unit,
            a.CostBasisTotal,
            a.PurchaseDate
        )).ToList();

        var assetsSummary = new AIAssetsSummary(
            assetsData.Count,
            assetsData.Sum(a => a.CostBasisTotal),
            assetsData
        );

        // Get transactions summary (filtered by user)
        var transactions = await _db.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .Include(t => t.Category)
            .OrderBy(t => t.Date)
            .ToListAsync();

        var totalIncome = transactions.Where(t => t.Amount > 0).Sum(t => t.Amount);
        var totalExpenses = transactions.Where(t => t.Amount < 0).Sum(t => t.Amount);
        
        var categoryBreakdown = transactions
            .GroupBy(t => t.Category.Name)
            .Select(g => new AICategoryBreakdown(
                g.Key,
                g.Sum(t => t.Amount),
                g.Count()
            ))
            .OrderBy(c => c.Total)
            .ToList();

        var transactionsSummary = new AITransactionsSummary(
            transactions.Count,
            totalIncome,
            totalExpenses,
            totalIncome + totalExpenses, // Net (expenses are negative)
            transactions.Count > 0 ? transactions.First().Date : (DateOnly?)null,
            transactions.Count > 0 ? transactions.Last().Date : (DateOnly?)null,
            categoryBreakdown
        );

        // Get categories (filtered by user)
        var categories = await _db.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Name)
            .Select(c => c.Name)
            .ToListAsync();

        var categoriesSummary = new AICategoriesSummary(
            categories.Count,
            categories
        );

        var response = new AIContextResponse(
            accountsSummary,
            assetsSummary,
            transactionsSummary,
            categoriesSummary
        );

        return Ok(response);
    }
}
