using FinanceTracker.Api.Models;
using FinanceTracker.Contracts.Accounts;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

[ApiController]
[Route("assets")]
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AssetsController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create(CreateAssetRequest req)
    {
        // DataAnnotations handle Required, MaxLength, and Range validation
        if (string.IsNullOrWhiteSpace(req.Name))
            throw new ArgumentException("Name cannot be only whitespace.");

        // Validate business rules based on asset class
        var assetClass = req.AssetClass.Trim().ToLowerInvariant();
        
        if (assetClass == "stock" && string.IsNullOrWhiteSpace(req.Ticker))
            throw new ArgumentException("Ticker is required for stocks.");

        if (assetClass == "metal" && string.IsNullOrWhiteSpace(req.Unit))
            throw new ArgumentException("Unit is required for metals (e.g., oz, g, kg).");

        var asset = new Asset
        {
            Name = req.Name.Trim(),
            AssetClass = assetClass,
            Ticker = string.IsNullOrWhiteSpace(req.Ticker) ? null : req.Ticker.Trim().ToUpperInvariant(),
            Quantity = req.Quantity,
            Unit = string.IsNullOrWhiteSpace(req.Unit) ? null : req.Unit.Trim().ToLowerInvariant(),
            CostBasisTotal = req.CostBasisTotal,
            PurchaseDate = req.PurchaseDate,
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim()
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        var response = new AssetResponse(
            asset.Id,
            asset.Name,
            asset.AssetClass,
            asset.Ticker,
            asset.Quantity,
            asset.Unit,
            asset.CostBasisTotal,
            asset.PurchaseDate,
            asset.Notes,
            asset.CreatedAt,
            asset.UpdatedAt
        );

        return Created($"/assets/{asset.Id}", response);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var assets = await _db.Assets
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .Select(a => new AssetResponse(
                a.Id,
                a.Name,
                a.AssetClass,
                a.Ticker,
                a.Quantity,
                a.Unit,
                a.CostBasisTotal,
                a.PurchaseDate,
                a.Notes,
                a.CreatedAt,
                a.UpdatedAt
            ))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var asset = await _db.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset == null)
            return NotFound(new { error = "Asset not found" });

        var response = new AssetResponse(
            asset.Id,
            asset.Name,
            asset.AssetClass,
            asset.Ticker,
            asset.Quantity,
            asset.Unit,
            asset.CostBasisTotal,
            asset.PurchaseDate,
            asset.Notes,
            asset.CreatedAt,
            asset.UpdatedAt
        );

        return Ok(response);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAssetRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            throw new ArgumentException("Name cannot be only whitespace.");

        var asset = await _db.Assets.FindAsync(id);
        if (asset == null)
            return NotFound(new { error = "Asset not found" });

        // Validate business rules
        var assetClass = req.AssetClass.Trim().ToLowerInvariant();
        
        if (assetClass == "stock" && string.IsNullOrWhiteSpace(req.Ticker))
            throw new ArgumentException("Ticker is required for stocks.");

        if (assetClass == "metal" && string.IsNullOrWhiteSpace(req.Unit))
            throw new ArgumentException("Unit is required for metals (e.g., oz, g, kg).");

        asset.Name = req.Name.Trim();
        asset.AssetClass = assetClass;
        asset.Ticker = string.IsNullOrWhiteSpace(req.Ticker) ? null : req.Ticker.Trim().ToUpperInvariant();
        asset.Quantity = req.Quantity;
        asset.Unit = string.IsNullOrWhiteSpace(req.Unit) ? null : req.Unit.Trim().ToLowerInvariant();
        asset.CostBasisTotal = req.CostBasisTotal;
        asset.PurchaseDate = req.PurchaseDate;
        asset.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        asset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var response = new AssetResponse(
            asset.Id,
            asset.Name,
            asset.AssetClass,
            asset.Ticker,
            asset.Quantity,
            asset.Unit,
            asset.CostBasisTotal,
            asset.PurchaseDate,
            asset.Notes,
            asset.CreatedAt,
            asset.UpdatedAt
        );

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null)
            return NotFound(new { error = "Asset not found" });

        _db.Assets.Remove(asset);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
