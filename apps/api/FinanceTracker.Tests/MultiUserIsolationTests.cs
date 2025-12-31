using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Auth;
using FinanceTracker.Contracts.Summary;
using FinanceTracker.Data;
using FinanceTracker.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

/// <summary>
/// Tests to verify that dashboard/summary endpoints properly isolate data between users.
/// These tests create two separate users and verify they cannot see each other's data.
/// </summary>
public class MultiUserIsolationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly Guid _userA = Guid.NewGuid();
    private readonly Guid _userB = Guid.NewGuid();

    public MultiUserIsolationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task MonthlySummary_WithTwoUsers_ReturnsOnlyCurrentUserData()
    {
        // Arrange
        await ClearDatabase();

        // Create categories for both users
        var categoryA = await SeedCategory("Groceries", _userA);
        var categoryB = await SeedCategory("Groceries", _userB);

        // User A: $100 income, -$30 expense
        await SeedTransaction(100m, new DateOnly(2025, 1, 15), categoryA, "User A Income", _userA);
        await SeedTransaction(-30m, new DateOnly(2025, 1, 20), categoryA, "User A Expense", _userA);

        // User B: $200 income, -$50 expense
        await SeedTransaction(200m, new DateOnly(2025, 1, 10), categoryB, "User B Income", _userB);
        await SeedTransaction(-50m, new DateOnly(2025, 1, 25), categoryB, "User B Expense", _userB);

        // Act as User A
        var clientA = CreateClientForUser(_userA);
        var responseA = await clientA.GetAsync("/summary/monthly?month=2025-01");

        // Act as User B
        var clientB = CreateClientForUser(_userB);
        var responseB = await clientB.GetAsync("/summary/monthly?month=2025-01");

        // Assert User A sees only their data
        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        var summaryA = await responseA.Content.ReadFromJsonAsync<MonthlySummaryResponse>();
        Assert.NotNull(summaryA);
        Assert.Equal(100m, summaryA.TotalIncome);      // Only User A's income
        Assert.Equal(-30m, summaryA.TotalExpenses);     // Only User A's expense
        Assert.Equal(70m, summaryA.Net);                // 100 - 30
        Assert.Single(summaryA.ExpenseBreakdown);       // Only 1 category

        // Assert User B sees only their data
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var summaryB = await responseB.Content.ReadFromJsonAsync<MonthlySummaryResponse>();
        Assert.NotNull(summaryB);
        Assert.Equal(200m, summaryB.TotalIncome);      // Only User B's income
        Assert.Equal(-50m, summaryB.TotalExpenses);     // Only User B's expense
        Assert.Equal(150m, summaryB.Net);               // 200 - 50
        Assert.Single(summaryB.ExpenseBreakdown);       // Only 1 category

        // Verify totals are different
        Assert.NotEqual(summaryA.TotalIncome, summaryB.TotalIncome);
        Assert.NotEqual(summaryA.TotalExpenses, summaryB.TotalExpenses);
        Assert.NotEqual(summaryA.Net, summaryB.Net);
    }

    [Fact]
    public async Task NetWorth_WithTwoUsers_ReturnsOnlyCurrentUserData()
    {
        // Arrange
        await ClearDatabase();

        // User A: Account with $1000 balance
        var accountA = await SeedAccount("User A Checking", "Bank", false, _userA);
        await SeedSnapshot(accountA, new DateOnly(2025, 1, 15), 1000m, _userA);

        // User B: Account with $5000 balance
        var accountB = await SeedAccount("User B Checking", "Bank", false, _userB);
        await SeedSnapshot(accountB, new DateOnly(2025, 1, 15), 5000m, _userB);

        // Act as User A
        var clientA = CreateClientForUser(_userA);
        var responseA = await clientA.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=daily");

        // Act as User B
        var clientB = CreateClientForUser(_userB);
        var responseB = await clientB.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=daily");

        // Assert User A sees only their net worth
        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        var netWorthA = await responseA.Content.ReadFromJsonAsync<List<NetWorthPoint>>();
        Assert.NotNull(netWorthA);
        Assert.Single(netWorthA);
        Assert.Equal(1000m, netWorthA[0].NetWorth);     // Only User A's balance

        // Assert User B sees only their net worth
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var netWorthB = await responseB.Content.ReadFromJsonAsync<List<NetWorthPoint>>();
        Assert.NotNull(netWorthB);
        Assert.Single(netWorthB);
        Assert.Equal(5000m, netWorthB[0].NetWorth);     // Only User B's balance

        // Verify net worths are different
        Assert.NotEqual(netWorthA[0].NetWorth, netWorthB[0].NetWorth);
    }

    [Fact]
    public async Task NetWorth_WithLiabilities_CalculatesCorrectlyPerUser()
    {
        // Arrange
        await ClearDatabase();

        // User A: $10,000 asset, $2,000 liability ? Net = $8,000
        var assetA = await SeedAccount("User A Savings", "Bank", false, _userA);
        var liabilityA = await SeedAccount("User A Credit Card", "Credit", true, _userA);
        await SeedSnapshot(assetA, new DateOnly(2025, 1, 15), 10000m, _userA);
        await SeedSnapshot(liabilityA, new DateOnly(2025, 1, 15), 2000m, _userA);

        // User B: $20,000 asset, $5,000 liability ? Net = $15,000
        var assetB = await SeedAccount("User B Checking", "Bank", false, _userB);
        var liabilityB = await SeedAccount("User B Loan", "Loan", true, _userB);
        await SeedSnapshot(assetB, new DateOnly(2025, 1, 15), 20000m, _userB);
        await SeedSnapshot(liabilityB, new DateOnly(2025, 1, 15), 5000m, _userB);

        // Act as User A
        var clientA = CreateClientForUser(_userA);
        var responseA = await clientA.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31");

        // Act as User B
        var clientB = CreateClientForUser(_userB);
        var responseB = await clientB.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31");

        // Assert User A
        var netWorthA = await responseA.Content.ReadFromJsonAsync<List<NetWorthPoint>>();
        Assert.NotNull(netWorthA);
        Assert.Single(netWorthA);
        Assert.Equal(8000m, netWorthA[0].NetWorth);     // 10,000 - 2,000

        // Assert User B
        var netWorthB = await responseB.Content.ReadFromJsonAsync<List<NetWorthPoint>>();
        Assert.NotNull(netWorthB);
        Assert.Single(netWorthB);
        Assert.Equal(15000m, netWorthB[0].NetWorth);    // 20,000 - 5,000

        // Verify isolation
        Assert.NotEqual(netWorthA[0].NetWorth, netWorthB[0].NetWorth);
    }

    [Fact]
    public async Task MonthlySummary_EmptyStateForNewUser()
    {
        // Arrange
        await ClearDatabase();
        
        // Create transactions for User A only
        var category = await SeedCategory("Groceries", _userA);
        await SeedTransaction(100m, new DateOnly(2025, 1, 15), category, "User A Income", _userA);
        await SeedTransaction(-30m, new DateOnly(2025, 1, 20), category, "User A Expense", _userA);

        // Act as new User B (no data)
        var clientB = CreateClientForUser(_userB);
        var responseB = await clientB.GetAsync("/summary/monthly?month=2025-01");

        // Assert User B sees empty state
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var summaryB = await responseB.Content.ReadFromJsonAsync<MonthlySummaryResponse>();
        Assert.NotNull(summaryB);
        Assert.Equal(0m, summaryB.TotalIncome);
        Assert.Equal(0m, summaryB.TotalExpenses);
        Assert.Equal(0m, summaryB.Net);
        Assert.Empty(summaryB.ExpenseBreakdown);
    }

    [Fact]
    public async Task NetWorth_EmptyStateForNewUser()
    {
        // Arrange
        await ClearDatabase();

        // Create account for User A only
        var accountA = await SeedAccount("User A Checking", "Bank", false, _userA);
        await SeedSnapshot(accountA, new DateOnly(2025, 1, 15), 5000m, _userA);

        // Act as new User B (no data)
        var clientB = CreateClientForUser(_userB);
        var responseB = await clientB.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31");

        // Assert User B sees empty state
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var netWorthB = await responseB.Content.ReadFromJsonAsync<List<NetWorthPoint>>();
        Assert.NotNull(netWorthB);
        Assert.Empty(netWorthB);    // No data points
    }

    [Fact]
    public async Task MonthlySummary_ComplexScenario_ThreeUsers()
    {
        // Arrange
        await ClearDatabase();
        var userC = Guid.NewGuid();

        // User A: Simple data
        var catA = await SeedCategory("Food", _userA);
        await SeedTransaction(1000m, new DateOnly(2025, 1, 5), catA, "Salary", _userA);
        await SeedTransaction(-100m, new DateOnly(2025, 1, 10), catA, "Groceries", _userA);

        // User B: More complex data
        var catB1 = await SeedCategory("Salary", _userB);
        var catB2 = await SeedCategory("Rent", _userB);
        await SeedTransaction(5000m, new DateOnly(2025, 1, 1), catB1, "Monthly Salary", _userB);
        await SeedTransaction(-2000m, new DateOnly(2025, 1, 5), catB2, "Apartment", _userB);
        await SeedTransaction(-500m, new DateOnly(2025, 1, 15), catB1, "Utilities", _userB);

        // User C: Different data
        var catC = await SeedCategory("Freelance", userC);
        await SeedTransaction(3000m, new DateOnly(2025, 1, 20), catC, "Project", userC);

        // Act
        var clientA = CreateClientForUser(_userA);
        var clientB = CreateClientForUser(_userB);
        var clientC = CreateClientForUser(userC);

        var summaryA = await (await clientA.GetAsync("/summary/monthly?month=2025-01"))
            .Content.ReadFromJsonAsync<MonthlySummaryResponse>();
        var summaryB = await (await clientB.GetAsync("/summary/monthly?month=2025-01"))
            .Content.ReadFromJsonAsync<MonthlySummaryResponse>();
        var summaryC = await (await clientC.GetAsync("/summary/monthly?month=2025-01"))
            .Content.ReadFromJsonAsync<MonthlySummaryResponse>();

        // Assert all users have different totals
        Assert.NotNull(summaryA);
        Assert.NotNull(summaryB);
        Assert.NotNull(summaryC);

        Assert.Equal(1000m, summaryA.TotalIncome);
        Assert.Equal(5000m, summaryB.TotalIncome);
        Assert.Equal(3000m, summaryC.TotalIncome);

        Assert.Equal(-100m, summaryA.TotalExpenses);
        Assert.Equal(-2500m, summaryB.TotalExpenses);
        Assert.Equal(0m, summaryC.TotalExpenses);

        // Verify no overlap
        Assert.NotEqual(summaryA.Net, summaryB.Net);
        Assert.NotEqual(summaryB.Net, summaryC.Net);
        Assert.NotEqual(summaryA.Net, summaryC.Net);
    }

    // Helper Methods

    private HttpClient CreateClientForUser(Guid userId)
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace ICurrentUserContext with user-specific implementation
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(ICurrentUserContext));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddScoped<ICurrentUserContext>(_ => new TestCurrentUserContext(userId.ToString()));
            });
        }).CreateClient();

        return client;
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Transactions.RemoveRange(db.Transactions);
        db.Categories.RemoveRange(db.Categories);
        db.AccountSnapshots.RemoveRange(db.AccountSnapshots);
        db.Accounts.RemoveRange(db.Accounts);
        await db.SaveChangesAsync();
    }

    private async Task<int> SeedCategory(string name, Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var category = new Category { UserId = userId, Name = name };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category.Id;
    }

    private async Task SeedTransaction(decimal amount, DateOnly date, int categoryId, string description, Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Transactions.Add(new Transaction
        {
            UserId = userId,
            Amount = amount,
            Date = date,
            CategoryId = categoryId,
            Description = description
        });
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAccount(string name, string type, bool isLiability, Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = new Account
        {
            UserId = userId,
            Name = name,
            Type = type,
            IsLiability = isLiability
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        return account.Id;
    }

    private async Task SeedSnapshot(Guid accountId, DateOnly date, decimal balance, Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var snapshot = new AccountSnapshot
        {
            UserId = userId,
            AccountId = accountId,
            Date = date,
            Balance = balance
        };
        db.AccountSnapshots.Add(snapshot);
        await db.SaveChangesAsync();
    }

    // DTOs for deserialization
    private record NetWorthPoint(string Date, decimal NetWorth);
}
