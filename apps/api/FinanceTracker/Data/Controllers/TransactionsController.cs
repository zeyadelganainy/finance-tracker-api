using FinanceTracker.Auth;
using FinanceTracker.Contracts.Common;
using FinanceTracker.Contracts.Transactions;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace FinanceTracker.Controllers;

[ApiController]
[Route("transactions")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<TransactionsController> _logger;
    private readonly bool _enableDiagnostics;

    public TransactionsController(AppDbContext db, ICurrentUserContext currentUser, IHostEnvironment environment, ILogger<TransactionsController> logger)
    {
        _db = db;
        _currentUser = currentUser;
        _environment = environment;
        _logger = logger;
        _enableDiagnostics = environment.IsDevelopment();
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

    // GET /transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=50
    [HttpGet]
    public async Task<ActionResult<PagedResponse<TransactionResponse>>> Get(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] PagingQuery paging)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        var page = paging.Page < 1 ? 1 : paging.Page;
        var pageSize = Math.Clamp(paging.PageSize, 1, 200);

        var query = _db.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (from is not null)
        {
            query = query.Where(t => t.Date >= from.Value);
        }

        if (to is not null)
        {
            query = query.Where(t => t.Date <= to.Value);
        }

        var total = await query.CountAsync();

        var rows = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.Id)
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

        if (_enableDiagnostics)
        {
            var first = rows.FirstOrDefault();
            var last = rows.LastOrDefault();
            _logger.LogInformation(
                "Transactions page diagnostics: count={Count}, firstId={FirstId}, firstDate={FirstDate}, lastId={LastId}, lastDate={LastDate}",
                rows.Count,
                first?.Id,
                first?.Date,
                last?.Id,
                last?.Date);
        }

        var response = new PagedResponse<TransactionResponse>(
            rows,
            page,
            pageSize,
            total
        );

        return Ok(response);
    }

    // GET /transactions/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<TransactionResponse>> GetById(int id)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        var transaction = await _db.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.Id == id && t.UserId == userId)
            .Select(t => new TransactionResponse(
                t.Id,
                t.Amount,
                t.Date,
                t.Description,
                new TransactionCategoryDto(t.Category!.Id, t.Category!.Name)
            ))
            .SingleOrDefaultAsync();

        if (transaction == null)
            return NotFound();

        return Ok(transaction);
    }

    // PUT /transactions/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<TransactionResponse>> Update(int id, UpdateTransactionRequest req)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // Find transaction and verify ownership
        var transaction = await _db.Transactions
            .Where(t => t.Id == id && t.UserId == userId)
            .SingleOrDefaultAsync();

        if (transaction == null)
            return NotFound();

        // Validate amount
        if (req.Amount == 0)
            throw new ArgumentException("Amount cannot be 0.");

        // Verify category belongs to current user
        var categoryExists = await _db.Categories
            .AnyAsync(c => c.Id == req.CategoryId && c.UserId == userId);
        if (!categoryExists)
            throw new ArgumentException("CategoryId is invalid or does not belong to you.");

        // Update fields
        transaction.Amount = req.Amount;
        transaction.Date = req.Date;
        transaction.CategoryId = req.CategoryId;
        transaction.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();

        await _db.SaveChangesAsync();

        // Load the category for the response
        var category = await _db.Categories.AsNoTracking()
            .Where(c => c.Id == transaction.CategoryId)
            .Select(c => new TransactionCategoryDto(c.Id, c.Name))
            .SingleAsync();

        var response = new TransactionResponse(
            transaction.Id,
            transaction.Amount,
            transaction.Date,
            transaction.Description,
            category
        );

        return Ok(response);
    }

    // DELETE /transactions/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // Find transaction and verify ownership
        var transaction = await _db.Transactions
            .Where(t => t.Id == id && t.UserId == userId)
            .SingleOrDefaultAsync();

        if (transaction == null)
            return NotFound();

        _db.Transactions.Remove(transaction);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
