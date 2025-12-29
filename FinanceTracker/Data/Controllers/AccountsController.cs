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
            Type = string.IsNullOrWhiteSpace(req.Type) ? null : req.Type.Trim(),
            IsLiability = req.IsLiability
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        var response = new AccountResponse(
            account.Id,
            account.Name,
            account.Type,
            account.IsLiability
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
                a.Type,
                a.IsLiability
            ))
            .ToListAsync();

        return Ok(accounts);
    }
}
