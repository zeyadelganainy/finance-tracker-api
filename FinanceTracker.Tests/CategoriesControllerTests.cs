using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Controllers;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class CategoriesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public CategoriesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetCategories_ReturnsEmptyList_WhenNoCategoriesExist()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/categories");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var categories = await response.Content.ReadFromJsonAsync<List<Category>>();
        Assert.NotNull(categories);
        Assert.Empty(categories);
    }

    [Fact]
    public async Task GetCategories_ReturnsCategories_OrderedByName()
    {
        // Arrange
        await ClearDatabase();
        await SeedCategories("Utilities", "Food", "Transport");

        // Act
        var response = await _client.GetAsync("/categories");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var categories = await response.Content.ReadFromJsonAsync<List<Category>>();
        Assert.NotNull(categories);
        Assert.Equal(3, categories.Count);
        Assert.Equal("Food", categories[0].Name);
        Assert.Equal("Transport", categories[1].Name);
        Assert.Equal("Utilities", categories[2].Name);
    }

    [Fact]
    public async Task CreateCategory_WithValidName_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new CategoriesController.CreateCategoryRequest("Groceries");

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var category = await response.Content.ReadFromJsonAsync<Category>();
        Assert.NotNull(category);
        Assert.Equal("Groceries", category.Name);
        Assert.True(category.Id > 0);
        Assert.Equal($"/categories/{category.Id}", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task CreateCategory_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var request = new CategoriesController.CreateCategoryRequest("");

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Name is required", error);
    }

    [Fact]
    public async Task CreateCategory_WithTooLongName_ReturnsBadRequest()
    {
        // Arrange
        var request = new CategoriesController.CreateCategoryRequest(new string('a', 51));

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("50 characters or less", error);
    }

    [Fact]
    public async Task CreateCategory_WithDuplicateName_ReturnsConflict()
    {
        // Arrange
        await ClearDatabase();
        await SeedCategories("Food");
        var request = new CategoriesController.CreateCategoryRequest("FOOD");

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("already exists", error);
    }

    [Fact]
    public async Task CreateCategory_TrimsWhitespace()
    {
        // Arrange
        await ClearDatabase();
        var request = new CategoriesController.CreateCategoryRequest("  Entertainment  ");

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var category = await response.Content.ReadFromJsonAsync<Category>();
        Assert.NotNull(category);
        Assert.Equal("Entertainment", category.Name);
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Transactions.RemoveRange(db.Transactions);
        db.Categories.RemoveRange(db.Categories);
        await db.SaveChangesAsync();
    }

    private async Task SeedCategories(params string[] names)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var name in names)
        {
            db.Categories.Add(new Category { Name = name });
        }
        await db.SaveChangesAsync();
    }
}