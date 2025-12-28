using FinanceTracker.Api.Models;
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

    public record CreateAccountRequest(string Name, string? Type, bool IsLiability);

    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name is required.");

        var account = new Account
        {
            Name = req.Name.Trim(),
            Type = string.IsNullOrWhiteSpace(req.Type) ? null : req.Type.Trim(),
            IsLiability = req.IsLiability
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        return Created($"/accounts/{account.Id}", account);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var accounts = await _db.Accounts
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Type,
                a.IsLiability
            })
            .ToListAsync();

        return Ok(accounts);
    }
}
