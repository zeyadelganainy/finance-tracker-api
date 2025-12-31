using FinanceTracker.Auth;
using FinanceTracker.Contracts.Common;
using FinanceTracker.Contracts.Transactions;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Controllers;

[ApiController]
[Route("transactions")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public TransactionsController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    // POST /transactions
    [HttpPost]
    public async Task<ActionResult<TransactionResponse>> Create(CreateTransactionRequest req)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // DataAnnotations handle Required and Range validation
        // Keep business logic validation
        if (req.Amount == 0)
            throw new ArgumentException("Amount cannot be 0.");

        // Verify category belongs to current user
        var categoryExists = await _db.Categories
            .AnyAsync(c => c.Id == req.CategoryId && c.UserId == userId);
        if (!categoryExists) 
            throw new ArgumentException("CategoryId is invalid or does not belong to you.");

        var tx = new Transaction
        {
            UserId = userId,
            Amount = req.Amount,
            Date = req.Date,
            CategoryId = req.CategoryId,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim()
        };

        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync();

        // Load the category for the response
        var category = await _db.Categories.AsNoTracking()
            .Where(c => c.Id == tx.CategoryId)
            .Select(c => new TransactionCategoryDto(c.Id, c.Name))
            .SingleAsync();

        var response = new TransactionResponse(
            tx.Id,
            tx.Amount,
            tx.Date,
            tx.Description,
            category
        );

        return Created($"/transactions/{tx.Id}", response);
    }

    // GET /transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=50&sort=-date
    [HttpGet]
    public async Task<ActionResult<PagedResponse<TransactionResponse>>> Get(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] PagingQuery paging)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // Cap page size to 200
        var pageSize = Math.Min(paging.PageSize, 200);
        var page = Math.Max(paging.Page, 1);

        var q = _db.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId); // Filter by user

        // Apply date filters
        if (from is not null) q = q.Where(t => t.Date >= from.Value);
        if (to is not null) q = q.Where(t => t.Date <= to.Value);

        // Get total count before pagination
        var total = await q.CountAsync();

        // Apply sorting
        q = ApplySorting(q, paging.Sort);

        // Apply pagination
        var rows = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TransactionResponse(
                t.Id,
                t.Amount,
                t.Date,
                t.Description,
                new TransactionCategoryDto(t.Category!.Id, t.Category!.Name)
            ))
            .ToListAsync();

        var response = new PagedResponse<TransactionResponse>(
            rows,
            page,
            pageSize,
            total
        );

        return Ok(response);
    }

    private static IQueryable<Transaction> ApplySorting(IQueryable<Transaction> query, string sort)
    {
        return sort?.ToLowerInvariant() switch
        {
            "date" => query.OrderBy(t => t.Date).ThenBy(t => t.Id),
            "-date" => query.OrderByDescending(t => t.Date).ThenByDescending(t => t.Id),
            "amount" => query.OrderBy(t => t.Amount).ThenBy(t => t.Id),
            "-amount" => query.OrderByDescending(t => t.Amount).ThenByDescending(t => t.Id),
            _ => query.OrderByDescending(t => t.Date).ThenByDescending(t => t.Id) // Default: -date
        };
    }
}
