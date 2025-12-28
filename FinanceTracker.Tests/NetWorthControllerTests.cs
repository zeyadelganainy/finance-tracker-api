using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class NetWorthControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public NetWorthControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetNetWorth_WithNoSnapshots_ReturnsEmptyList()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Empty(points);
    }

    [Fact]
    public async Task GetNetWorth_WithSingleAssetSnapshot_ReturnsCorrectNetWorth()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1000m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(1000m, points[0].NetWorth);
    }

    [Fact]
    public async Task GetNetWorth_WithSingleLiabilitySnapshot_ReturnsNegativeNetWorth()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Credit Card", "credit", true);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 500m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(-500m, points[0].NetWorth);
    }

    [Fact]
    public async Task GetNetWorth_WithMultipleAccounts_CalculatesCorrectNetWorth()
    {
        // Arrange
        await ClearDatabase();
        var checking = await SeedAccount("Checking", "bank", false);
        var savings = await SeedAccount("Savings", "bank", false);
        var creditCard = await SeedAccount("Credit Card", "credit", true);

        await SeedSnapshot(checking, new DateOnly(2025, 1, 15), 1000m);
        await SeedSnapshot(savings, new DateOnly(2025, 1, 15), 5000m);
        await SeedSnapshot(creditCard, new DateOnly(2025, 1, 15), 200m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(5800m, points[0].NetWorth); // 1000 + 5000 - 200
    }

    [Fact]
    public async Task GetNetWorth_WithMultipleMonths_ReturnsMultiplePoints()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);

        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1000m);
        await SeedSnapshot(accountId, new DateOnly(2025, 2, 15), 1500m);
        await SeedSnapshot(accountId, new DateOnly(2025, 3, 15), 2000m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-03-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Equal(3, points.Count);
        
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(1000m, points[0].NetWorth);
        
        Assert.Equal("2025-02-01", points[1].Date);
        Assert.Equal(1500m, points[1].NetWorth);
        
        Assert.Equal("2025-03-01", points[2].Date);
        Assert.Equal(2000m, points[2].NetWorth);
    }

    [Fact]
    public async Task GetNetWorth_UsesLatestSnapshotPerMonth()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);

        // Multiple snapshots in same month - should use latest
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 5), 1000m);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1200m);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 25), 1500m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(1500m, points[0].NetWorth); // Latest snapshot in January
    }

    [Fact]
    public async Task GetNetWorth_WithDayInterval_ReturnsDailyPoints()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);

        await SeedSnapshot(accountId, new DateOnly(2025, 1, 1), 1000m);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 2), 1100m);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 3), 1200m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-03&interval=day");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Equal(3, points.Count);
        
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(1000m, points[0].NetWorth);
        
        Assert.Equal("2025-01-02", points[1].Date);
        Assert.Equal(1100m, points[1].NetWorth);
        
        Assert.Equal("2025-01-03", points[2].Date);
        Assert.Equal(1200m, points[2].NetWorth);
    }

    [Fact]
    public async Task GetNetWorth_WithWeekInterval_ReturnsWeeklyPoints()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);

        // January 2025: 1st is Wednesday
        // Week 1 starts Monday Dec 30, 2024
        // Week 2 starts Monday Jan 6, 2025
        // Week 3 starts Monday Jan 13, 2025
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 1), 1000m);  // Wed - Week 1
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 8), 1500m);  // Wed - Week 2
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 2000m); // Wed - Week 3

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-20&interval=week");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Equal(3, points.Count);
    }

    [Fact]
    public async Task GetNetWorth_WithInvalidDateRange_ReturnsBadRequest()
    {
        // Arrange
        await ClearDatabase();

        // Act - to date is before from date
        var response = await _client.GetAsync("/net-worth?from=2025-01-31&to=2025-01-01");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("to must be >= from", error);
    }

    [Fact]
    public async Task GetNetWorth_WithSameDateRange_ReturnsOk()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1000m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-15&to=2025-01-15&interval=day");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
    }

    [Fact]
    public async Task GetNetWorth_ExcludesSnapshotsOutsideRange()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);

        await SeedSnapshot(accountId, new DateOnly(2024, 12, 31), 500m);  // Before range
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1000m);  // In range
        await SeedSnapshot(accountId, new DateOnly(2025, 2, 1), 1500m);   // After range

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(1000m, points[0].NetWorth);
    }

    [Fact]
    public async Task GetNetWorth_WithMultipleAccountsPerBucket_UsesLatestForEach()
    {
        // Arrange
        await ClearDatabase();
        var checking = await SeedAccount("Checking", "bank", false);
        var savings = await SeedAccount("Savings", "bank", false);

        // Both accounts have multiple snapshots in January
        await SeedSnapshot(checking, new DateOnly(2025, 1, 5), 1000m);
        await SeedSnapshot(checking, new DateOnly(2025, 1, 25), 1200m); // Latest for checking

        await SeedSnapshot(savings, new DateOnly(2025, 1, 10), 5000m);
        await SeedSnapshot(savings, new DateOnly(2025, 1, 20), 5500m);  // Latest for savings

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal(6700m, points[0].NetWorth); // 1200 + 5500
    }

    [Fact]
    public async Task GetNetWorth_DefaultsToMonthInterval()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1000m);

        // Act - no interval specified
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal("2025-01-01", points[0].Date); // Bucketed to month start
    }

    [Fact]
    public async Task GetNetWorth_WithZeroBalance_ReturnsZero()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Empty", null, false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 0m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-01-31");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Single(points);
        Assert.Equal(0m, points[0].NetWorth);
    }

    [Fact]
    public async Task GetNetWorth_ReturnsPointsInChronologicalOrder()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);

        // Add in non-chronological order
        await SeedSnapshot(accountId, new DateOnly(2025, 3, 15), 3000m);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1000m);
        await SeedSnapshot(accountId, new DateOnly(2025, 2, 15), 2000m);

        // Act
        var response = await _client.GetAsync("/net-worth?from=2025-01-01&to=2025-03-31&interval=month");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<List<NetWorthPointDto>>();
        Assert.NotNull(points);
        Assert.Equal(3, points.Count);
        
        // Should be ordered chronologically
        Assert.Equal("2025-01-01", points[0].Date);
        Assert.Equal("2025-02-01", points[1].Date);
        Assert.Equal("2025-03-01", points[2].Date);
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.AccountSnapshots.RemoveRange(db.AccountSnapshots);
        db.Accounts.RemoveRange(db.Accounts);
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAccount(string name, string? type, bool isLiability)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = new Account
        {
            Name = name,
            Type = type,
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

    private record NetWorthPointDto(string Date, decimal NetWorth);
}
