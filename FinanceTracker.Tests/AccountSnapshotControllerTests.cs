using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class AccountSnapshotControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public AccountSnapshotControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task UpsertSnapshot_WithNewSnapshot_ReturnsOk()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);
        var request = new { Balance = 1000.50m };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-15", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var snapshot = await response.Content.ReadFromJsonAsync<SnapshotDto>();
        Assert.NotNull(snapshot);
        Assert.NotEqual(Guid.Empty, snapshot.Id);
        Assert.Equal(accountId, snapshot.AccountId);
        Assert.Equal("2025-01-15", snapshot.Date);
        Assert.Equal(1000.50m, snapshot.Balance);
    }

    [Fact]
    public async Task UpsertSnapshot_WithExistingSnapshot_UpdatesBalance()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Savings", "bank", false);
        var date = new DateOnly(2025, 1, 10);
        var snapshotId = await SeedSnapshot(accountId, date, 500m);

        var request = new { Balance = 750.25m };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-10", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var snapshot = await response.Content.ReadFromJsonAsync<SnapshotDto>();
        Assert.NotNull(snapshot);
        Assert.Equal(snapshotId, snapshot.Id); // Same ID = updated, not created
        Assert.Equal(accountId, snapshot.AccountId);
        Assert.Equal("2025-01-10", snapshot.Date);
        Assert.Equal(750.25m, snapshot.Balance);
    }

    [Fact]
    public async Task UpsertSnapshot_WithNegativeBalance_ReturnsOk()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Credit Card", "credit", true);
        var request = new { Balance = -500.00m };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-20", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var snapshot = await response.Content.ReadFromJsonAsync<SnapshotDto>();
        Assert.NotNull(snapshot);
        Assert.Equal(-500.00m, snapshot.Balance);
    }

    [Fact]
    public async Task UpsertSnapshot_WithZeroBalance_ReturnsOk()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Empty Account", null, false);
        var request = new { Balance = 0m };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-01", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var snapshot = await response.Content.ReadFromJsonAsync<SnapshotDto>();
        Assert.NotNull(snapshot);
        Assert.Equal(0m, snapshot.Balance);
    }

    [Fact]
    public async Task UpsertSnapshot_WithInvalidDate_ReturnsBadRequest()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Test", null, false);
        var request = new { Balance = 100m };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/invalid-date", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invalid date", error);
    }

    [Fact]
    public async Task UpsertSnapshot_WithNonExistentAccount_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();
        var nonExistentAccountId = Guid.NewGuid();
        var request = new { Balance = 100m };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{nonExistentAccountId}/snapshots/2025-01-15", request);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Account not found", error);
    }

    [Fact]
    public async Task UpsertSnapshot_WithDifferentDatesForSameAccount_CreatesSeparateSnapshots()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Investment", "investment", false);

        // Act
        var response1 = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-01", new { Balance = 1000m });
        var response2 = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-15", new { Balance = 1100m });
        var response3 = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-31", new { Balance = 1250m });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response1.StatusCode);
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode);
        Assert.Equal(HttpStatusCode.OK, response3.StatusCode);

        var snapshot1 = await response1.Content.ReadFromJsonAsync<SnapshotDto>();
        var snapshot2 = await response2.Content.ReadFromJsonAsync<SnapshotDto>();
        var snapshot3 = await response3.Content.ReadFromJsonAsync<SnapshotDto>();

        Assert.NotEqual(snapshot1!.Id, snapshot2!.Id);
        Assert.NotEqual(snapshot2.Id, snapshot3!.Id);
        Assert.NotEqual(snapshot1.Id, snapshot3.Id);
    }

    [Fact]
    public async Task UpsertSnapshot_MultipleUpdatesToSameSnapshot_KeepsSameId()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Checking", "bank", false);

        // Act - Create initial snapshot
        var response1 = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-02-01", new { Balance = 100m });
        var snapshot1 = await response1.Content.ReadFromJsonAsync<SnapshotDto>();

        // Update it
        var response2 = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-02-01", new { Balance = 200m });
        var snapshot2 = await response2.Content.ReadFromJsonAsync<SnapshotDto>();

        // Update again
        var response3 = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-02-01", new { Balance = 300m });
        var snapshot3 = await response3.Content.ReadFromJsonAsync<SnapshotDto>();

        // Assert - Same ID throughout
        Assert.Equal(snapshot1!.Id, snapshot2!.Id);
        Assert.Equal(snapshot2.Id, snapshot3!.Id);
        Assert.Equal(300m, snapshot3.Balance);
    }

    [Fact]
    public async Task UpsertSnapshot_WithLargeBalance_ReturnsOk()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Large Account", null, false);
        var request = new { Balance = 999999999999m };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-01", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var snapshot = await response.Content.ReadFromJsonAsync<SnapshotDto>();
        Assert.NotNull(snapshot);
        Assert.Equal(999999999999m, snapshot.Balance);
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

    private async Task<Guid> SeedSnapshot(Guid accountId, DateOnly date, decimal balance)
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
        return snapshot.Id;
    }

    private record SnapshotDto(Guid Id, Guid AccountId, string Date, decimal Balance);
}
