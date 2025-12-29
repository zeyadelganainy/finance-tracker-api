using FinanceTracker.Api.Models;
using FinanceTracker.Contracts.Accounts;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

[ApiController]
[Route("accounts/{accountId:guid}/snapshots")]
public class AccountSnapshotController : ControllerBase
{
    private readonly AppDbContext _db;

    public AccountSnapshotController(AppDbContext db) => _db = db;

    // PUT /accounts/{accountId}/snapshots/{date}
    [HttpPut("{date}")]
    public async Task<IActionResult> Upsert(Guid accountId, string date, UpsertSnapshotRequest req)
    {
        if (!DateOnly.TryParse(date, out var d))
            return BadRequest("Invalid date. Use YYYY-MM-DD.");

        var accountExists = await _db.Accounts.AnyAsync(a => a.Id == accountId);
        if (!accountExists) return NotFound("Account not found.");

        var snapshot = await _db.AccountSnapshots
            .SingleOrDefaultAsync(s => s.AccountId == accountId && s.Date == d);

        if (snapshot is null)
        {
            snapshot = new AccountSnapshot
            {
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
