using FinanceTracker.Auth;
using FinanceTracker.Contracts.Categories;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Controllers;

[ApiController]
[Route("categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public CategoriesController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    private static string? NormalizeType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type)) return null;
        var value = type.Trim().ToLowerInvariant();
        if (value != "expense" && value != "income")
            throw new ArgumentException("Type must be 'expense' or 'income'.");
        return value;
    }

    // GET /categories
    [HttpGet]
    public async Task<ActionResult<List<CategoryResponse>>> GetAll()
    {
        var userId = Guid.Parse(_currentUser.UserId);

        var categories = await _db.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId) // Filter by user
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse(c.Id, c.Name, c.Type))
            .ToListAsync();

        return Ok(categories);
    }

    // POST /categories
    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create([FromBody] CreateCategoryRequest req)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // DataAnnotations handle Required and MaxLength validation
        // Keep business logic validation
        var name = req.Name.Trim();
        var normalizedType = NormalizeType(req.Type);

        if (string.IsNullOrWhiteSpace(name)) 
            throw new ArgumentException("Name cannot be only whitespace.");

        // Prevent duplicates per user (business logic)
        var exists = await _db.Categories
            .AnyAsync(c => c.UserId == userId && c.Name.ToLower() == name.ToLower());
        if (exists) 
            throw new InvalidOperationException("Category already exists.");

        var category = new Category 
        { 
            UserId = userId,
            Name = name,
            Type = normalizedType
        };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        var response = new CategoryResponse(category.Id, category.Name, category.Type);

        return Created($"/categories/{category.Id}", response);
    }

    // PUT /categories/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryResponse>> Update(int id, [FromBody] UpdateCategoryRequest req)
    {
        if (id != req.Id) return BadRequest("Route id and body id must match.");

        var userId = Guid.Parse(_currentUser.UserId);
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (category == null) return NotFound();

        var name = req.Name.Trim();
        var normalizedType = NormalizeType(req.Type);
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be only whitespace.");

        var duplicate = await _db.Categories
            .AnyAsync(c => c.UserId == userId && c.Id != id && c.Name.ToLower() == name.ToLower());
        if (duplicate)
            throw new InvalidOperationException("Category already exists.");

        category.Name = name;
        category.Type = normalizedType;
        await _db.SaveChangesAsync();

        return Ok(new CategoryResponse(category.Id, category.Name, category.Type));
    }

    // DELETE /categories/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = Guid.Parse(_currentUser.UserId);
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (category == null) return NotFound();

        var inUse = await _db.Transactions.AnyAsync(t => t.CategoryId == id && t.UserId == userId);
        if (inUse)
            return Conflict("Category is in use by existing transactions.");

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
