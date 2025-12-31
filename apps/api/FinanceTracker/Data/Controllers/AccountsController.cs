using FinanceTracker.Api.Models;
using FinanceTracker.Contracts.Accounts;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

[ApiController]
[Route("accounts")]
public class AccountsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AccountsController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest req)
    {
        // DataAnnotations handle Required and MaxLength validation
        // Keep whitespace check as business logic
        if (string.IsNullOrWhiteSpace(req.Name))
            throw new ArgumentException("Name cannot be only whitespace.");

        var account = new Account
        {
            Name = req.Name.Trim(),
            Institution = string.IsNullOrWhiteSpace(req.Institution) ? null : req.Institution.Trim(),
            Type = string.IsNullOrWhiteSpace(req.Type) ? null : req.Type.Trim(),
            Currency = req.Currency,
            IsLiability = req.IsLiability
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        var response = new AccountResponse(
            account.Id,
            account.Name,
            account.Institution,
            account.Type,
            account.Currency,
            account.IsLiability,
            account.CreatedAt,
            account.UpdatedAt
        );

        return Created($"/accounts/{account.Id}", response);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var accounts = await _db.Accounts
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .Select(a => new AccountResponse(
                a.Id,
                a.Name,
                a.Institution,
                a.Type,
                a.Currency,
                a.IsLiability,
                a.CreatedAt,
                a.UpdatedAt
            ))
            .ToListAsync();

        return Ok(accounts);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var account = await _db.Accounts
            .AsNoTracking()
            .Include(a => a.Snapshots)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (account == null)
            return NotFound(new { error = "Account not found" });

        var latestSnapshot = account.Snapshots
            .OrderByDescending(s => s.Date)
            .FirstOrDefault();

        var response = new AccountDetailResponse(
            account.Id,
            account.Name,
            account.Institution,
            account.Type,
            account.Currency,
            account.IsLiability,
            account.CreatedAt,
            account.UpdatedAt,
            latestSnapshot?.Balance,
            latestSnapshot?.Date,
            account.Snapshots.Count
        );

        return Ok(response);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAccountRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            throw new ArgumentException("Name cannot be only whitespace.");

        var account = await _db.Accounts.FindAsync(id);
        if (account == null)
            return NotFound(new { error = "Account not found" });

        account.Name = req.Name.Trim();
        account.Institution = string.IsNullOrWhiteSpace(req.Institution) ? null : req.Institution.Trim();
        account.Type = string.IsNullOrWhiteSpace(req.Type) ? null : req.Type.Trim();
        account.Currency = req.Currency;
        account.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var response = new AccountResponse(
            account.Id,
            account.Name,
            account.Institution,
            account.Type,
            account.Currency,
            account.IsLiability,
            account.CreatedAt,
            account.UpdatedAt
        );

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var account = await _db.Accounts
            .Include(a => a.Snapshots)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (account == null)
            return NotFound(new { error = "Account not found" });

        // Cascading delete will automatically remove snapshots (configured in AppDbContext)
        _db.Accounts.Remove(account);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
