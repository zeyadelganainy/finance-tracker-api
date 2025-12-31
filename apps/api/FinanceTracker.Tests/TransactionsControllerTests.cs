using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Contracts.Common;
using FinanceTracker.Contracts.Transactions;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class TransactionsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public TransactionsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetTransactions_WithNoParameters_ReturnsPagedResponse()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -100m, new DateOnly(2025, 1, 15), "Lunch");

        // Act
        var response = await _client.GetAsync("/transactions");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(1, result.Page);
        Assert.Equal(50, result.PageSize); // Default
        Assert.Equal(1, result.Total);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task GetTransactions_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        
        // Create 25 transactions
        for (int i = 1; i <= 25; i++)
        {
            await SeedTransaction(categoryId, -10m * i, new DateOnly(2025, 1, i), $"Transaction {i}");
        }

        // Act - Get page 2 with page size 10
        var response = await _client.GetAsync("/transactions?page=2&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(25, result.Total);
        Assert.Equal(10, result.Items.Count);
    }

    [Fact]
    public async Task GetTransactions_WithPageSizeOver200_CapsTo200()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -100m, new DateOnly(2025, 1, 1), "Test");

        // Act - Request page size of 500
        var response = await _client.GetAsync("/transactions?pageSize=500");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(200, result.PageSize); // Capped to 200
    }

    [Fact]
    public async Task GetTransactions_WithNegativePage_DefaultsToPage1()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -100m, new DateOnly(2025, 1, 1), "Test");

        // Act
        var response = await _client.GetAsync("/transactions?page=-1");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(1, result.Page);
    }

    [Fact]
    public async Task GetTransactions_SortByDateAscending_OrdersCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -30m, new DateOnly(2025, 1, 15), "Middle");
        await SeedTransaction(categoryId, -10m, new DateOnly(2025, 1, 5), "First");
        await SeedTransaction(categoryId, -20m, new DateOnly(2025, 1, 25), "Last");

        // Act
        var response = await _client.GetAsync("/transactions?sort=date");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(new DateOnly(2025, 1, 5), result.Items[0].Date);
        Assert.Equal(new DateOnly(2025, 1, 15), result.Items[1].Date);
        Assert.Equal(new DateOnly(2025, 1, 25), result.Items[2].Date);
    }

    [Fact]
    public async Task GetTransactions_SortByDateDescending_OrdersCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -30m, new DateOnly(2025, 1, 15), "Middle");
        await SeedTransaction(categoryId, -10m, new DateOnly(2025, 1, 5), "First");
        await SeedTransaction(categoryId, -20m, new DateOnly(2025, 1, 25), "Last");

        // Act
        var response = await _client.GetAsync("/transactions?sort=-date");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(new DateOnly(2025, 1, 25), result.Items[0].Date);
        Assert.Equal(new DateOnly(2025, 1, 15), result.Items[1].Date);
        Assert.Equal(new DateOnly(2025, 1, 5), result.Items[2].Date);
    }

    [Fact]
    public async Task GetTransactions_SortByAmountAscending_OrdersCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -50m, new DateOnly(2025, 1, 1), "Medium");
        await SeedTransaction(categoryId, -100m, new DateOnly(2025, 1, 2), "Large");
        await SeedTransaction(categoryId, -10m, new DateOnly(2025, 1, 3), "Small");

        // Act
        var response = await _client.GetAsync("/transactions?sort=amount");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(-100m, result.Items[0].Amount);
        Assert.Equal(-50m, result.Items[1].Amount);
        Assert.Equal(-10m, result.Items[2].Amount);
    }

    [Fact]
    public async Task GetTransactions_SortByAmountDescending_OrdersCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -50m, new DateOnly(2025, 1, 1), "Medium");
        await SeedTransaction(categoryId, -100m, new DateOnly(2025, 1, 2), "Large");
        await SeedTransaction(categoryId, -10m, new DateOnly(2025, 1, 3), "Small");

        // Act
        var response = await _client.GetAsync("/transactions?sort=-amount");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(-10m, result.Items[0].Amount);
        Assert.Equal(-50m, result.Items[1].Amount);
        Assert.Equal(-100m, result.Items[2].Amount);
    }

    [Fact]
    public async Task GetTransactions_WithInvalidSort_DefaultsToDateDescending()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -10m, new DateOnly(2025, 1, 5), "First");
        await SeedTransaction(categoryId, -20m, new DateOnly(2025, 1, 25), "Last");

        // Act
        var response = await _client.GetAsync("/transactions?sort=invalid");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Items.Count);
        // Default is -date (descending)
        Assert.Equal(new DateOnly(2025, 1, 25), result.Items[0].Date);
        Assert.Equal(new DateOnly(2025, 1, 5), result.Items[1].Date);
    }

    [Fact]
    public async Task GetTransactions_WithDateFilters_FiltersCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -10m, new DateOnly(2025, 1, 5), "Before");
        await SeedTransaction(categoryId, -20m, new DateOnly(2025, 1, 15), "In range");
        await SeedTransaction(categoryId, -30m, new DateOnly(2025, 1, 25), "In range");
        await SeedTransaction(categoryId, -40m, new DateOnly(2025, 2, 5), "After");

        // Act
        var response = await _client.GetAsync("/transactions?from=2025-01-10&to=2025-01-31");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Total);
        Assert.Equal(2, result.Items.Count);
    }

    [Fact]
    public async Task GetTransactions_WithEmptyResult_ReturnsEmptyPage()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/transactions");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(0, result.Total);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetTransactions_IncludesCategoryInformation()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Groceries");
        await SeedTransaction(categoryId, -100m, new DateOnly(2025, 1, 15), "Shopping");

        // Act
        var response = await _client.GetAsync("/transactions");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Single(result.Items);
        Assert.Equal("Groceries", result.Items[0].Category.Name);
        Assert.Equal(categoryId, result.Items[0].Category.Id);
    }

    [Fact]
    public async Task GetTransactions_WithMultiplePages_NavigatesCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        
        // Create 15 transactions
        for (int i = 1; i <= 15; i++)
        {
            await SeedTransaction(categoryId, -10m * i, new DateOnly(2025, 1, i), $"Transaction {i}");
        }

        // Act - Get first page
        var response1 = await _client.GetAsync("/transactions?pageSize=5&page=1");
        var result1 = await response1.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();

        // Act - Get second page
        var response2 = await _client.GetAsync("/transactions?pageSize=5&page=2");
        var result2 = await response2.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();

        // Act - Get third page
        var response3 = await _client.GetAsync("/transactions?pageSize=5&page=3");
        var result3 = await response3.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.NotNull(result3);
        
        Assert.Equal(15, result1.Total);
        Assert.Equal(15, result2.Total);
        Assert.Equal(15, result3.Total);
        
        Assert.Equal(5, result1.Items.Count);
        Assert.Equal(5, result2.Items.Count);
        Assert.Equal(5, result3.Items.Count);

        // Verify no duplicate transactions across pages
        var allIds = result1.Items.Select(t => t.Id)
            .Concat(result2.Items.Select(t => t.Id))
            .Concat(result3.Items.Select(t => t.Id))
            .ToList();
        
        Assert.Equal(15, allIds.Distinct().Count());
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Transactions.RemoveRange(db.Transactions);
        db.Categories.RemoveRange(db.Categories);
        await db.SaveChangesAsync();
    }

    private async Task<int> SeedCategory(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var category = new Category { UserId = Guid.Parse(CustomWebApplicationFactory.TestUserId), Name = name };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category.Id;
    }

    private async Task SeedTransaction(int categoryId, decimal amount, DateOnly date, string? description)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Transactions.Add(new Transaction
        {
            UserId = Guid.Parse(CustomWebApplicationFactory.TestUserId),
            Amount = amount,
            Date = date,
            CategoryId = categoryId,
            Description = description
        });
        await db.SaveChangesAsync();
    }
}

