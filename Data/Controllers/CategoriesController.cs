using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Controllers;

[ApiController]
[Route("categories")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CategoriesController(AppDbContext db)
    {
        _db = db;
    }

    // GET /categories
    [HttpGet]
    public async Task<ActionResult<List<Category>>> GetAll()
    {
        var categories = await _db.Categories
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(categories);
    }

    public record CreateCategoryRequest(string Name);

    // POST /categories
    [HttpPost]
    public async Task<ActionResult<Category>> Create([FromBody] CreateCategoryRequest req)
    {
        var name = (req.Name ?? "").Trim();

        if (name.Length == 0) return BadRequest("Name is required.");
        if (name.Length > 50) return BadRequest("Name must be 50 characters or less.");

        // Prevent duplicates (simple version)
        var exists = await _db.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
        if (exists) return Conflict("Category already exists.");

        var category = new Category { Name = name };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return Created($"/categories/{category.Id}", category);
    }
}
