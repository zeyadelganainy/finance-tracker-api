using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class SummaryControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public SummaryControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMonthlySummary_WithoutMonth_ReturnsBadRequest()
    {
        // Act
        var response = await _client.GetAsync("/summary/monthly");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("month is required", error);
    }

    [Fact]
    public async Task GetMonthlySummary_WithInvalidMonth_ReturnsBadRequest()
    {
        // Act
        var response = await _client.GetAsync("/summary/monthly?month=invalid");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invalid month", error);
    }

    [Fact]
    public async Task GetMonthlySummary_CalculatesCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var foodId = await SeedCategory("Food");
        var transportId = await SeedCategory("Transport");
        var salaryId = await SeedCategory("Salary");

        // December 2025 transactions
        await SeedTransaction(foodId, -150m, new DateOnly(2025, 12, 5), "Groceries");
        await SeedTransaction(foodId, -80m, new DateOnly(2025, 12, 15), "Restaurant");
        await SeedTransaction(transportId, -50m, new DateOnly(2025, 12, 10), "Gas");
        await SeedTransaction(salaryId, 3000m, new DateOnly(2025, 12, 1), "Monthly salary");
        
        // Different month (should be excluded)
        await SeedTransaction(foodId, -200m, new DateOnly(2025, 11, 25), "November");

        // Act
        var response = await _client.GetAsync("/summary/monthly?month=2025-12");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<MonthlySummaryDto>();
        Assert.NotNull(summary);
        Assert.Equal("2025-12", summary.Month);
        Assert.Equal(3000m, summary.TotalIncome);
        Assert.Equal(-280m, summary.TotalExpenses);
        Assert.Equal(2720m, summary.Net);
        Assert.Equal(2, summary.ExpenseBreakdown.Count);
        
        var foodExpense = summary.ExpenseBreakdown.First(x => x.CategoryName == "Food");
        Assert.Equal(-230m, foodExpense.Total);
        
        var transportExpense = summary.ExpenseBreakdown.First(x => x.CategoryName == "Transport");
        Assert.Equal(-50m, transportExpense.Total);
    }

    [Fact]
    public async Task GetMonthlySummary_WithNoTransactions_ReturnsZeros()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/summary/monthly?month=2025-12");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<MonthlySummaryDto>();
        Assert.NotNull(summary);
        Assert.Equal(0m, summary.TotalIncome);
        Assert.Equal(0m, summary.TotalExpenses);
        Assert.Equal(0m, summary.Net);
        Assert.Empty(summary.ExpenseBreakdown);
    }

    [Fact]
    public async Task GetMonthlySummary_OrdersExpensesByMostNegativeFirst()
    {
        // Arrange
        await ClearDatabase();
        var foodId = await SeedCategory("Food");
        var transportId = await SeedCategory("Transport");
        var utilitiesId = await SeedCategory("Utilities");

        await SeedTransaction(foodId, -100m, new DateOnly(2025, 12, 1), null);
        await SeedTransaction(transportId, -50m, new DateOnly(2025, 12, 1), null);
        await SeedTransaction(utilitiesId, -200m, new DateOnly(2025, 12, 1), null);

        // Act
        var response = await _client.GetAsync("/summary/monthly?month=2025-12");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<MonthlySummaryDto>();
        Assert.NotNull(summary);
        Assert.Equal(3, summary.ExpenseBreakdown.Count);
        Assert.Equal("Utilities", summary.ExpenseBreakdown[0].CategoryName);
        Assert.Equal("Food", summary.ExpenseBreakdown[1].CategoryName);
        Assert.Equal("Transport", summary.ExpenseBreakdown[2].CategoryName);
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
        var category = new Category { Name = name };
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
            Amount = amount,
            Date = date,
            CategoryId = categoryId,
            Description = description
        });
        await db.SaveChangesAsync();
    }

    private record MonthlySummaryDto(
        string Month,
        decimal TotalIncome,
        decimal TotalExpenses,
        decimal Net,
        List<ExpenseBreakdownDto> ExpenseBreakdown
    );
    
    private record ExpenseBreakdownDto(int CategoryId, string CategoryName, decimal Total);
}