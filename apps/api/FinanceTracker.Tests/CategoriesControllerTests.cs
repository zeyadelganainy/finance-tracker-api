using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Contracts.Categories;
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
        var categories = await response.Content.ReadFromJsonAsync<List<CategoryResponse>>();
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
        var categories = await response.Content.ReadFromJsonAsync<List<CategoryResponse>>();
        Assert.NotNull(categories);
        Assert.Equal(3, categories.Count);
        Assert.Equal("Food", categories[0].Name);
        Assert.Equal("Transport", categories[1].Name);
        Assert.Equal("Utilities", categories[2].Name);
    }

    [Fact]
    public async Task CreateCategory_WithValidName_ReturnsCreated()
    {
        await ClearDatabase();
        var request = new CreateCategoryRequest("Groceries", null);

        var response = await _client.PostAsJsonAsync("/categories", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var category = await response.Content.ReadFromJsonAsync<CategoryResponse>();
        Assert.NotNull(category);
        Assert.Equal("Groceries", category!.Name);
        Assert.True(category.Id > 0);
        Assert.Equal($"/categories/{category.Id}", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task CreateCategory_WithEmptyName_ReturnsBadRequest()
    {
        var request = new CreateCategoryRequest("", null);

        var response = await _client.PostAsJsonAsync("/categories", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Name field is required", error);
    }

    [Fact]
    public async Task CreateCategory_WithTooLongName_ReturnsBadRequest()
    {
        var request = new CreateCategoryRequest(new string('a', 51), null);

        var response = await _client.PostAsJsonAsync("/categories", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Name", error);
        Assert.Contains("50", error);
    }

    [Fact]
    public async Task CreateCategory_WithDuplicateName_ReturnsConflict()
    {
        await ClearDatabase();
        await SeedCategories("Food");
        var request = new CreateCategoryRequest("FOOD", null);

        var response = await _client.PostAsJsonAsync("/categories", request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("already exists", error);
    }

    [Fact]
    public async Task CreateCategory_TrimsWhitespace()
    {
        await ClearDatabase();
        var request = new CreateCategoryRequest("  Entertainment  ", null);

        var response = await _client.PostAsJsonAsync("/categories", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var category = await response.Content.ReadFromJsonAsync<CategoryResponse>();
        Assert.NotNull(category);
        Assert.Equal("Entertainment", category!.Name);
        Assert.Null(category.Type);
    }

    [Fact]
    public async Task CreateCategory_WithType_SetsType()
    {
        await ClearDatabase();

        var response = await _client.PostAsJsonAsync("/categories", new CreateCategoryRequest("Health", "income"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var category = await response.Content.ReadFromJsonAsync<CategoryResponse>();
        Assert.NotNull(category);
        Assert.Equal("income", category!.Type);
    }

    [Fact]
    public async Task CreateCategory_WithInvalidType_ReturnsBadRequest()
    {
        await ClearDatabase();

        var response = await _client.PostAsJsonAsync("/categories", new CreateCategoryRequest("Health", "other"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateCategory_ChangesNameAndType()
    {
        await ClearDatabase();
        var categoryId = await SeedCategory("Old", null);

        var response = await _client.PutAsJsonAsync($"/categories/{categoryId}", new UpdateCategoryRequest(categoryId, "New", "expense"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<CategoryResponse>();
        Assert.NotNull(updated);
        Assert.Equal("New", updated!.Name);
        Assert.Equal("expense", updated.Type);
    }

    [Fact]
    public async Task DeleteCategory_InUse_ReturnsConflict()
    {
        await ClearDatabase();
        var categoryId = await SeedCategory("Food", null);
        await SeedTransaction(categoryId, -10m);

        var response = await _client.DeleteAsync($"/categories/{categoryId}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
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
        foreach (var name in names)
        {
            await SeedCategory(name, null);
        }
    }

    private async Task<int> SeedCategory(string name, string? type)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var category = new Category { UserId = Guid.Parse(CustomWebApplicationFactory.TestUserId), Name = name, Type = type };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category.Id;
    }

    private async Task SeedTransaction(int categoryId, decimal amount)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Transactions.Add(new Transaction
        {
            UserId = Guid.Parse(CustomWebApplicationFactory.TestUserId),
            CategoryId = categoryId,
            Amount = amount,
            Date = DateOnly.FromDateTime(DateTime.UtcNow.Date)
        });
        await db.SaveChangesAsync();
    }

}

