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
    public async Task GetTransactions_DeterministicOrderingByDateAndId()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        var date = new DateOnly(2025, 1, 15);
        var firstId = await SeedTransactionAndReturnId(categoryId, -10m, date, "First");
        var secondId = await SeedTransactionAndReturnId(categoryId, -20m, date, "Second");
        var thirdId = await SeedTransactionAndReturnId(categoryId, -30m, date, "Third");

        // Act
        var response = await _client.GetAsync("/transactions?page=1&pageSize=2");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(thirdId, result.Items[0].Id); // Most recent id first
        Assert.Equal(secondId, result.Items[1].Id);
    }

    [Fact]
    public async Task GetTransactions_ReturnsMostRecentTransactionImmediately()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -100m, new DateOnly(2025, 1, 1), "Existing");

        var createRequest = new
        {
            Amount = -25m,
            Date = new DateOnly(2025, 2, 1),
            CategoryId = categoryId,
            Description = "Newest transaction"
        };

        var createResponse = await _client.PostAsJsonAsync("/transactions", createRequest);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        // Act
        var response = await _client.GetAsync("/transactions?page=1&pageSize=5");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.True(result.Items.Any(t => t.Description == "Newest transaction"));
        Assert.Equal("Newest transaction", result.Items.First().Description);
    }

    [Fact]
    public async Task GetTransactions_WithDateFilters_FiltersCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        await SeedTransaction(categoryId, -10m, new DateOnly(2025, 1, 5), "Before");
        await SeedTransaction(categoryId, -20m, new DateOnly(2025, 1, 15), "In range");
        await SeedTransaction(categoryId, -30m, new DateOnly(2025, 1, 25), "In range later");
        await SeedTransaction(categoryId, -40m, new DateOnly(2025, 2, 5), "After");

        // Act
        var response = await _client.GetAsync("/transactions?from=2025-01-10&to=2025-01-31");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResponse<TransactionResponse>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Total);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(new DateOnly(2025, 1, 25), result.Items[0].Date);
        Assert.Equal(new DateOnly(2025, 1, 15), result.Items[1].Date);
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

    [Fact]
    public async Task GetById_WithValidId_ReturnsTransaction()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        var transactionId = await SeedTransactionAndReturnId(categoryId, -100m, new DateOnly(2025, 1, 15), "Lunch");

        // Act
        var response = await _client.GetAsync($"/transactions/{transactionId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransactionResponse>();
        Assert.NotNull(result);
        Assert.Equal(transactionId, result.Id);
        Assert.Equal(-100m, result.Amount);
        Assert.Equal(new DateOnly(2025, 1, 15), result.Date);
        Assert.Equal("Lunch", result.Description);
    }

    [Fact]
    public async Task GetById_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/transactions/999999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_WithValidData_UpdatesTransaction()
    {
        // Arrange
        await ClearDatabase();
        var categoryId1 = await SeedCategory("Food");
        var categoryId2 = await SeedCategory("Transport");
        var transactionId = await SeedTransactionAndReturnId(categoryId1, -100m, new DateOnly(2025, 1, 15), "Lunch");

        var updateRequest = new
        {
            Amount = -150m,
            Date = new DateOnly(2025, 1, 20),
            CategoryId = categoryId2,
            Description = "Updated description"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/transactions/{transactionId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransactionResponse>();
        Assert.NotNull(result);
        Assert.Equal(transactionId, result.Id);
        Assert.Equal(-150m, result.Amount);
        Assert.Equal(new DateOnly(2025, 1, 20), result.Date);
        Assert.Equal("Updated description", result.Description);
        Assert.Equal(categoryId2, result.Category.Id);
        Assert.Equal("Transport", result.Category.Name);
    }

    [Fact]
    public async Task Update_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        
        var updateRequest = new
        {
            Amount = -150m,
            Date = new DateOnly(2025, 1, 20),
            CategoryId = categoryId,
            Description = "Test"
        };

        // Act
        var response = await _client.PutAsJsonAsync("/transactions/999999", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_WithZeroAmount_ReturnsBadRequest()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        var transactionId = await SeedTransactionAndReturnId(categoryId, -100m, new DateOnly(2025, 1, 15), "Lunch");

        var updateRequest = new
        {
            Amount = 0m,
            Date = new DateOnly(2025, 1, 20),
            CategoryId = categoryId,
            Description = "Test"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/transactions/{transactionId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_WithInvalidCategory_ReturnsBadRequest()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        var transactionId = await SeedTransactionAndReturnId(categoryId, -100m, new DateOnly(2025, 1, 15), "Lunch");

        var updateRequest = new
        {
            Amount = -150m,
            Date = new DateOnly(2025, 1, 20),
            CategoryId = 999999,
            Description = "Test"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/transactions/{transactionId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_RemovesDescription_WhenSetToNull()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        var transactionId = await SeedTransactionAndReturnId(categoryId, -100m, new DateOnly(2025, 1, 15), "Original description");

        var updateRequest = new
        {
            Amount = -100m,
            Date = new DateOnly(2025, 1, 15),
            CategoryId = categoryId,
            Description = (string?)null
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/transactions/{transactionId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransactionResponse>();
        Assert.NotNull(result);
        Assert.Null(result.Description);
    }

    [Fact]
    public async Task Delete_WithValidId_DeletesTransaction()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Food");
        var transactionId = await SeedTransactionAndReturnId(categoryId, -100m, new DateOnly(2025, 1, 15), "Lunch");

        // Act
        var response = await _client.DeleteAsync($"/transactions/{transactionId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify it's deleted
        var getResponse = await _client.GetAsync($"/transactions/{transactionId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.DeleteAsync("/transactions/999999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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

    private async Task<int> SeedTransactionAndReturnId(int categoryId, decimal amount, DateOnly date, string? description)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var transaction = new Transaction
        {
            UserId = Guid.Parse(CustomWebApplicationFactory.TestUserId),
            Amount = amount,
            Date = date,
            CategoryId = categoryId,
            Description = description
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();
        return transaction.Id;
    }
}

