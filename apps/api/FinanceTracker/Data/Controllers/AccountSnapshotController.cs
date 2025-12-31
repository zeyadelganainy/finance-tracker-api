using FinanceTracker.Api.Models;
using FinanceTracker.Auth;
using FinanceTracker.Contracts.Accounts;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

[ApiController]
[Route("accounts/{accountId:guid}/snapshots")]
[Authorize]
public class AccountSnapshotController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public AccountSnapshotController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    // PUT /accounts/{accountId}/snapshots/{date}
    [HttpPut("{date}")]
    public async Task<IActionResult> Upsert(Guid accountId, string date, UpsertSnapshotRequest req)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        if (!DateOnly.TryParse(date, out var d))
            throw new ArgumentException("Invalid date. Use YYYY-MM-DD.");

        // Verify account exists and belongs to user
        var accountExists = await _db.Accounts
            .AnyAsync(a => a.Id == accountId && a.UserId == userId);
        if (!accountExists) 
            throw new KeyNotFoundException("Account not found.");

        var snapshot = await _db.AccountSnapshots
            .Where(s => s.AccountId == accountId && s.Date == d && s.UserId == userId) // Filter by user
            .SingleOrDefaultAsync();

        if (snapshot is null)
        {
            snapshot = new AccountSnapshot
            {
                UserId = userId,
                AccountId = accountId,
                Date = d,
                Balance = req.Balance
            };
            _db.AccountSnapshots.Add(snapshot);
        }
        else
        {
            snapshot.Balance = req.Balance;
        }

        await _db.SaveChangesAsync();
        
        var response = new SnapshotResponse(
            snapshot.Id,
            snapshot.AccountId,
            snapshot.Date.ToString("yyyy-MM-dd"),
            snapshot.Balance
        );
        
        return Ok(response);
    }
}
