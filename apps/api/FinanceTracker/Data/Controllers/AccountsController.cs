using FinanceTracker.Api.Models;
using FinanceTracker.Auth;
using FinanceTracker.Contracts.Accounts;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

[ApiController]
[Route("accounts")]
[Authorize] // Require authentication for all account endpoints
public class AccountsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public AccountsController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest req)
    {
        // DataAnnotations handle Required and MaxLength validation
        // Keep whitespace check as business logic
        if (string.IsNullOrWhiteSpace(req.Name))
            throw new ArgumentException("Name cannot be only whitespace.");

        // Parse UserId from JWT - this ensures we never accept user_id from client
        var userId = Guid.Parse(_currentUser.UserId);

        var account = new Account
        {
            UserId = userId, // Set from authenticated user context
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
        var userId = Guid.Parse(_currentUser.UserId);

        // Only return accounts belonging to the current user
        var accounts = await _db.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
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
        var userId = Guid.Parse(_currentUser.UserId);

        // Filter by both ID and UserId to prevent accessing other users' data
        var account = await _db.Accounts
            .AsNoTracking()
            .Include(a => a.Snapshots)
            .Where(a => a.Id == id && a.UserId == userId)
            .FirstOrDefaultAsync();

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

        var userId = Guid.Parse(_currentUser.UserId);

        // Filter by both ID and UserId
        var account = await _db.Accounts
            .Where(a => a.Id == id && a.UserId == userId)
            .FirstOrDefaultAsync();

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
        var userId = Guid.Parse(_currentUser.UserId);

        // Filter by both ID and UserId
        var account = await _db.Accounts
            .Include(a => a.Snapshots)
            .Where(a => a.Id == id && a.UserId == userId)
            .FirstOrDefaultAsync();

        if (account == null)
            return NotFound(new { error = "Account not found" });

        // Cascading delete will automatically remove snapshots (configured in AppDbContext)
        _db.Accounts.Remove(account);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
