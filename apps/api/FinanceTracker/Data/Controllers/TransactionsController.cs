using FinanceTracker.Contracts.Common;
using FinanceTracker.Contracts.Transactions;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Controllers;

[ApiController]
[Route("transactions")]
public class TransactionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TransactionsController(AppDbContext db) => _db = db;

    // POST /transactions
    [HttpPost]
    public async Task<ActionResult<TransactionResponse>> Create(CreateTransactionRequest req)
    {
        // DataAnnotations handle Required and Range validation
        // Keep business logic validation
        if (req.Amount == 0)
            throw new ArgumentException("Amount cannot be 0.");

        var categoryExists = await _db.Categories.AnyAsync(c => c.Id == req.CategoryId);
        if (!categoryExists) throw new ArgumentException("CategoryId is invalid.");

        var tx = new Transaction
        {
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
        // Cap page size to 200
        var pageSize = Math.Min(paging.PageSize, 200);
        var page = Math.Max(paging.Page, 1);

        var q = _db.Transactions.AsNoTracking().AsQueryable();

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
