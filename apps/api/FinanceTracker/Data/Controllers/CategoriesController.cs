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

    // GET /categories
    [HttpGet]
    public async Task<ActionResult<List<CategoryResponse>>> GetAll()
    {
        var userId = Guid.Parse(_currentUser.UserId);

        var categories = await _db.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId) // Filter by user
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse(c.Id, c.Name))
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
            Name = name 
        };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        var response = new CategoryResponse(category.Id, category.Name);

        return Created($"/categories/{category.Id}", response);
    }
}
