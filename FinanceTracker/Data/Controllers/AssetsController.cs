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

    public record CreateAssetRequest(
        string Name,
        string? AssetClass,
        string? Ticker
    );

    [HttpPost]
    public async Task<IActionResult> Create(CreateAssetRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Name is required.");

        var asset = new Account
        {
            Name = req.Name.Trim(),
            Type = "asset",
            IsLiability = false,
            AssetClass = string.IsNullOrWhiteSpace(req.AssetClass) ? null : req.AssetClass.Trim().ToLowerInvariant(),
            Ticker = string.IsNullOrWhiteSpace(req.Ticker) ? null : req.Ticker.Trim().ToUpperInvariant()
        };

        _db.Accounts.Add(asset);
        await _db.SaveChangesAsync();

        var response = new AssetResponse(
            asset.Id,
            asset.Name,
            asset.AssetClass,
            asset.Ticker
        );

        return Created($"/assets/{asset.Id}", response);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var assets = await _db.Accounts
            .AsNoTracking()
            .Where(a => a.Type == "asset" && !a.IsLiability)
            .OrderBy(a => a.Name)
            .Select(a => new AssetResponse(
                a.Id,
                a.Name,
                a.AssetClass,
                a.Ticker
            ))
            .ToListAsync();

        return Ok(assets);
    }
}
