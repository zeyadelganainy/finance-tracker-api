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
        if (req.Amount == 0) return BadRequest("Amount cannot be 0.");

        var categoryExists = await _db.Categories.AnyAsync(c => c.Id == req.CategoryId);
        if (!categoryExists) return BadRequest("CategoryId is invalid.");

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

    // GET /transactions?from=YYYY-MM-DD&to=YYYY-MM-DD
    [HttpGet]
    public async Task<ActionResult<List<TransactionResponse>>> Get([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var q = _db.Transactions.AsNoTracking().AsQueryable();

        if (from is not null) q = q.Where(t => t.Date >= from.Value);
        if (to is not null) q = q.Where(t => t.Date <= to.Value);

        var rows = await q
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.Id)
            .Select(t => new TransactionResponse(
                t.Id,
                t.Amount,
                t.Date,
                t.Description,
                new TransactionCategoryDto(t.Category!.Id, t.Category!.Name)
            ))
            .ToListAsync();

        return Ok(rows);
    }
}
