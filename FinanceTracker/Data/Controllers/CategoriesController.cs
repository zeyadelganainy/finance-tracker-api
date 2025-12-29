using FinanceTracker.Contracts.Categories;
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
    public async Task<ActionResult<List<CategoryResponse>>> GetAll()
    {
        var categories = await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse(c.Id, c.Name))
            .ToListAsync();

        return Ok(categories);
    }

    // POST /categories
    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create([FromBody] CreateCategoryRequest req)
    {
        // DataAnnotations handle Required and MaxLength validation
        // Keep business logic validation
        var name = req.Name.Trim();

        if (string.IsNullOrWhiteSpace(name)) 
            throw new ArgumentException("Name cannot be only whitespace.");

        // Prevent duplicates (business logic)
        var exists = await _db.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
        if (exists) throw new InvalidOperationException("Category already exists.");

        var category = new Category { Name = name };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        var response = new CategoryResponse(category.Id, category.Name);

        return Created($"/categories/{category.Id}", response);
    }
}
