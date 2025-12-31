using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class AIContextControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public AIContextControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetContext_WithNoData_ReturnsEmptyStructure()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/ai/context");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var context = await response.Content.ReadFromJsonAsync<AIContextDto>();
        Assert.NotNull(context);
        Assert.NotNull(context.Accounts);
        Assert.Empty(context.Accounts.Items);
        Assert.Equal(0, context.Accounts.TotalAccounts);
        Assert.Equal(0, context.Assets.TotalAssets);
        Assert.Equal(0, context.Transactions.TotalCount);
    }

    [Fact]
    public async Task GetContext_WithAccounts_ReturnsAccountsSummary()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "Chase", "bank", "USD", false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 5000m);

        // Act
        var response = await _client.GetAsync("/ai/context");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var context = await response.Content.ReadFromJsonAsync<AIContextDto>();
        Assert.NotNull(context);
        Assert.Single(context.Accounts.Items);
        Assert.Equal("Checking", context.Accounts.Items[0].Name);
        Assert.Equal(5000m, context.Accounts.Items[0].LatestBalance);
        Assert.Equal(5000m, context.Accounts.TotalBalance);
    }

    [Fact]
    public async Task GetContext_WithAssets_ReturnsAssetsSummary()
    {
        // Arrange
        await ClearDatabase();
        await SeedAsset("Apple Stock", "stock", "AAPL", 100m, "shares", 15000m);
        await SeedAsset("Gold", "metal", null, 10m, "oz", 20000m);

        // Act
        var response = await _client.GetAsync("/ai/context");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var context = await response.Content.ReadFromJsonAsync<AIContextDto>();
        Assert.NotNull(context);
        Assert.Equal(2, context.Assets.TotalAssets);
        Assert.Equal(35000m, context.Assets.TotalCostBasis);
        Assert.Equal(2, context.Assets.Items.Count);
    }

    [Fact]
    public async Task GetContext_WithTransactions_ReturnsTransactionsSummary()
    {
        // Arrange
        await ClearDatabase();
        var categoryId = await SeedCategory("Salary");
        var expenseCategoryId = await SeedCategory("Groceries");
        
        await SeedTransaction(3000m, new DateOnly(2025, 1, 1), categoryId, "Paycheck");
        await SeedTransaction(-500m, new DateOnly(2025, 1, 15), expenseCategoryId, "Shopping");

        // Act
        var response = await _client.GetAsync("/ai/context");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var context = await response.Content.ReadFromJsonAsync<AIContextDto>();
        Assert.NotNull(context);
        Assert.Equal(2, context.Transactions.TotalCount);
        Assert.Equal(3000m, context.Transactions.TotalIncome);
        Assert.Equal(-500m, context.Transactions.TotalExpenses);
        Assert.Equal(2500m, context.Transactions.NetCashFlow);
        Assert.Equal(2, context.Transactions.CategoryBreakdown.Count);
    }

    [Fact]
    public async Task GetContext_WithCategories_ReturnsCategoriesSummary()
    {
        // Arrange
        await ClearDatabase();
        await SeedCategory("Groceries");
        await SeedCategory("Salary");
        await SeedCategory("Entertainment");

        // Act
        var response = await _client.GetAsync("/ai/context");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var context = await response.Content.ReadFromJsonAsync<AIContextDto>();
        Assert.NotNull(context);
        Assert.Equal(3, context.Categories.TotalCategories);
        Assert.Contains("Groceries", context.Categories.CategoryNames);
    }

    [Fact]
    public async Task GetContext_WithLiabilities_CalculatesNetBalanceCorrectly()
    {
        // Arrange
        await ClearDatabase();
        var assetAccountId = await SeedAccount("Checking", "Chase", "bank", "USD", false);
        var liabilityAccountId = await SeedAccount("Credit Card", "Visa", "credit", "USD", true);
        
        await SeedSnapshot(assetAccountId, new DateOnly(2025, 1, 15), 10000m);
        await SeedSnapshot(liabilityAccountId, new DateOnly(2025, 1, 15), 2000m);

        // Act
        var response = await _client.GetAsync("/ai/context");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var context = await response.Content.ReadFromJsonAsync<AIContextDto>();
        Assert.NotNull(context);
        Assert.Equal(8000m, context.Accounts.TotalBalance); // 10000 - 2000
    }

    [Fact]
    public async Task GetContext_ReturnsAllSectionsWithValidShape()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Test Account", null, "bank", "USD", false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 1), 1000m);
        await SeedAsset("Test Asset", "stock", "TEST", 1m, "shares", 100m);
        var categoryId = await SeedCategory("Test Category");
        await SeedTransaction(100m, new DateOnly(2025, 1, 1), categoryId, "Test");

        // Act
        var response = await _client.GetAsync("/ai/context");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var context = await response.Content.ReadFromJsonAsync<AIContextDto>();
        
        // Verify all sections exist and have expected structure
        Assert.NotNull(context);
        Assert.NotNull(context.Accounts);
        Assert.NotNull(context.Assets);
        Assert.NotNull(context.Transactions);
        Assert.NotNull(context.Categories);
        
        // Verify data is present
        Assert.True(context.Accounts.TotalAccounts > 0);
        Assert.True(context.Assets.TotalAssets > 0);
        Assert.True(context.Transactions.TotalCount > 0);
        Assert.True(context.Categories.TotalCategories > 0);
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Transactions.RemoveRange(db.Transactions);
        db.Categories.RemoveRange(db.Categories);
        db.AccountSnapshots.RemoveRange(db.AccountSnapshots);
        db.Accounts.RemoveRange(db.Accounts);
        db.Assets.RemoveRange(db.Assets);
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAccount(string name, string? institution, string? type, string currency, bool isLiability)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = new Account
        {
            Name = name,
            Institution = institution,
            Type = type,
            Currency = currency,
            IsLiability = isLiability
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        return account.Id;
    }

    private async Task SeedSnapshot(Guid accountId, DateOnly date, decimal balance)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var snapshot = new AccountSnapshot
        {
            AccountId = accountId,
            Date = date,
            Balance = balance
        };
        db.AccountSnapshots.Add(snapshot);
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAsset(string name, string assetClass, string? ticker, decimal quantity, string? unit, decimal costBasis)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var asset = new Asset
        {
            Name = name,
            AssetClass = assetClass,
            Ticker = ticker,
            Quantity = quantity,
            Unit = unit,
            CostBasisTotal = costBasis
        };
        db.Assets.Add(asset);
        await db.SaveChangesAsync();
        return asset.Id;
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

    private async Task SeedTransaction(decimal amount, DateOnly date, int categoryId, string description)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var transaction = new Transaction
        {
            Amount = amount,
            Date = date,
            CategoryId = categoryId,
            Description = description
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();
    }

    private record AIContextDto(
        AIAccountsSummaryDto Accounts,
        AIAssetsSummaryDto Assets,
        AITransactionsSummaryDto Transactions,
        AICategoriesSummaryDto Categories
    );

    private record AIAccountsSummaryDto(
        int TotalAccounts,
        decimal TotalBalance,
        List<AIAccountDataDto> Items
    );

    private record AIAccountDataDto(
        Guid Id,
        string Name,
        string? Type,
        bool IsLiability,
        decimal? LatestBalance,
        DateOnly? LatestBalanceDate
    );

    private record AIAssetsSummaryDto(
        int TotalAssets,
        decimal TotalCostBasis,
        List<AIAssetDataDto> Items
    );

    private record AIAssetDataDto(
        Guid Id,
        string Name,
        string AssetClass,
        string? Ticker,
        decimal Quantity,
        string? Unit,
        decimal CostBasisTotal,
        DateTime? PurchaseDate
    );

    private record AITransactionsSummaryDto(
        int TotalCount,
        decimal TotalIncome,
        decimal TotalExpenses,
        decimal NetCashFlow,
        DateOnly? EarliestDate,
        DateOnly? LatestDate,
        List<AICategoryBreakdownDto> CategoryBreakdown
    );

    private record AICategoryBreakdownDto(
        string CategoryName,
        decimal Total,
        int Count
    );

    private record AICategoriesSummaryDto(
        int TotalCategories,
        List<string> CategoryNames
    );
}
