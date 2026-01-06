using FinanceTracker.Api.Models;
using FinanceTracker.Auth;
using FinanceTracker.Contracts.Accounts;
using FinanceTracker.Contracts.Transactions;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

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

    // POST /accounts/{id}/transactions/import
    [HttpPost("{id:guid}/transactions/import")]
    public async Task<IActionResult> ImportTransactions(Guid id, ImportTransactionsRequest req)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // Verify account belongs to current user
        var accountExists = await _db.Accounts
            .AnyAsync(a => a.Id == id && a.UserId == userId);
        if (!accountExists)
            return NotFound(new { error = "Account not found" });

        var imported = 0;
        var skipped = 0;
        var failed = 0;
        var errors = new List<ImportTransactionError>();

        // Process each transaction
        for (var i = 0; i < req.Transactions.Count; i++)
        {
            var dto = req.Transactions[i];
            var rowNum = i + 1;

            try
            {
                // Validate date
                if (!DateOnly.TryParse(dto.Date, out var transactionDate))
                {
                    failed++;
                    errors.Add(new ImportTransactionError(rowNum, $"Invalid date format: {dto.Date}"));
                    continue;
                }

                // Validate amount
                if (dto.Amount == 0)
                {
                    failed++;
                    errors.Add(new ImportTransactionError(rowNum, "Amount cannot be 0"));
                    continue;
                }

                // Compute deduplication hash: accountId + date + amount + normalized description
                var descriptionForHash = NormalizeDescription(dto.Description ?? "");
                var hashInput = $"{id}|{transactionDate}|{dto.Amount}|{descriptionForHash}";
                var hash = ComputeSha256Hash(hashInput);

                // Check if transaction already exists (deduplication)
                var exists = await _db.Transactions
                    .AnyAsync(t => 
                        t.UserId == userId && 
                        t.Date == transactionDate && 
                        t.Amount == dto.Amount && 
                        (t.Description == null || t.Description.ToLower().Contains(descriptionForHash.ToLower())));

                if (exists)
                {
                    skipped++;
                    continue;
                }

                // Find or create category if categoryName provided
                int? categoryId = null;
                if (!string.IsNullOrWhiteSpace(dto.CategoryName))
                {
                    var categoryName = dto.CategoryName.Trim();
                    var category = await _db.Categories
                        .FirstOrDefaultAsync(c => c.UserId == userId && c.Name.ToLower() == categoryName.ToLower());

                    if (category == null)
                    {
                        // Create new category
                        category = new Category
                        {
                            UserId = userId,
                            Name = categoryName
                        };
                        _db.Categories.Add(category);
                        await _db.SaveChangesAsync();
                    }

                    categoryId = category.Id;
                }

                // If no category provided or found, use a default "Uncategorized" category
                if (categoryId == null)
                {
                    var uncategorized = await _db.Categories
                        .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Uncategorized");

                    if (uncategorized == null)
                    {
                        uncategorized = new Category
                        {
                            UserId = userId,
                            Name = "Uncategorized"
                        };
                        _db.Categories.Add(uncategorized);
                        await _db.SaveChangesAsync();
                    }

                    categoryId = uncategorized.Id;
                }

                // Create transaction
                var transaction = new Transaction
                {
                    UserId = userId,
                    Date = transactionDate,
                    Amount = dto.Amount,
                    CategoryId = categoryId.Value,
                    Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim()
                };

                _db.Transactions.Add(transaction);
                imported++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add(new ImportTransactionError(rowNum, ex.Message));
            }
        }

        // Bulk save all imported transactions
        await _db.SaveChangesAsync();

        var response = new ImportTransactionsResponse(
            Imported: imported,
            Skipped: skipped,
            Failed: failed,
            Errors: errors.Count > 0 ? errors : null
        );

        return Ok(response);
    }

    private string NormalizeDescription(string description)
    {
        // Normalize description for deduplication: lowercase, trim, remove extra spaces
        return string.Join(" ", description.ToLower().Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private string ComputeSha256Hash(string input)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hashBytes = sha256.ComputeHash(bytes);
        return Convert.ToHexString(hashBytes);
    }
}
