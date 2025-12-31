using FinanceTracker.Auth;
using FinanceTracker.Contracts.Valuation;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

/// <summary>
/// Asset valuation endpoints (placeholder for future market pricing integration)
/// </summary>
[ApiController]
[Route("assets")]
[Authorize]
public class ValuationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public ValuationController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Returns valuation data for all assets
    /// Currently returns null prices - market pricing not yet implemented
    /// This allows frontend to wire UI now and plug in real pricing later
    /// </summary>
    [HttpGet("valuation")]
    public async Task<IActionResult> GetValuation()
    {
        var userId = Guid.Parse(_currentUser.UserId);

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.UserId == userId) // Filter by user
            .OrderBy(a => a.Name)
            .ToListAsync();

        var valuationData = assets.Select(asset => new AssetValuationData(
            asset.Id,
            asset.Name,
            asset.AssetClass,
            asset.Ticker,
            asset.Quantity,
            asset.Unit,
            asset.CostBasisTotal,
            CurrentPrice: null,      // Market pricing not implemented yet
            CurrentValue: null,      // Calculated as: quantity * currentPrice
            UnrealizedGainLoss: null, // Calculated as: currentValue - costBasisTotal
            ROIPercentage: null,     // Calculated as: (unrealizedGainLoss / costBasisTotal) * 100
            ValuationStatus: "NOT_AVAILABLE"
        )).ToList();

        var response = new AssetValuationResponse(
            valuationData,
            Message: "Market pricing not enabled yet. Valuation fields will be populated when pricing service is integrated."
        );

        return Ok(response);
    }

    /// <summary>
    /// Returns valuation data for a specific asset
    /// Currently returns null prices - market pricing not yet implemented
    /// </summary>
    [HttpGet("{id:guid}/valuation")]
    public async Task<IActionResult> GetAssetValuation(Guid id)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        var asset = await _db.Assets
            .AsNoTracking()
            .Where(a => a.Id == id && a.UserId == userId) // Filter by user
            .FirstOrDefaultAsync();

        if (asset == null)
            return NotFound(new { error = "Asset not found" });

        var valuationData = new AssetValuationData(
            asset.Id,
            asset.Name,
            asset.AssetClass,
            asset.Ticker,
            asset.Quantity,
            asset.Unit,
            asset.CostBasisTotal,
            CurrentPrice: null,
            CurrentValue: null,
            UnrealizedGainLoss: null,
            ROIPercentage: null,
            ValuationStatus: "NOT_AVAILABLE"
        );

        return Ok(valuationData);
    }
}
